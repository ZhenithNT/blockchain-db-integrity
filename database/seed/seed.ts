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
  console.log("🌱 Bắt đầu khởi tạo dữ liệu mẫu thực nghiệm theo Báo Cáo BTL INT14105...");

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
  console.log("  ✓ Đã khởi tạo danh sách học kỳ (2025-2026.1, 2024-2025.2, 2026-1)");

  // 2. Môn học (Courses)
  const coursesData = [
    {
      code: "BAS1111",
      name: "Giải tích 1",
      credits: 3,
      department: "Khoa Cơ bản",
    },
    {
      code: "INT14105",
      name: "An toàn ứng dụng Web và cơ sở dữ liệu",
      credits: 3,
      department: "Khoa An toàn Thông tin",
    },
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
  ];

  for (const c of coursesData) {
    await prisma.course.upsert({
      where: { code: c.code },
      update: { name: c.name, credits: c.credits, department: c.department },
      create: c,
    });
  }
  console.log("  ✓ Đã khởi tạo danh sách môn học (BAS1111 Giải tích 1, INT14105 AT Web & CSDL, INT1313 CSDL)");

  // 3. Giảng viên (Lecturers)
  const lecturersData = [
    {
      lecturerCode: "GV001",
      fullName: "Nguyễn Hoài Nam",
      faculty: "Khoa Cơ bản",
      email: "namnh@ptit.edu.vn",
    },
    {
      lecturerCode: "GV002",
      fullName: "Ths. Vũ Minh Mạnh",
      faculty: "Khoa An toàn Thông tin",
      email: "manhvm@ptit.edu.vn",
    },
    {
      lecturerCode: "GV003",
      fullName: "TS. Đỗ Thanh Hà",
      faculty: "Khoa Công nghệ Thông tin 1",
      email: "hadt@ptit.edu.vn",
    },
  ];

  for (const l of lecturersData) {
    await prisma.lecturer.upsert({
      where: { lecturerCode: l.lecturerCode },
      update: { fullName: l.fullName, faculty: l.faculty, email: l.email },
      create: l,
    });
  }
  console.log("  ✓ Đã khởi tạo danh sách giảng viên (GV001 ThS. Nguyễn Hoài Nam, GV002 ThS. Vũ Minh Mạnh)");

  // 4. Sinh viên (Students)
  const studentsData = [
    {
      studentCode: "B23DCAT111",
      fullName: "Nguyễn Văn A",
      className: "D23CQAT01-B",
      email: "anv@stu.ptit.edu.vn",
      phone: "0901234567",
    },
    {
      studentCode: "B23DCAT211",
      fullName: "Nguyễn Trung Nghĩa",
      className: "D23CQAT01-B",
      email: "nghianb23dcat211@stu.ptit.edu.vn",
      phone: "0987654321",
    },
    {
      studentCode: "B23DCAT013",
      fullName: "Nguyễn Lê Kỳ Anh",
      className: "D23CQAT01-B",
      email: "anhnlkb23dcat013@stu.ptit.edu.vn",
      phone: "0912345678",
    },
    {
      studentCode: "B23DCAT086",
      fullName: "Khuất Quang Hải",
      className: "D23CQAT01-B",
      email: "haikqb23dcat086@stu.ptit.edu.vn",
      phone: "0934567890",
    },
    {
      studentCode: "SV001",
      fullName: "Trần Quốc Bình",
      className: "D23CQCN01-B",
      email: "binhtqb23dccn001@stu.ptit.edu.vn",
      phone: "0912345679",
    },
  ];

  for (const st of studentsData) {
    await prisma.student.upsert({
      where: { studentCode: st.studentCode },
      update: { fullName: st.fullName, className: st.className, email: st.email },
      create: st,
    });
  }
  console.log("  ✓ Đã khởi tạo danh sách sinh viên (B23DCAT111 Nguyễn Văn A, B23DCAT211 Nguyễn Trung Nghĩa, B23DCAT013, B23DCAT086)");

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
      fullName: "ThS. Nguyễn Hoài Nam",
      role: "LECTURER",
      email: "namnh@ptit.edu.vn",
      lecturerCode: "GV001",
    },
    {
      username: "gv_manh",
      password: "Lecturer@123",
      fullName: "ThS. Vũ Minh Mạnh",
      role: "LECTURER",
      email: "manhvm@ptit.edu.vn",
      lecturerCode: "GV002",
    },
    {
      username: "sv_a",
      password: "Student@123",
      fullName: "Nguyễn Văn A",
      role: "STUDENT",
      email: "anv@stu.ptit.edu.vn",
      studentCode: "B23DCAT111",
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
      username: "sv_kyanh",
      password: "Student@123",
      fullName: "Nguyễn Lê Kỳ Anh",
      role: "STUDENT",
      email: "anhnlkb23dcat013@stu.ptit.edu.vn",
      studentCode: "B23DCAT013",
    },
    {
      username: "sv_hai",
      password: "Student@123",
      fullName: "Khuất Quang Hải",
      role: "STUDENT",
      email: "haikqb23dcat086@stu.ptit.edu.vn",
      studentCode: "B23DCAT086",
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
  console.log("  ✓ Đã khởi tạo các tài khoản người dùng (Admin, GV Nguyễn Hoài Nam, SV Nguyễn Văn A, SV Nguyễn Trung Nghĩa, Auditor)");

  // 6. Lớp học phần (CourseOfferings)
  const offeringsData = [
    {
      offeringCode: "MH001",
      courseCode: "BAS1111",
      semesterCode: "2025-2026.1",
      room: "A2-301",
      maxStudents: 60,
      status: "PUBLISHED", // ĐÃ CÔNG BỐ
      approvedBy: "admin",
      approvedAt: new Date(),
    },
    {
      offeringCode: "INT14105-01",
      courseCode: "INT14105",
      semesterCode: "2025-2026.1",
      room: "402-A2",
      maxStudents: 50,
      status: "PUBLISHED", // ĐÃ CÔNG BỐ
      approvedBy: "admin",
      approvedAt: new Date(),
    },
    {
      offeringCode: "INT1313-01",
      courseCode: "INT1313",
      semesterCode: "2025-2026.1",
      room: "B1-204",
      maxStudents: 50,
      status: "APPROVED",
      approvedBy: "admin",
      approvedAt: new Date(),
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
  console.log("  ✓ Đã khởi tạo các lớp học phần (MH001 - Giải tích 1 và INT14105-01 - AT Web & CSDL)");

  // 7. Phân công giảng viên (LecturerAssignments)
  await prisma.lecturerAssignment.upsert({
    where: {
      unique_offering_lecturer: {
        offeringId: createdOfferings["MH001"].id,
        lecturerCode: "GV001",
      },
    },
    update: { canGrade: true },
    create: {
      offeringId: createdOfferings["MH001"].id,
      lecturerCode: "GV001",
      role: "PRIMARY",
      canGrade: true,
    },
  });

  await prisma.lecturerAssignment.upsert({
    where: {
      unique_offering_lecturer: {
        offeringId: createdOfferings["INT14105-01"].id,
        lecturerCode: "GV002",
      },
    },
    update: { canGrade: true },
    create: {
      offeringId: createdOfferings["INT14105-01"].id,
      lecturerCode: "GV002",
      role: "PRIMARY",
      canGrade: true,
    },
  });
  console.log("  ✓ Đã phân công GV Nguyễn Hoài Nam dạy MH001 (Giải tích 1), GV Vũ Minh Mạnh dạy INT14105-01");

  // 8. Đăng ký học (Enrollments)
  const enrollmentsList = [
    { offeringCode: "MH001", studentCode: "B23DCAT111" },
    { offeringCode: "MH001", studentCode: "B23DCAT211" },
    { offeringCode: "MH001", studentCode: "B23DCAT013" },
    { offeringCode: "MH001", studentCode: "B23DCAT086" },
    { offeringCode: "INT14105-01", studentCode: "B23DCAT211" },
    { offeringCode: "INT14105-01", studentCode: "B23DCAT013" },
    { offeringCode: "INT14105-01", studentCode: "B23DCAT086" },
    { offeringCode: "INT14105-01", studentCode: "B23DCAT111" },
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
  // Bảng 2 & Hình trang 37: B23DCAT111 học Giải tích 1 (BAS1111) điểm 8.50 (v1)
  const initialScores = [
    {
      offeringCode: "MH001",
      courseCode: "BAS1111",
      semester: "2025-2026.1",
      studentId: "B23DCAT111",
      attendance: 8.5,
      midterm: 8.5,
      final: 8.5,
      score: "8.50",
      letter: "A",
      actorId: "lecturer",
    },
    {
      offeringCode: "INT14105-01",
      courseCode: "INT14105",
      semester: "2025-2026.1",
      studentId: "B23DCAT211",
      attendance: 9.0,
      midterm: 8.5,
      final: 9.0,
      score: "8.90",
      letter: "A",
      actorId: "gv_manh",
    },
    {
      offeringCode: "INT14105-01",
      courseCode: "INT14105",
      semester: "2025-2026.1",
      studentId: "B23DCAT013",
      attendance: 8.5,
      midterm: 8.5,
      final: 8.5,
      score: "8.50",
      letter: "A",
      actorId: "gv_manh",
    },
    {
      offeringCode: "INT14105-01",
      courseCode: "INT14105",
      semester: "2025-2026.1",
      studentId: "B23DCAT086",
      attendance: 9.0,
      midterm: 9.0,
      final: 8.5,
      score: "8.75",
      letter: "A",
      actorId: "gv_manh",
    },
    {
      offeringCode: "MH001",
      courseCode: "BAS1111",
      semester: "2025-2026.1",
      studentId: "B23DCAT211",
      attendance: 9.0,
      midterm: 8.0,
      final: 8.5,
      score: "8.45",
      letter: "B+",
      actorId: "lecturer",
    },
  ];

  await prisma.auditLog.deleteMany({});

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
        console.log(`  🔗 Neo điểm thành công lên Blockchain cho [${item.studentId} - ${item.courseCode}] tx: ${txHash.slice(0, 14)}...`);
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

    // Ghi Audit Log ban đầu
    await prisma.auditLog.create({
      data: {
        actor: item.actorId,
        action: "CREATE",
        target: `Score #${scoreRow.id} (${item.studentId} - ${item.courseCode})`,
        beforeData: null,
        afterData: JSON.stringify({
          score: item.score,
          attendanceScore: item.attendance,
          midtermScore: item.midterm,
          finalScore: item.final,
          version: 1,
          status: "ACTIVE",
          dataHash,
        }),
        ip: "127.0.0.1",
        timestamp: new Date(),
      },
    });
  }
  console.log("  ✓ Đã nhập điểm chuẩn, tạo lịch sử phiên bản 1 và Audit Log ban đầu");

  // 10. Thông báo đào tạo
  const notificationsData = [
    {
      title: "Thông báo bảo vệ Bài tập lớn học phần An toàn ứng dụng Web và Cơ sở dữ liệu (INT14105)",
      content: "Lịch bảo vệ Bài tập lớn học phần An toàn ứng dụng Web và Cơ sở dữ liệu (INT14105) của nhóm 09 lớp 03 sẽ diễn ra theo lịch thông báo của Khoa An toàn Thông tin. Đề nghị các nhóm chuẩn bị bài báo cáo và sản phẩm demo đầy đủ.",
      sender: "ThS. Vũ Minh Mạnh - Khoa ATTT",
      targetRole: "STUDENT",
      isUrgent: true,
      createdAt: new Date("2025-10-05T08:30:00Z"),
    },
    {
      title: "Công bố bảng điểm học phần Giải tích 1 (BAS1111) Học kỳ 1 năm học 2025-2026",
      content: "Giảng viên Nguyễn Hoài Nam đã hoàn thành nhập điểm và công bố bảng điểm lớp học phần Giải tích 1 (MH001). Toàn bộ dữ liệu điểm đã được niêm phong mật mã trên Smart Contract Blockchain.",
      sender: "ThS. Nguyễn Hoài Nam - Khoa Cơ bản",
      targetRole: "ALL",
      isUrgent: false,
      createdAt: new Date("2025-10-04T09:00:00Z"),
    },
    {
      title: "TỔ CHỨC ĐĂNG KÝ HỌC PHẦN HỌC KỲ 2 NĂM HỌC 2025-2026",
      content: "Phòng Giáo vụ thông báo kế hoạch tổ chức đăng ký học phần học kỳ 2 năm học 2025-2026 cho toàn thể sinh viên các khóa. Thời gian mở cổng đăng ký bắt đầu từ 08h00 ngày 10/12/2025.",
      sender: "Phòng Giáo vụ & Đào tạo",
      targetRole: "ALL",
      isUrgent: false,
      createdAt: new Date("2025-10-01T14:15:00Z"),
    },
  ];

  await prisma.notification.deleteMany({});
  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }
  console.log("  ✓ Đã khởi tạo các thông báo chuẩn giao diện PTIT");

  console.log("✅ Khởi tạo toàn bộ dữ liệu mẫu theo Báo cáo Chương 3 hoàn tất!");
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
