import { Router, type IRouter } from "express";
import {
  GetQueueStatusQueryParams,
  JoinQueueBody,
  LeaveQueueBody,
} from "@workspace/api-zod";
import { getBus } from "../services/busTracking";
import { syncBusNotifications } from "../services/notificationEngine";
import { getQueueStatus, joinQueue, leaveQueue } from "../services/queueManager";

const router: IRouter = Router();

router.get("/queue/status", (req, res) => {
  const { busId = "bus-12" } = GetQueueStatusQueryParams.parse(req.query);
  const bus = getBus(busId);
  if (!bus) {
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  res.json(getQueueStatus(bus));
});

router.post("/queue/join", (req, res) => {
  const input = JoinQueueBody.parse(req.body);
  const bus = getBus(input.busId);
  if (!bus) {
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  const result = joinQueue(bus, input.studentId, input.boardingStop);
  if (result.duplicate) {
    res.status(409).json({ error: "Student is already in the queue" });
    return;
  }
  syncBusNotifications(bus, result.status.entry);
  res.status(201).json(result.status);
});

router.post("/queue/leave", (req, res) => {
  const input = LeaveQueueBody.parse(req.body);
  const bus = getBus(input.busId);
  if (!bus) {
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  res.json(leaveQueue(bus, input.studentId));
});

export default router;
