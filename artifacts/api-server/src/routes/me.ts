import { Router, type Request, type Response, type IRouter } from "express";
import {
  getProfileWithDetails,
  getDbBusById,
  getDbRouteById,
  getLatestBusLocation,
  isBusTrackingActive,
  getDbStudentActiveQueue,
  getDbStudentPreferences,
  upsertDbStudentPreferences,
  recordStudentLocation,
  getLatestStudentLocation,
  getDbStopsByRoute,
} from "../../../../src/db/services.ts";
import { haversineDistance, calculateEtaMinutes, formatEta } from "../services/eta";

const router: IRouter = Router();

function getRequesterUserId(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    if (token.startsWith("campus-token-")) {
      const parts = token.split("-");
      if (parts.length >= 3) {
        return parts[2];
      }
    }
  }
  return (
    req.header("x-acims-user-id") ||
    (req.query.studentId as string) ||
    (req.body?.studentId as string) ||
    "student-20418"
  );
}

// -------------------------------------------------------------
// GET /api/me: Complete Authenticated Student State
// -------------------------------------------------------------
router.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = getRequesterUserId(req);
    const profile = await getProfileWithDetails(userId);

    if (!profile) {
      return res.status(404).json({ error: "Student profile not found", userId });
    }

    const assignedBusId = profile.assignedBusId || "bus-12";
    const assignedRouteId = profile.assignedRouteId || "route-bus-12";

    const [bus, route, activeQueue, preferences, lastLoc] = await Promise.all([
      getDbBusById(assignedBusId),
      getDbRouteById(assignedRouteId),
      getDbStudentActiveQueue(userId),
      getDbStudentPreferences(userId),
      getLatestStudentLocation(userId),
    ]);

    res.json({
      student: {
        id: profile.id,
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        registerNumber: profile.registerNumber || "REG-20418",
        pickupStopId: profile.pickupStopId || preferences?.savedPickupStopId || "tambaram",
        assignedBusId,
        assignedRouteId,
      },
      assignedBus: bus
        ? {
            id: bus.id,
            busNumber: bus.busNumber,
            active: bus.active,
          }
        : null,
      assignedRoute: route
        ? {
            id: route.id,
            name: route.routeName,
            code: route.routeCode,
            stopsCount: route.stops?.length || 0,
          }
        : null,
      queue: activeQueue,
      preferences: preferences || {
        userId,
        savedPickupStopId: profile.pickupStopId || "tambaram",
        preferredBusId: assignedBusId,
        savedDestinationName: null,
        savedDestinationLat: null,
        savedDestinationLng: null,
      },
      lastLocation: lastLoc,
    });
  } catch (err: any) {
    console.error("Error in /api/me:", err);
    res.status(500).json({ error: "Failed to load student context" });
  }
});

