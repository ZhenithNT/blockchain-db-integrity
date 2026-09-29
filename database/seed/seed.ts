import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  Action,
  computeActorHash,
  computeDataHash,
  computeRecordKey,
  calculateLetterGrade,
} from "../../packages/shared/src/index.js";
import {
  appendEvidenceOnChain,
  recordExistsOnChain,
} from "../../apps/api/src/blockchain.js";

const prisma = new PrismaClient();

export async function runSeed() {
  console.log("🌱 Bắt đầu khởi tạo dữ liệu mẫu thực tế Cổng Đào Tạo PTIT...");

  // 1. Học kỳ (Semesters)
  const semestersData = [
    {
      code: "2025-2026.1",
      name: "Học kỳ 1 năm học 2025-2026",
      isCurrent: true,
      startDate: new Date("2025-08-15"),
      endDate: new Date("2026-01-15"),
    },
    {
      code: "2024-2025.2",
      name: "Học kỳ 2 năm học 2024-2025",
      isCurrent: false,
      startDate: new Date("2025-01-15"),
      endDate: new Date("2025-06-30"),
    },
    {
      code: "2026-1",
      name: "Học kỳ 1 năm học 2026",
      isCurrent: false,
    },
  ];

  for (const s of semestersData) {
    await prisma.semester.upsert({
      where: { code: s.code },
      update: { name: s.name, isCurrent: s.isCurrent },
      create: s,
    });
  }
  console.log("  ✓ Đã khởi tạo danh sách học kỳ");

  // 2. Môn học (Courses)
  const coursesData = [
    {
      code: "INT1313",
      name: "Cơ sở dữ liệu",
      credits: 3,
      department: "Khoa Công nghệ Thông tin 1",
    },
    {
      code: "INT1339",
      name: "Ngôn ngữ lập trình C++",
      credits: 3,
      department: "Khoa Công nghệ Thông tin 1",
    },
    {
      code: "BAS1201",
      name: "Triết học Mác - Lênin",
      credits: 3,
      department: "Khoa Lý luận Chính trị",
    },
    {
      code: "ATWEB",
      name: "An toàn ứng dụng Web",
      credits: 3,
      department: "Khoa An toàn Thông tin",
    },
  ];

  for (const c of coursesData) {
    await prisma.course.upsert({
      where: { code: c.code },
      update: { name: c.name, credits: c.credits, department: c.department },
      create: c,
    });
  }
  console.log("  ✓ Đã khởi tạo danh sách môn học");

  // 3. Giảng viên (Lecturers)
  const lecturersData = [
    {
      lecturerCode: "GV001",
      fullName: "Đỗ Thanh Hà",
      faculty: "Khoa Công nghệ Thông tin 1",
      email: "hadt@ptit.edu.vn",
    },
    {
      lecturerCode: "GV002",
      fullName: "Nguyễn Văn Tiến",
      faculty: "Khoa Công nghệ Thông tin 1",
      email: "tiennv@ptit.edu.vn",
    },
  ];

  for (const l of lecturersData) {
    await prisma.lecturer.upsert({
      where: { lecturerCode: l.lecturerCode },
      update: { fullName: l.fullName, faculty: l.faculty, email: l.email },
      create: l,
    });
  }
  console.log("  ✓ Đã khởi tạo danh sách giảng viên");

  // 4. Sinh viên (Students - giống ảnh mẫu B23DCAT211 - Nguyễn Trung Nghĩa)
  const studentsData = [
    {
      studentCode: "B23DCAT211",
      fullName: "Nguyễn Trung Nghĩa",
      className: "D23CQAT01-B",
      email: "nghianb23dcat211@stu.ptit.edu.vn",
      phone: "0987654321",
    },
    {
      studentCode: "B23DCCN001",
      fullName: "Trần Quốc Bình",
      className: "D23CQCN01-B",
      email: "binhtqb23dccn001@stu.ptit.edu.vn",
      phone: "0912345678",
    },
    {
      studentCode: "B23DCVT002",
      fullName: "Lê Văn Cường",
      className: "D23CQVT02-B",
      email: "cuonglvb23dcvt002@stu.ptit.edu.vn",
      phone: "0934567890",
    },
    {
      studentCode: "SV001",
      fullName: "Nguyễn Văn An",
      className: "D23CQAT01-B",
      email: "annv@stu.ptit.edu.vn",
      phone: "0901234567",
    },
  ];

  for (const st of studentsData) {
    await prisma.student.upsert({
      where: { studentCode: st.studentCode },
      update: { fullName: st.fullName, className: st.className, email: st.email },
      create: st,
    });
  }
  console.log("  ✓ Đã khởi tạo danh sách sinh viên");

  // 5. Tài khoản người dùng (Users)
  const defaultSalt = await bcrypt.genSalt(10);
  const usersData = [
    {
      username: "admin",
      password: "Admin@123",
      fullName: "Ban Quản trị Đào tạo",
      role: "ADMIN",
      email: "daotao@ptit.edu.vn",
    },
    {
      username: "lecturer",
      password: "Lecturer@123",
      fullName: "TS. Đỗ Thanh Hà",
      role: "LECTURER",
      email: "hadt@ptit.edu.vn",
      lecturerCode: "GV001",
    },
    {
      username: "gv_nvtien",
      password: "Lecturer@123",
      fullName: "ThS. Nguyễn Văn Tiến",
      role: "LECTURER",
      email: "tiennv@ptit.edu.vn",
      lecturerCode: "GV002",
    },
    {
      username: "sv_nghia",
      password: "Student@123",
      fullName: "Nguyễn Trung Nghĩa",
      role: "STUDENT",
      email: "nghianb23dcat211@stu.ptit.edu.vn",
      studentCode: "B23DCAT211",
    },
    {
      username: "auditor",
      password: "Auditor@123",
      fullName: "Kiểm toán viên Độc lập",
      role: "AUDITOR",
      email: "kiemtoan@moet.edu.vn",
    },
  ];

  await prisma.user.deleteMany({});
  for (const u of usersData) {
    const passwordHash = await bcrypt.hash(u.password, defaultSalt);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        role: u.role,
        studentCode: u.studentCode || null,
        lecturerCode: u.lecturerCode || null,
      },
      create: {
        username: u.username,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        email: u.email,
        studentCode: u.studentCode || null,
        lecturerCode: u.lecturerCode || null,
      },
    });
  }
  console.log("  ✓ Đã khởi tạo các tài khoản người dùng (Admin, GV Đỗ Thanh Hà, SV Nguyễn Trung Nghĩa, Auditor)");

  // 6. Lớp học phần (CourseOfferings)
  const offeringsData = [
    {
      offeringCode: "INT1313-01",
      courseCode: "INT1313",
      semesterCode: "2025-2026.1",
      room: "A2-301",
      maxStudents: 60,
      status: "APPROVED", // Đã nộp và được duyệt
      approvedBy: "admin",
      approvedAt: new Date(),
    },
    {
      offeringCode: "INT1339-01",
      courseCode: "INT1339",
      semesterCode: "2025-2026.1",
      room: "B1-204",
      maxStudents: 50,
      status: "DRAFT", // Giảng viên đang nhập nháp
    },
  ];

  const createdOfferings: Record<string, any> = {};
  for (const o of offeringsData) {
    const off = await prisma.courseOffering.upsert({
      where: { offeringCode: o.offeringCode },
      update: { status: o.status, approvedBy: o.approvedBy, approvedAt: o.approvedAt },
      create: o,
    });
    createdOfferings[o.offeringCode] = off;
  }
  console.log("  ✓ Đã khởi tạo các lớp học phần (INT1313-01 và INT1339-01)");

  // 7. Phân công giảng viên (LecturerAssignments)
  await prisma.lecturerAssignment.upsert({
    where: {
      unique_offering_lecturer: {
        offeringId: createdOfferings["INT1313-01"].id,
        lecturerCode: "GV001",
      },
    },
    update: { canGrade: true },
    create: {
      offeringId: createdOfferings["INT1313-01"].id,
      lecturerCode: "GV001",
      role: "PRIMARY",
      canGrade: true,
    },
  });

  await prisma.lecturerAssignment.upsert({
    where: {
      unique_offering_lecturer: {
        offeringId: createdOfferings["INT1339-01"].id,
        lecturerCode: "GV002",
      },
    },
    update: { canGrade: true },
    create: {
      offeringId: createdOfferings["INT1339-01"].id,
      lecturerCode: "GV002",
      role: "PRIMARY",
      canGrade: true,
    },
  });
  console.log("  ✓ Đã phân công GV Đỗ Thanh Hà dạy INT1313-01, GV Nguyễn Văn Tiến dạy INT1339-01");

  // 8. Đăng ký học (Enrollments)
  const enrollmentsList = [
    { offeringCode: "INT1313-01", studentCode: "B23DCAT211" },
    { offeringCode: "INT1313-01", studentCode: "B23DCCN001" },
    { offeringCode: "INT1313-01", studentCode: "B23DCVT002" },
    { offeringCode: "INT1313-01", studentCode: "SV001" },
    { offeringCode: "INT1339-01", studentCode: "B23DCAT211" },
    { offeringCode: "INT1339-01", studentCode: "B23DCCN001" },
  ];

  const createdEnrollments: Record<string, any> = {};
  for (const enr of enrollmentsList) {
    const offering = createdOfferings[enr.offeringCode];
    const key = `${enr.offeringCode}_${enr.studentCode}`;
    const item = await prisma.enrollment.upsert({
      where: {
        unique_offering_student: {
          offeringId: offering.id,
          studentCode: enr.studentCode,
        },
      },
      update: { status: "ENROLLED" },
      create: {
        offeringId: offering.id,
        studentCode: enr.studentCode,
        status: "ENROLLED",
      },
    });
    createdEnrollments[key] = item;
  }
  console.log("  ✓ Đã đăng ký sinh viên vào các lớp học phần");

  // 9. Điểm số & Neo bằng chứng Blockchain (Scores & Blockchain Evidences)
  const initialScores = [
    {
      offeringCode: "INT1313-01",
      courseCode: "INT1313",
      semester: "2025-2026.1",
      studentId: "B23DCAT211",
      attendance: 9.0,
      midterm: 8.0,
      final: 8.5,
      score: "8.45",
      letter: "B+",
      actorId: "gv_dthaha",
    },
    {
      offeringCode: "INT1313-01",
      courseCode: "INT1313",
      semester: "2025-2026.1",
      studentId: "B23DCCN001",
      attendance: 8.0,
      midterm: 7.0,
      final: 7.0,
      score: "7.10",
      letter: "B",
      actorId: "gv_dthaha",
    },
    {
      offeringCode: "INT1313-01",
      courseCode: "INT1313",
      semester: "2025-2026.1",
      studentId: "B23DCVT002",
      attendance: 10.0,
      midterm: 9.0,
      final: 9.5,
      score: "9.45",
      letter: "A+",
      actorId: "gv_dthaha",
    },
    {
      offeringCode: "INT1313-01",
      courseCode: "INT1313",
      semester: "2025-2026.1",
      studentId: "SV001",
      attendance: 9.0,
      midterm: 8.5,
      final: 8.5,
      score: "8.55",
      letter: "A",
      actorId: "gv_dthaha",
    },
  ];

  for (const item of initialScores) {
    const recordKey = computeRecordKey({
      studentId: item.studentId,
      courseCode: item.courseCode,
      semester: item.semester,
    });

    const dataHash = computeDataHash({
      studentId: item.studentId,
      courseCode: item.courseCode,
      semester: item.semester,
      score: item.score,
      version: 1,
      status: "ACTIVE",
    });

    const actorHash = computeActorHash(item.actorId);
    const enrollment = createdEnrollments[`${item.offeringCode}_${item.studentId}`];

    // Kiểm tra và neo lên Blockchain nếu chưa có
    let txHash: string | null = null;
    let blockNum: bigint | null = null;
    let bcTime: Date | null = null;
    let bcStatus = "CONFIRMED";

    try {
      const existsOnChain = await recordExistsOnChain(recordKey);
      if (!existsOnChain) {
        const receipt = await appendEvidenceOnChain(
          recordKey,
          dataHash,
          actorHash,
          1n,
          Action.CREATE
        );
        txHash = receipt.transactionHash;
        blockNum = receipt.blockNumber;
        bcTime = receipt.blockchainTimestamp;
        console.log(`  🔗 Neo điểm thành công lên Blockchain cho [${item.studentId}] tx: ${txHash.slice(0, 14)}...`);
      } else {
        bcStatus = "CONFIRMED";
      }
    } catch (bcErr) {
      console.warn(`  ⚠️ Blockchain append warning cho ${item.studentId}:`, bcErr);
      bcStatus = "PENDING";
    }

    const scoreRow = await prisma.score.upsert({
      where: {
        unique_student_course_semester: {
          studentId: item.studentId,
          courseCode: item.courseCode,
          semester: item.semester,
        },
      },
      update: {
        score: item.score,
        attendanceScore: item.attendance,
        midtermScore: item.midterm,
        finalScore: item.final,
        letterScore: item.letter,
        dataHash,
        blockchainStatus: bcStatus,
        latestTxHash: txHash,
      },
      create: {
        enrollmentId: enrollment ? enrollment.id : null,
        studentId: item.studentId,
        courseCode: item.courseCode,
        offeringCode: item.offeringCode,
        semester: item.semester,
        attendanceScore: item.attendance,
        midtermScore: item.midterm,
        finalScore: item.final,
        score: item.score,
        letterScore: item.letter,
        version: 1,
        status: "ACTIVE",
        recordKey,
        dataHash,
        blockchainStatus: bcStatus,
        latestTxHash: txHash,
      },
    });

    // ScoreVersion
    const existingVer = await prisma.scoreVersion.findUnique({
      where: {
        unique_score_version: {
          scoreId: scoreRow.id,
          version: 1,
        },
      },
    });

    if (!existingVer) {
      await prisma.scoreVersion.create({
        data: {
          scoreId: scoreRow.id,
          version: 1,
          score: item.score,
          attendanceScore: item.attendance,
          midtermScore: item.midterm,
          finalScore: item.final,
          status: "ACTIVE",
          action: "CREATE",
          dataHash,
          actorHash,
          transactionHash: txHash,
          blockNumber: blockNum,
          blockchainTimestamp: bcTime,
          syncStatus: bcStatus,
        },
      });
    }
  }
  console.log("  ✓ Đã nhập và neo bằng chứng điểm lớp INT1313-01 lên Blockchain");

  // 10. Thông báo đào tạo (Notifications - theo đúng nội dung ảnh mẫu PTIT)
  const notificationsData = [
    {
      title: "Giảng viên Đỗ Thanh Hà thông báo đến lớp Cơ sở dữ liệu (INT1313) về vấn đề: học trực tuyến ngày 6/10 do Bão",
      content: "Do ảnh hưởng của bão số 4, lớp học phần Cơ sở dữ liệu (INT1313-01) sẽ chuyển sang hình thức học trực tuyến qua MS Teams vào ngày 6/10. Đề nghị các em sinh viên kiểm tra lịch và tham gia đầy đủ.",
      sender: "Giảng viên Đỗ Thanh Hà",
      targetRole: "STUDENT",
      isUrgent: true,
      createdAt: new Date("2025-10-05T08:30:00Z"),
    },
    {
      title: "TỔ CHỨC ĐĂNG KÝ HỌC PHẦN HỌC KỲ 2 NĂM HỌC 2024-2025",
      content: "Phòng Giáo vụ thông báo kế hoạch tổ chức đăng ký học phần học kỳ 2 năm học 2024-2025 cho toàn thể sinh viên các khóa. Thời gian mở cổng đăng ký bắt đầu từ 08h00 ngày 10/12/2024.",
      sender: "Phòng Giáo vụ & Đào tạo",
      targetRole: "ALL",
      isUrgent: false,
      createdAt: new Date("2024-12-03T09:00:00Z"),
    },
    {
      title: "Giảng viên Nguyễn Văn Tiến thông báo lớp Ngôn ngữ lập trình C++ (INT1339) về vấn đề: Bài tập lớn và lịch nộp",
      content: "Đề cương bài tập lớn học phần Ngôn ngữ lập trình C++ đã được tải lên hệ thống. Hạn nộp bài tập lớn là tuần thứ 12 của học kỳ.",
      sender: "Giảng viên Nguyễn Văn Tiến",
      targetRole: "STUDENT",
      isUrgent: false,
      createdAt: new Date("2024-09-12T14:15:00Z"),
    },
    {
      title: "Thông báo: Về việc triển khai đào tạo theo phương thức kết hợp (trực tiếp và trực tuyến) đối với học phần Triết học Mác – Lênin, Kinh tế chính trị Mác- Lênin, Chủ nghĩa xã hội khoa học thuộc học kỳ 1 năm học 2024-2025",
      content: "Thực hiện kế hoạch năm học, Học viện thông báo phương thức đào tạo kết hợp (Blended Learning) cho khối các môn Lý luận chính trị trong học kỳ 1 năm học 2024-2025.",
      sender: "Ban Quản lý Đào tạo",
      targetRole: "ALL",
      isUrgent: false,
      createdAt: new Date("2024-08-26T10:00:00Z"),
    },
  ];

  await prisma.notification.deleteMany({});
  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }
  console.log("  ✓ Đã khởi tạo các thông báo chuẩn giao diện PTIT");

  console.log("✅ Khởi tạo toàn bộ dữ liệu mẫu hoàn tất!");
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  runSeed()
    .catch((err) => {
      console.error("❌ Lỗi khi seed dữ liệu:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
