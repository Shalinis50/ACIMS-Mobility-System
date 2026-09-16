import { Router, type IRouter } from "express";
import {
  ListNotificationsResponse,
  MarkNotificationReadBody,
} from "@workspace/api-zod";
import {
  listNotifications,
  markNotificationRead,
} from "../services/notificationEngine";

const router: IRouter = Router();

router.get("/notifications", (_req, res) => {
  res.json(ListNotificationsResponse.parse(listNotifications()));
});

router.post("/notifications/read", (req, res) => {
  const { id } = MarkNotificationReadBody.parse(req.body);
  const notification = markNotificationRead(id);
  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(notification);
});

export default router;
