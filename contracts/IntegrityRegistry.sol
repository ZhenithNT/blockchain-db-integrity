// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @title IntegrityRegistry
/// @notice Sổ ghi bằng chứng toàn vẹn cho điểm và cho biết AI đã ghi từng phiên bản.
///
/// - Mỗi admin có một ví riêng. Chỉ ví được chủ hợp đồng (owner) cấp quyền mới ghi được.
/// - Mỗi lần ghi, contract tự lưu địa chỉ ví đã ký (msg.sender). Địa chỉ này không giả được.
/// - Evidence chỉ được thêm vào cuối, không có hàm sửa hay xóa.
contract IntegrityRegistry {
    enum Action {
        CREATE,
        UPDATE
    }

    struct Evidence {
        bytes32 dataHash; // SHA-256 của nội dung điểm ở phiên bản này
        uint64 version; // 1, 2, 3...
        uint64 timestamp; // giờ của khối
        Action action;
        address writer; // ví đã ký giao dịch
    }

    /// @notice Chủ hợp đồng: chỉ cấp hoặc thu hồi quyền ghi, bản thân không ghi điểm.
    address public immutable owner;

    mapping(address => bool) public isWriter;
    address[] private writers;
    mapping(address => bool) private everWriter;

    mapping(bytes32 => Evidence[]) private histories;
    mapping(bytes32 => bool) private registered;
    bytes32[] private recordKeys;

    event EvidenceAdded(
        bytes32 indexed recordKey,
        uint64 indexed version,
        bytes32 dataHash,
        Action action,
        uint64 timestamp,
        address indexed writer
    );

    event WriterChanged(address indexed writer, bool allowed);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyWriter() {
        require(isWriter[msg.sender], "not a writer");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ------------------------------------------------------------------
    // Quản lý ví được ghi
    // ------------------------------------------------------------------

    function addWriter(address account) external onlyOwner {
        require(account != address(0), "zero address");
        isWriter[account] = true;
        if (!everWriter[account]) {
            everWriter[account] = true;
            writers.push(account);
        }
        emit WriterChanged(account, true);
    }

    function removeWriter(address account) external onlyOwner {
        isWriter[account] = false;
        emit WriterChanged(account, false);
    }

    function getWriters() external view returns (address[] memory) {
        return writers;
    }

    // ------------------------------------------------------------------
    // Ghi bằng chứng
    // ------------------------------------------------------------------

    /// @param recordKey Định danh cố định của bản ghi (hash của mã SV, môn, kỳ).
    /// @param dataHash Hash nội dung điểm.
    /// @param expectedVersion Phải bằng số phiên bản hiện có cộng 1.
    /// @param action CREATE cho phiên bản đầu tiên, UPDATE cho các phiên bản sau.
    function appendEvidence(
        bytes32 recordKey,
        bytes32 dataHash,
        uint64 expectedVersion,
        Action action
    ) external onlyWriter {
        require(recordKey != bytes32(0), "recordKey is required");
        require(dataHash != bytes32(0), "dataHash is required");

        uint256 count = histories[recordKey].length;
        require(uint256(expectedVersion) == count + 1, "invalid version");

        if (count == 0) {
            require(action == Action.CREATE, "first action must be CREATE");
        } else {
            require(action == Action.UPDATE, "record already exists");
        }

        uint64 ts = uint64(block.timestamp);
        histories[recordKey].push(
            Evidence({
                dataHash: dataHash,
                version: expectedVersion,
                timestamp: ts,
                action: action,
                writer: msg.sender
            })
        );

        if (!registered[recordKey]) {
            registered[recordKey] = true;
            recordKeys.push(recordKey);
        }

        emit EvidenceAdded(recordKey, expectedVersion, dataHash, action, ts, msg.sender);
    }

    // ------------------------------------------------------------------
    // Đọc (miễn phí)
    // ------------------------------------------------------------------

    function getHistory(bytes32 recordKey) external view returns (Evidence[] memory) {
        return histories[recordKey];
    }

    function getLatestEvidence(bytes32 recordKey) external view returns (Evidence memory) {
        uint256 count = histories[recordKey].length;
        require(count > 0, "record not found");
        return histories[recordKey][count - 1];
    }

    function getVersionCount(bytes32 recordKey) external view returns (uint64) {
        return uint64(histories[recordKey].length);
    }

    function exists(bytes32 recordKey) external view returns (bool) {
        return registered[recordKey];
    }

    function getAllRecordKeys() external view returns (bytes32[] memory) {
        return recordKeys;
    }
}
