import { Router } from "express";
import { batchSaveScoresSchema } from "@integrity/shared";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import {
  getOfferings,
  getOfferingById,
  updateOfferingStatus,
} from "../services/offering.service.js";
import { approveClassScores, saveClassScores } from "../services/score.service.js";

export const offeringRouter = Router();

offeringRouter.use(authenticate);

// Lấy danh sách lớp học phần
offeringRouter.get("/", async (req, res, next) => {
  try {
    const { semester, status, myClasses } = req.query;
    const lecturerUsername =
      myClasses === "true" && req.user?.role === "LECTURER"
        ? req.user.username
        : undefined;

    const offerings = await getOfferings({
      semesterCode: semester ? String(semester) : undefined,
      status: status ? String(status) : undefined,
      lecturerUsername,
    });
    res.json(offerings);
  } catch (err) {
    next(err);
  }
});

// Lấy chi tiết lớp học phần và bảng điểm sinh viên
offeringRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const offering = await getOfferingById(id);
    res.json(offering);
  } catch (err) {
    next(err);
  }
});

// Giảng viên lưu bảng điểm (nháp hoặc nộp)
offeringRouter.post("/:id/grades", requireRole("ADMIN", "LECTURER"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = batchSaveScoresSchema.parse({
      ...req.body,
      offeringId: id,
    });

    const result = await saveClassScores(
      id,
      parsed.scores,
      parsed.isDraft,
      req.user?.username || "unknown"
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Chuyển trạng thái lớp học phần
offeringRouter.put("/:id/status", requireRole("ADMIN", "LECTURER"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const result = await updateOfferingStatus(id, status, req.user?.username || "unknown");
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Đào tạo duyệt bảng điểm và tự động neo bằng chứng Blockchain
offeringRouter.post("/:id/approve", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await approveClassScores(id, req.user?.username || "admin");
    res.json(result);
  } catch (err) {
    next(err);
  }
});
