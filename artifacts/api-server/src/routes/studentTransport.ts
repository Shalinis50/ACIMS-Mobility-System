import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/acimsAuth.ts";
import type { AuthRequest } from "../../../../src/middleware/auth.ts";
import {
  getStudentPickupPoint,
  updateStudentPickupPoint,
  listPickupPointsForStudentRoute,
} from "../services/pickupPointService.ts";
import { computeStudentPickupEta } from "../services/etaService.ts";
import { db } from "../../../../src/db/index.ts";
import { studentPreferences } from "../../../../src/db/schema.ts";
import { getUserNotifications } from "../../../../src/db/services.ts";

const router: IRouter = Router();

function resolveStudentId(req: AuthRequest): string | null {
  const uid = (req.user as { uid?: string } | undefined)?.uid;
  return uid || req.header("x-acims-user-id") || null;
}

router.get("/student/pickup-point", requireAuth, async (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const pickup = await getStudentPickupPoint(studentId);
  if (!pickup) return res.status(404).json({ error: "Pickup point not configured" });
  res.json(pickup);
});

router.put("/student/pickup-point", requireAuth, async (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const { pickupPointId } = req.body as { pickupPointId?: string };
  if (!pickupPointId) return res.status(400).json({ error: "pickupPointId required" });
  try {
    const updated = await updateStudentPickupPoint(studentId, pickupPointId);
    res.json({
      ...updated,
      message: `Pickup point updated successfully.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update pickup point";
    res.status(400).json({ error: message });
  }
});

router.get("/student/pickup-point/options", requireAuth, async (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const options = await listPickupPointsForStudentRoute(studentId);
  res.json(options);
});

router.get("/student/my-bus", requireAuth, async (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) {
    return res.status(404).json({
      error: "No active transport assignment or pickup point. Complete transport setup first.",
    });
  }
  res.json({
    busId: eta.busId,
    busNumber: eta.busNumber,
    tripId: eta.tripId,
    pickup: eta.pickup,
    routeLabel: eta.routeLabel,
    directionLabel: eta.directionLabel,
    status: eta.delay?.status ?? (eta.gps.status === "LIVE" ? "ON_TIME" : "UNKNOWN"),
    delayMinutes: eta.delay?.delayMinutes ?? 0,
    scheduledArrival: eta.scheduledArrivalAt,
    predictedArrival: eta.predictedArrivalAt,
    arrivingInMinutes: eta.etaMinutes,
    arrivingInLabel: eta.formattedEta,
    stopPassed: eta.stopPassed,
    gps: eta.gps,
  });
});

router.get("/student/my-bus/eta", requireAuth, async (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) return res.status(404).json({ error: "ETA unavailable" });
  res.json(eta);
});

router.get("/student/my-bus/status", requireAuth, async (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) return res.status(404).json({ error: "Status unavailable" });
  res.json({
    busNumber: eta.busNumber,
    delayStatus: eta.delay?.status ?? "ON_TIME",
    delayMinutes: eta.delay?.delayMinutes ?? 0,
    gpsStatus: eta.gps.status,
    lastGpsUpdate: eta.gps.lastUpdateAt,
    etaMinutes: eta.etaMinutes,
    stopPassed: eta.stopPassed,
  });
});

router.get("/student/notifications", requireAuth, async (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const dbNotifs = await getUserNotifications(studentId);
  res.json(
    dbNotifs.map((n) => ({
      id: String(n.id),
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
      read: Boolean(n.readAt),
    })),
  );
});

router.get("/student/notification-preferences", requireAuth, async (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const pref = await db.select().from(studentPreferences).where(eq(studentPreferences.userId, studentId)).limit(1);
  const p = pref[0];
  res.json({
    arrivalReminders10Min: p?.notificationArrivals ?? true,
    arrivalReminders5Min: p?.notificationArrivals ?? true,
    delayAlerts: p?.notificationDelays ?? true,
    busArrived: p?.notificationArrivals ?? true,
    gpsUnavailable: true,
  });
});

router.put("/student/notification-preferences", requireAuth, async (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const body = req.body as {
    arrivalReminders10Min?: boolean;
    arrivalReminders5Min?: boolean;
    delayAlerts?: boolean;
    busArrived?: boolean;
  };
  const arrivals =
    body.arrivalReminders10Min ?? body.arrivalReminders5Min ?? body.busArrived ?? true;
  const delays = body.delayAlerts ?? true;

  const existing = await db.select().from(studentPreferences).where(eq(studentPreferences.userId, studentId)).limit(1);
  if (existing.length) {
    await db
      .update(studentPreferences)
      .set({
        notificationArrivals: arrivals,
        notificationDelays: delays,
        updatedAt: new Date(),
      })
      .where(eq(studentPreferences.userId, studentId));
  } else {
    await db.insert(studentPreferences).values({
      userId: studentId,
      notificationArrivals: arrivals,
      notificationDelays: delays,
    });
  }
  res.json({ success: true });
});

export default router;
