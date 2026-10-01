import { Router, type IRouter } from "express";
import {
  GetQueueStatusQueryParams,
  JoinQueueBody,
  LeaveQueueBody,
} from "@workspace/api-zod";
import {
  getDbBusById,
  getDbQueueStatus,
  joinDbQueue,
  leaveDbQueue,
  getDbStudentActiveQueue,
} from "../../../../src/db/services.ts";

const router: IRouter = Router();

// -------------------------------------------------------------
// GET QUEUE STATUS (Cloud SQL PostgreSQL)
// -------------------------------------------------------------
router.get("/queue/status", async (req, res) => {
  try {
    const { busId = "bus-12" } = GetQueueStatusQueryParams.parse(req.query);
    const studentId =
      (req.query.studentId as string) ||
      req.header("x-acims-user-id") ||
      undefined;

    const bus = await getDbBusById(busId);
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }

    const queueStatus = await getDbQueueStatus(busId, studentId);

    // Format response matching API contract (without occupancy/capacity simulation)
    const formatted = {
      busId: bus.id,
      busNumber: bus.busNumber,
      joined: queueStatus.userInQueue,
      queueSize: queueStatus.queueSize,
      entry: queueStatus.entry
        ? {
            studentId: queueStatus.entry.studentId,
            boardingStop: queueStatus.entry.boardingStop,
            queuePosition: queueStatus.queuePosition ?? 1,
            joinedAt: queueStatus.entry.joinedAt?.toISOString() || new Date().toISOString(),
          }
        : null,
      seatsAvailable: 45, // Static physical bus capacity rating
      currentOccupancy: 0, // Occupancy deprecated
      estimatedAvailabilityMinutes: queueStatus.queuePosition
        ? Math.max(2, (queueStatus.queuePosition - 1) * 3)
        : Math.max(2, queueStatus.queueSize * 3),
      message: queueStatus.userInQueue
        ? `Your place is held at #${queueStatus.queuePosition} for Bus ${bus.busNumber}.`
        : queueStatus.queueSize > 0
        ? `${queueStatus.queueSize} student(s) currently waiting in line for Bus ${bus.busNumber}.`
        : `Boarding line open for Bus ${bus.busNumber}. Reserve your place for upcoming arrival.`,
      status: queueStatus.status,
    };

    res.json(formatted);
  } catch (err: any) {
    console.error("Error getting queue status:", err);
    res.status(500).json({ error: "Failed to get queue status" });
  }
});

// -------------------------------------------------------------
// JOIN QUEUE (Cloud SQL PostgreSQL)
// -------------------------------------------------------------
router.post("/queue/join", async (req, res) => {
  try {
    const input = JoinQueueBody.parse(req.body);
    const studentId =
      input.studentId ||
      req.header("x-acims-user-id") ||
      "student-20418";

    const bus = await getDbBusById(input.busId);
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }

    const result = await joinDbQueue(input.busId, studentId, input.boardingStop);

    if (result.duplicate) {
      return res.status(409).json({
        error: "Student is already in the queue for this bus",
        status: {
          busId: bus.id,
          busNumber: bus.busNumber,
          joined: true,
          queueSize: result.status.queueSize,
          entry: result.status.entry
            ? {
                studentId: result.status.entry.studentId,
                boardingStop: result.status.entry.boardingStop,
                queuePosition: result.status.queuePosition ?? 1,
                joinedAt: result.status.entry.joinedAt?.toISOString() || new Date().toISOString(),
              }
            : null,
          seatsAvailable: 45,
          currentOccupancy: 0,
          estimatedAvailabilityMinutes: Math.max(2, (result.status.queuePosition || 1) * 3),
          message: `You are already registered in line at position #${result.status.queuePosition}.`,
        },
      });
    }

    const responseStatus = {
      busId: bus.id,
      busNumber: bus.busNumber,
      joined: true,
      queueSize: result.status.queueSize,
      entry: {
        studentId: result.entry.studentId,
        boardingStop: result.entry.boardingStop,
        queuePosition: result.status.queuePosition ?? 1,
        joinedAt: result.entry.joinedAt?.toISOString() || new Date().toISOString(),
      },
      seatsAvailable: 45,
      currentOccupancy: 0,
      estimatedAvailabilityMinutes: Math.max(2, (result.status.queuePosition || 1) * 3),
      message: `Place confirmed at #${result.status.queuePosition} for boarding at ${result.entry.boardingStop}.`,
    };

    res.status(201).json(responseStatus);
  } catch (err: any) {
    console.error("Error joining queue:", err);
    res.status(400).json({ error: "Failed to join queue" });
  }
});

// -------------------------------------------------------------
// LEAVE QUEUE (Cloud SQL PostgreSQL)
// -------------------------------------------------------------
router.post("/queue/leave", async (req, res) => {
  try {
    const input = LeaveQueueBody.parse(req.body);
    const studentId =
      input.studentId ||
      req.header("x-acims-user-id") ||
      "student-20418";

    const bus = await getDbBusById(input.busId);
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }

    const updatedStatus = await leaveDbQueue(input.busId, studentId);

    res.json({
      busId: bus.id,
      busNumber: bus.busNumber,
      joined: false,
      queueSize: updatedStatus.queueSize,
      entry: null,
      seatsAvailable: 45,
      currentOccupancy: 0,
      estimatedAvailabilityMinutes: 0,
      message: "You have left the boarding queue.",
    });
  } catch (err: any) {
    console.error("Error leaving queue:", err);
    res.status(500).json({ error: "Failed to leave queue" });
  }
});

// -------------------------------------------------------------
// GET STUDENT'S ACTIVE QUEUE
// -------------------------------------------------------------
router.get("/queue/my-active", async (req, res) => {
  try {
    const studentId =
      (req.query.studentId as string) ||
      req.header("x-acims-user-id") ||
      "student-20418";

    const activeQueue = await getDbStudentActiveQueue(studentId);
    if (!activeQueue) {
      return res.json({ inQueue: false, queue: null });
    }

    const bus = await getDbBusById(activeQueue.busId);

    res.json({
      inQueue: true,
      queue: {
        ...activeQueue,
        busNumber: bus?.busNumber || "12",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch student active queue" });
  }
});

export default router;
