import { Router, type IRouter } from "express";
import {
  assignShift,
  createShift,
  getMobilityAnalyticsSummary,
  getTripHistory,
  listPickupPoints,
  listShiftAssignments,
  listShifts,
  upsertPickupPoint,
} from "../../../../src/db/mobilityOps.ts";
import { updateStudentPickupPoint } from "../services/pickupPointService.ts";
import { calculatePickupEta } from "../services/pickupEtaEngine.ts";
import { assessTripDelay } from "../services/delayEngine.ts";
import { getLatestBusLocation, getDbBusById } from "../../../../src/db/services.ts";
import { getCommandCenterSnapshot } from "../services/commandCenterService.ts";
import { requireAdmin, requireAuth } from "../middleware/acimsAuth.ts";
import type { AuthRequest } from "../../../../src/middleware/auth.ts";
import { recordAdminAudit } from "../services/adminPortalService.ts";
import { getActiveShiftsForStudents, directionLabel, formatShiftTimeDisplay } from "../../../../src/db/shiftManagement.ts";
import { getBusShiftTimingContext } from "../services/shiftTiming.ts";

const router: IRouter = Router();

router.get("/mobility/shifts", async (_req, res) => {
  res.json(await listShifts());
});

/** Student-facing daily shift schedule (active, DB-backed). */
router.get("/mobility/daily-shifts", async (_req, res) => {
  const rows = await getActiveShiftsForStudents();
  res.json(
    rows.map((s) => ({
      id: s.id,
      shiftType: s.shiftType,
      name: s.name,
      slotTime: (s as any).slotTime || formatShiftTimeDisplay(s.startTime),
      startTime: s.startTime,
      endTime: s.endTime,
      startTimeDisplay: formatShiftTimeDisplay(s.startTime),
      endTimeDisplay: formatShiftTimeDisplay(s.endTime),
      direction: s.direction,
      directionLabel: (s as any).directionLabel || directionLabel(s.direction),
      operatingDays: s.operatingDays,
      examOnly: (s as any).examOnly,
      assignedBuses: (s as any).assignedBuses || [],
    })),
  );
});

router.post("/mobility/shifts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const shift = await createShift(req.body);
    const authUser = (req as AuthRequest).user as { uid?: string };
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "CREATE_SHIFT",
      entityType: "shift",
      entityId: shift.id,
      detail: shift.name,
    });
    res.status(201).json(shift);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create shift" });
  }
});

router.get("/mobility/shift-assignments", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await listShiftAssignments());
});

router.post("/mobility/shift-assignments", requireAuth, requireAdmin, async (req, res) => {
  try {
    const assignment = await assignShift(req.body);
    const authUser = (req as AuthRequest).user as { uid?: string };
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "ASSIGN_SHIFT",
      entityType: "shift_assignment",
      entityId: assignment.id,
      detail: `bus=${assignment.busId} driver=${assignment.driverId}`,
    });
    res.status(201).json(assignment);
  } catch (err: any) {
    res.status(409).json({ error: err.message || "Assignment conflict" });
  }
});

router.get("/mobility/pickup-points", async (req, res) => {
  const routeId = typeof req.query.routeId === "string" ? req.query.routeId : undefined;
  res.json(await listPickupPoints(routeId));
});

router.post("/mobility/pickup-points", requireAuth, requireAdmin, async (req, res) => {
  try {
    const point = await upsertPickupPoint(req.body);
    res.status(201).json(point);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to save pickup point" });
  }
});

router.put("/mobility/students/:studentId/pickup-point", requireAuth, async (req, res) => {
  const { studentId } = req.params;
  const authUser = (req as AuthRequest).user as { uid?: string; role?: string };
  const role = String(authUser?.role || req.header("x-acims-role") || "").toUpperCase();
  if (role !== "ADMIN" && authUser?.uid && authUser.uid !== studentId) {
    res.status(403).json({ error: "Cannot change another student's pickup point" });
    return;
  }
  const { pickupPointId } = req.body;
  if (!pickupPointId) return res.status(400).json({ error: "pickupPointId required" });
  try {
    const updated = await updateStudentPickupPoint(studentId, pickupPointId);
    if (!updated) return res.status(404).json({ error: "Student not found" });
    res.json({ ...updated, message: "Pickup point updated successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update pickup point";
    res.status(400).json({ error: message });
  }
});

router.get("/mobility/eta/pickup", requireAuth, async (req, res) => {
  const authUser = (req as AuthRequest).user as { uid?: string };
  const studentId = authUser?.uid || req.header("x-acims-user-id");
  if (studentId) {
    const { computeStudentPickupEta } = await import("../services/etaService.ts");
    const personalized = await computeStudentPickupEta(studentId);
    if (personalized) {
      return res.json({
        busId: personalized.busId,
        busNumber: personalized.busNumber,
        pickupStopId: personalized.pickup.id,
        pickupStopName: personalized.pickup.name,
        etaMinutes: personalized.etaMinutes,
        formattedEta: personalized.formattedEta,
        remainingDistanceKm: personalized.remainingDistanceKm,
        delay: personalized.delay,
        gpsStatus: personalized.gps.status,
        stopPassed: personalized.stopPassed,
      });
    }
  }

  const busId = typeof req.query.busId === "string" ? req.query.busId : undefined;
  const pickupStopId = typeof req.query.pickupStopId === "string" ? req.query.pickupStopId : undefined;
  if (!busId || !pickupStopId) {
    return res.status(400).json({ error: "Configure pickup point or pass busId and pickupStopId" });
  }
  const bus = await getDbBusById(busId);
  const loc = await getLatestBusLocation(busId);
  if (!loc) return res.status(404).json({ error: "No GPS for bus" });
  const speedKmh = loc.speed != null && loc.speed > 0.5 ? loc.speed * 3.6 : undefined;
  const eta = calculatePickupEta(
    busId,
    { latitude: loc.latitude, longitude: loc.longitude },
    pickupStopId,
    { speedKmh },
  );
  if (!eta) return res.status(404).json({ error: "Could not compute pickup ETA" });
  const shiftCtx = await getBusShiftTimingContext(busId);
  const delay = shiftCtx
    ? assessTripDelay({
        busId,
        shiftStartTime: shiftCtx.shiftStartTime,
        pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
        currentEtaToPickupMinutes: eta.etaMinutes,
      })
    : { delayMinutes: 0, status: "ON_TIME" };
  res.json({ busId, busNumber: bus?.busNumber, ...eta, delay });
});

router.get("/mobility/command-center", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await getCommandCenterSnapshot());
});

router.get("/mobility/trips/history", requireAuth, requireAdmin, async (req, res) => {
  const limit = Number(req.query.limit || 50);
  res.json(await getTripHistory(Math.min(200, Math.max(1, limit))));
});

router.get("/mobility/analytics/summary", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await getMobilityAnalyticsSummary());
});

export default router;
