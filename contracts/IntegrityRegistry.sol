// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @title IntegrityRegistry
/// @notice Lưu bằng chứng toàn vẹn cho các phiên bản dữ liệu CSDL.
contract IntegrityRegistry {
    /// @notice Các hành động hợp lệ của một bản ghi.
    enum Action {
        CREATE,
        UPDATE,
        DELETE,
        RESTORE
    }

    /// @notice Bằng chứng của một phiên bản dữ liệu.
    struct Evidence {
        bytes32 dataHash;
        bytes32 actorHash;
        uint64 version;
        uint64 timestamp;
        Action action;
        address writerAddress;
    }

    /// @notice Ví được phép ghi bằng chứng.
    address public immutable owner;

    /// @dev Một recordKey có nhiều phiên bản Evidence.
    mapping(bytes32 => Evidence[]) private histories;

    /// @dev Đánh dấu recordKey đã từng được đăng ký.
    mapping(bytes32 => bool) private registered;

    /// @dev Danh sách recordKey để Integrity Checker duyệt toàn bộ.
    bytes32[] private recordKeys;

    /// @notice Phát ra mỗi khi một Evidence mới được ghi.
    event EvidenceAdded(
        bytes32 indexed recordKey,
        uint64 indexed version,
        bytes32 dataHash,
        bytes32 actorHash,
        Action action,
        uint64 timestamp,
        address indexed writerAddress
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can write");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Thêm một phiên bản bằng chứng mới.
    /// @param recordKey Định danh cố định của bản ghi.
    /// @param dataHash Hash nội dung dữ liệu.
    /// @param actorHash Hash người dùng ứng dụng.
    /// @param expectedVersion Version do backend dự kiến.
    /// @param action CREATE, UPDATE hoặc DELETE.
    function appendEvidence(
        bytes32 recordKey,
        bytes32 dataHash,
        bytes32 actorHash,
        uint64 expectedVersion,
        Action action
    ) external onlyOwner {
        require(recordKey != bytes32(0), "recordKey is required");
        require(dataHash != bytes32(0), "dataHash is required");
        require(actorHash != bytes32(0), "actorHash is required");

        uint256 currentCount = histories[recordKey].length;

        // Contract kiểm tra version phải tăng liên tục.
        require(
            uint256(expectedVersion) == currentCount + 1,
            "invalid version"
        );

        if (currentCount == 0) {
            // Version đầu tiên bắt buộc phải là CREATE.
            require(
                action == Action.CREATE,
                "first action must be CREATE"
            );
        } else {
            // Bản ghi đã tồn tại thì không được CREATE lần nữa.
            require(
                action != Action.CREATE,
                "record already exists"
            );

            Evidence storage latestEvidence =
                histories[recordKey][currentCount - 1];

            if (latestEvidence.action == Action.DELETE) {
                // Nếu bản ghi đang bị xóa mềm, thao tác tiếp theo duy nhất hợp lệ là RESTORE.
                require(
                    action == Action.RESTORE,
                    "record deleted, only RESTORE allowed"
                );
            } else {
                // Nếu bản ghi đang hoạt động, không được gọi RESTORE.
                require(
                    action != Action.RESTORE,
                    "record active, cannot RESTORE"
                );
            }
        }

        uint64 evidenceTimestamp = uint64(block.timestamp);

        histories[recordKey].push(
            Evidence({
                dataHash: dataHash,
                actorHash: actorHash,
                version: expectedVersion,
                timestamp: evidenceTimestamp,
                action: action,
                writerAddress: msg.sender
            })
        );

        if (!registered[recordKey]) {
            registered[recordKey] = true;
            recordKeys.push(recordKey);
        }

        emit EvidenceAdded(
            recordKey,
            expectedVersion,
            dataHash,
            actorHash,
            action,
            evidenceTimestamp,
            msg.sender
        );
    }

    /// @notice Lấy Evidence mới nhất của một recordKey.
    function getLatestEvidence(
        bytes32 recordKey
    ) external view returns (Evidence memory) {
        uint256 count = histories[recordKey].length;

        require(count > 0, "record not found");

        return histories[recordKey][count - 1];
    }

    /// @notice Lấy Evidence theo version, bắt đầu từ version 1.
    function getEvidenceByVersion(
        bytes32 recordKey,
        uint64 version
    ) external view returns (Evidence memory) {
        require(version > 0, "version must start from 1");
        require(
            uint256(version) <= histories[recordKey].length,
            "version not found"
        );

        return histories[recordKey][uint256(version - 1)];
    }

    /// @notice Trả về tổng số phiên bản của recordKey.
    function getVersionCount(
        bytes32 recordKey
    ) external view returns (uint64) {
        return uint64(histories[recordKey].length);
    }

    /// @notice Kiểm tra recordKey đã từng được đăng ký chưa.
    function exists(bytes32 recordKey) external view returns (bool) {
        return registered[recordKey];
    }

    /// @notice Trả về tổng số recordKey đã đăng ký.
    function getRecordKeyCount() external view returns (uint256) {
        return recordKeys.length;
    }

    /// @notice Lấy recordKey theo vị trí để checker duyệt toàn bộ.
    function getRecordKeyAt(
        uint256 index
    ) external view returns (bytes32) {
        require(index < recordKeys.length, "index out of range");

        return recordKeys[index];
    }

    /// @notice Trả về toàn bộ danh sách recordKey đã đăng ký trên chuỗi.
    function getAllRecordKeys() external view returns (bytes32[] memory) {
        return recordKeys;
    }
}