// -------------------------------------------------------------
// GET /api/me/bus: Personalized "My Bus" with Live Telemetry
// -------------------------------------------------------------
router.get("/me/bus", async (req: Request, res: Response) => {
  try {
    const userId = getRequesterUserId(req);
    const profile = await getProfileWithDetails(userId);
    const prefs = await getDbStudentPreferences(userId);

    const busId = prefs?.preferredBusId || profile?.assignedBusId || "bus-12";
    const bus = await getDbBusById(busId);

    if (!bus) {
      return res.status(404).json({
        status: "NOT_ASSIGNED",
        message: "My bus is not assigned.",
        bus: null,
      });
    }

    const routeId = bus.routeId || profile?.assignedRouteId || "route-bus-12";
    const route = await getDbRouteById(routeId);
    const stops = await getDbStopsByRoute(routeId);
    const latestLoc = await getLatestBusLocation(bus.id);
    const isTracking = await isBusTrackingActive(bus.id);

    if (!latestLoc) {
      return res.json({
        status: "NO_GPS",
        message: "Bus location is currently unavailable.",
        bus: {
          id: bus.id,
          busNumber: bus.busNumber,
          routeLabel: route?.routeName || "Campus Shuttle",
          origin: stops[0]?.stopName || "Terminal",
          destination: stops[stops.length - 1]?.stopName || "Campus",
          active: bus.active,
          telemetry: {
            latitude: stops[0]?.latitude || 12.9287,
            longitude: stops[0]?.longitude || 80.132,
            nextStop: stops[0]?.stopName || "Terminal",
            isLive: false,
            freshness: "UNAVAILABLE",
            etaLabel: "UNAVAILABLE",
            formattedEta: "Unavailable",
            speed: 0,
            status: isTracking ? "Driver Active · Awaiting GPS" : "Tracking Stopped",
            updatedAt: null,
          },
        },
      });
    }

    const recordedDate = new Date(latestLoc.recordedAt || Date.now());
    const diffSec = Math.max(0, Math.floor((Date.now() - recordedDate.getTime()) / 1000));

    let freshness: "LIVE" | "STALE" | "UNAVAILABLE" = "UNAVAILABLE";
    if (diffSec <= 45 && isTracking) {
      freshness = "LIVE";
    } else if (diffSec <= 180) {
      freshness = "STALE";
    } else {
      freshness = "UNAVAILABLE";
    }

    // Determine next stop along route
    let closestIndex = 0;
    let minDistance = Infinity;

    stops.forEach((stop, idx) => {
      const dist = haversineDistance(
        { latitude: latestLoc.latitude, longitude: latestLoc.longitude },
        { latitude: stop.latitude, longitude: stop.longitude }
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    const isAtStop = minDistance <= 0.08;
    const nextStopIndex = isAtStop ? Math.min(closestIndex + 1, stops.length - 1) : closestIndex;
    const nextStopObj = stops[nextStopIndex] || stops[0];

    const distToNextStop = haversineDistance(
      { latitude: latestLoc.latitude, longitude: latestLoc.longitude },
      { latitude: nextStopObj?.latitude || latestLoc.latitude, longitude: nextStopObj?.longitude || latestLoc.longitude }
    );

    const speed = latestLoc.speed && latestLoc.speed > 3 ? latestLoc.speed : 22;
    const etaMinutes = calculateEtaMinutes(
      { latitude: latestLoc.latitude, longitude: latestLoc.longitude },
      { latitude: nextStopObj?.latitude || latestLoc.latitude, longitude: nextStopObj?.longitude || latestLoc.longitude },
      speed
    );

    res.json({
      status: "SUCCESS",
      bus: {
        id: bus.id,
        busNumber: bus.busNumber,
        routeLabel: route?.routeName || "Campus Shuttle",
        origin: stops[0]?.stopName || "Terminal",
        destination: stops[stops.length - 1]?.stopName || "Campus",
        active: bus.active,
        telemetry: {
          latitude: latestLoc.latitude,
          longitude: latestLoc.longitude,
          nextStop: nextStopObj?.stopName || "Campus",
          nextStopId: nextStopObj?.id,
          isAtStop,
          isLive: freshness === "LIVE",
          freshness,
          etaLabel: freshness === "LIVE" ? "LIVE ETA" : freshness === "STALE" ? "ESTIMATED ETA" : "UNAVAILABLE",
          etaMinutes: isAtStop ? 0 : etaMinutes,
          formattedEta: isAtStop ? "Arriving now" : formatEta(etaMinutes),
          speed: latestLoc.speed || 0,
          heading: latestLoc.heading || 0,
          accuracy: latestLoc.accuracy || 10,
          remainingDistanceKm: Number(distToNextStop.toFixed(2)),
          status: isAtStop
            ? `At Stop: ${nextStopObj?.stopName}`
            : freshness === "LIVE"
            ? `In Transit to ${nextStopObj?.stopName}`
            : freshness === "STALE"
            ? `Signal Delayed · Last near ${nextStopObj?.stopName}`
            : `Tracking Inactive`,
          updatedAt: recordedDate.toISOString(),
        },
      },
    });
  } catch (err: any) {
    console.error("Error fetching personalized bus:", err);
    res.status(500).json({ error: "Failed to fetch student bus" });
  }
});

// -------------------------------------------------------------
// POST /api/me/location: Store Student Real GPS
// -------------------------------------------------------------
router.post("/me/location", async (req: Request, res: Response) => {
  try {
    const userId = getRequesterUserId(req);
    const { latitude, longitude, accuracy } = req.body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "Valid latitude and longitude required" });
    }

    const recorded = await recordStudentLocation({
      userId,
      latitude,
      longitude,
      accuracy: typeof accuracy === "number" ? accuracy : undefined,
    });

    res.json({
      success: true,
      location: recorded,
    });
  } catch (err: any) {
    console.error("Error recording student location:", err);
    res.status(500).json({ error: "Failed to save location" });
  }
});

// -------------------------------------------------------------
// GET /api/me/location: Retrieve Latest Student GPS
// -------------------------------------------------------------
router.get("/me/location", async (req: Request, res: Response) => {
  try {
    const userId = getRequesterUserId(req);
    const loc = await getLatestStudentLocation(userId);

    if (!loc) {
      return res.status(404).json({ error: "No location recorded yet", location: null });
    }

    res.json({ location: loc });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get student location" });
  }
});

// -------------------------------------------------------------
// GET /api/me/preferences: Retrieve Student Preferences
// -------------------------------------------------------------
router.get("/me/preferences", async (req: Request, res: Response) => {
  try {
    const userId = getRequesterUserId(req);
    const prefs = await getDbStudentPreferences(userId);
    res.json({ preferences: prefs });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get student preferences" });
  }
});

// -------------------------------------------------------------
// PUT /api/me/preferences: Update Student Preferences & Destination
// -------------------------------------------------------------
router.put("/me/preferences", async (req: Request, res: Response) => {
  try {
    const userId = getRequesterUserId(req);
    const {
      savedPickupStopId,
      preferredBusId,
      savedDestinationName,
      savedDestinationLat,
      savedDestinationLng,
      notificationArrivals,
      notificationDelays,
    } = req.body;

    const updated = await upsertDbStudentPreferences(userId, {
      savedPickupStopId,
      preferredBusId,
      savedDestinationName,
      savedDestinationLat: typeof savedDestinationLat === "number" ? savedDestinationLat : undefined,
      savedDestinationLng: typeof savedDestinationLng === "number" ? savedDestinationLng : undefined,
      notificationArrivals,
      notificationDelays,
    });

    res.json({ success: true, preferences: updated });
  } catch (err: any) {
    console.error("Error updating preferences:", err);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// -------------------------------------------------------------
// GET /api/me/queue: Retrieve Student Active Queue Position
// -------------------------------------------------------------
router.get("/me/queue", async (req: Request, res: Response) => {
  try {
    const userId = getRequesterUserId(req);
    const active = await getDbStudentActiveQueue(userId);
    res.json({ inQueue: Boolean(active), queue: active });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get student queue" });
  }
});

export default router;
