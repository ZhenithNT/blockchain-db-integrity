import { Router } from "express";
import {
  createChangeRequestSchema,
  reviewChangeRequestSchema,
} from "@integrity/shared";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import {
  createChangeRequest,
  getChangeRequests,
  reviewChangeRequest,
} from "../services/change-request.service.js";

export const changeRequestRouter = Router();

changeRequestRouter.use(authenticate);

changeRequestRouter.get("/", async (req, res, next) => {
  try {
    const { status, myRequests } = req.query;
    const requestedBy =
      myRequests === "true" && req.user?.role === "LECTURER"
        ? req.user.username
        : undefined;

    const requests = await getChangeRequests({
      status: status ? String(status) : undefined,
      requestedBy,
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

changeRequestRouter.post("/", requireRole("ADMIN", "LECTURER"), async (req, res, next) => {
  try {
    const parsed = createChangeRequestSchema.parse(req.body);
    const result = await createChangeRequest({
      ...parsed,
      requestedBy: req.user?.username || "unknown",
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

changeRequestRouter.put("/:id/review", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = reviewChangeRequestSchema.parse(req.body);
    const result = await reviewChangeRequest(
      id,
      parsed.status,
      parsed.reviewNote,
      req.user?.username || "admin"
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});
