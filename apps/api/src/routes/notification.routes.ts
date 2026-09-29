import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  getNotifications,
  markNotificationAsRead,
} from "../services/notification.service.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get("/", async (req, res, next) => {
  try {
    const role = req.user?.role;
    const notifications = await getNotifications(role);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

notificationRouter.put("/:id/read", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const updated = await markNotificationAsRead(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
