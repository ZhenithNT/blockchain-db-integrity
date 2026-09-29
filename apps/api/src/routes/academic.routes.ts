import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import {
  assignLecturerToOffering,
  createCourse,
  createCourseOffering,
  createLecturer,
  createSemester,
  createStudent,
  enrollStudentToOffering,
  getCourses,
  getLecturers,
  getSemesters,
  getStudents,
  studentSelfEnroll,
  studentSelfUnenroll,
} from "../services/academic.service.js";

export const academicRouter = Router();

// Tất cả route đều yêu cầu đăng nhập
academicRouter.use(authenticate);

// --- GIẢNG VIÊN ---
academicRouter.get("/lecturers", async (_req, res, next) => {
  try {
    const list = await getLecturers();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

academicRouter.post("/lecturers", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const result = await createLecturer(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// --- SINH VIÊN ---
academicRouter.get("/students", async (_req, res, next) => {
  try {
    const list = await getStudents();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

academicRouter.post("/students", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const result = await createStudent(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// --- MÔN HỌC ---
academicRouter.get("/courses", async (_req, res, next) => {
  try {
    const list = await getCourses();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

academicRouter.post("/courses", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const result = await createCourse(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// --- HỌC KỲ ---
academicRouter.get("/semesters", async (_req, res, next) => {
  try {
    const list = await getSemesters();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

academicRouter.post("/semesters", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const result = await createSemester(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// --- LỚP HỌC PHẦN (TẠO MỚI, PHÂN CÔNG, GHI DANH) ---
academicRouter.post("/offerings", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const result = await createCourseOffering(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

academicRouter.post("/offerings/:id/assign-lecturer", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const offeringId = Number(req.params.id);
    const result = await assignLecturerToOffering({
      offeringId,
      ...req.body,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

academicRouter.post("/offerings/:id/enroll-student", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const offeringId = Number(req.params.id);
    const result = await enrollStudentToOffering({
      offeringId,
      ...req.body,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- SINH VIÊN TỰ ĐĂNG KÝ HỌC & HỦY ĐĂNG KÝ ---
academicRouter.post("/offerings/:id/enroll", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const offeringId = Number(req.params.id);
    const result = await studentSelfEnroll(offeringId, req.user!.username);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

academicRouter.delete("/offerings/:id/enroll", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const offeringId = Number(req.params.id);
    const result = await studentSelfUnenroll(offeringId, req.user!.username);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
