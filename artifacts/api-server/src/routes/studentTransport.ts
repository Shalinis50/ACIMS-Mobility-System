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

router.post("/student/nearest-buses", async (req, res) => {
  try {
    const { latitude, longitude, pickupStopId } = req.body as {
      latitude?: number;
      longitude?: number;
      pickupStopId?: string;
    };

    const { getDbBuses, getDbRoutes } = await import("../../../../src/db/services.ts");
    const { busStops, officialPickupPoints } = await import("../../../../src/db/schema.ts");
    const { haversineDistanceKm } = await import("../services/gpsEngine.ts");

    const [allBuses, allRoutes, allStops, allPickups] = await Promise.all([
      getDbBuses(),
      getDbRoutes(),
      db.select().from(busStops),
      db.select().from(officialPickupPoints).where(eq(officialPickupPoints.active, true)),
    ]);

    type BusOption = {
      busId: string;
      busNumber: string;
      routeName: string;
      displayName: string;
      pickupStopName: string;
      pickupStopId: string;
      scheduledTime: string;
      distanceKm: number | null;
      latitude: number | null;
      longitude: number | null;
    };

    const options: BusOption[] = [];

    for (const b of allBuses.filter((item) => item.active)) {
      const route = allRoutes.find((r) => r.id === b.routeId);
      const routeName = route ? route.routeName.replace(/^\d+[A-Z]?\s*·?\s*/i, "") : "CAMPUS";
      const displayName = `BUS ${b.busNumber} · ${routeName.toUpperCase()}`;

      // Find route stops
      const rStops = allStops.filter((s) => s.routeId === b.routeId);
      const rPickups = allPickups.filter((p) => p.routeId === b.routeId);

      let bestStop: { name: string; id: string; time: string; distanceKm: number | null; lat: number | null; lng: number | null } | null = null;

      if (pickupStopId) {
        const matchingPickup = rPickups.find((p) => p.id === pickupStopId || p.stopName.toLowerCase() === pickupStopId.toLowerCase());
        if (matchingPickup) {
          bestStop = {
            name: matchingPickup.stopName,
            id: matchingPickup.id,
            time: matchingPickup.scheduledTimeDisplay || "Scheduled",
            distanceKm: null,
            lat: matchingPickup.latitude ?? null,
            lng: matchingPickup.longitude ?? null,
          };
        }
      }

      if (!bestStop && latitude != null && longitude != null) {
        let minD = Infinity;
        for (const s of rStops) {
          if (s.latitude != null && s.longitude != null) {
            const d = haversineDistanceKm(
              { latitude, longitude },
              { latitude: s.latitude, longitude: s.longitude }
            );
            if (d < minD) {
              minD = d;
              const matchingPickup = rPickups.find((p) => p.stopName.toLowerCase() === s.stopName.toLowerCase());
              bestStop = {
                name: s.stopName,
                id: s.id,
                time: matchingPickup?.scheduledTimeDisplay || "Scheduled",
                distanceKm: Number(d.toFixed(1)),
                lat: s.latitude,
                lng: s.longitude,
              };
            }
          }
        }
      }

      if (!bestStop) {
        const first = rPickups[0] || rStops[0];
        if (first) {
          bestStop = {
            name: "stopName" in first ? first.stopName : "Campus Stop",
            id: first.id,
            time: "scheduledTimeDisplay" in first ? (first.scheduledTimeDisplay || "Scheduled") : "Scheduled",
            distanceKm: null,
            lat: first.latitude ?? null,
            lng: first.longitude ?? null,
          };
        }
      }

      if (bestStop) {
        options.push({
          busId: b.id,
          busNumber: b.busNumber,
          routeName: routeName.toUpperCase(),
          displayName,
          pickupStopName: bestStop.name,
          pickupStopId: bestStop.id,
          scheduledTime: bestStop.time,
          distanceKm: bestStop.distanceKm,
          latitude: bestStop.lat,
          longitude: bestStop.lng,
        });
      }
    }

    if (latitude != null && longitude != null) {
      options.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    res.json({
      nearest: options.slice(0, 3),
      all: options,
    });
  } catch (err: any) {
    console.error("[student/nearest-buses]", err);
    res.status(500).json({ error: "Failed to rank nearest buses" });
  }
});

router.post("/student/select-bus", async (req, res) => {
  try {
    const studentId = resolveStudentId(req as AuthRequest) || (req.body as { studentId?: string })?.studentId || "student-20418";
    const { busId, pickupStopId } = req.body as { busId: string; pickupStopId?: string };

    if (!busId) {
      return res.status(400).json({ error: "busId is required" });
    }

    const { getDbBusById, getProfileWithDetails } = await import("../../../../src/db/services.ts");
    const { students } = await import("../../../../src/db/schema.ts");
    const bus = await getDbBusById(busId);

    const profile = await getProfileWithDetails(studentId);
    if (profile) {
      await db
        .update(students)
        .set({
          assignedBusId: busId,
          assignedRouteId: bus?.routeId || `route-${busId}`,
          ...(pickupStopId ? { pickupStopId } : {}),
        })
        .where(eq(students.profileId, profile.id));

      await db
        .update(studentPreferences)
        .set({
          preferredBusId: busId,
          ...(pickupStopId ? { savedPickupStopId: pickupStopId } : {}),
          updatedAt: new Date(),
        })
        .where(eq(studentPreferences.userId, studentId));
    }

    res.json({
      success: true,
      assignedBusId: busId,
      assignedRouteId: bus?.routeId || `route-${busId}`,
      pickupStopId,
      message: `Selected Bus #${bus?.busNumber || busId}`,
    });
  } catch (err: any) {
    console.error("[student/select-bus]", err);
    res.status(500).json({ error: "Failed to select bus" });
  }
});

export default router;
