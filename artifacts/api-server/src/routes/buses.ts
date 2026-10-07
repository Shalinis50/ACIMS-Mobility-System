import { Router, type IRouter } from "express";
import {
  getDbBuses,
  getDbBusById,
  getDbStopsByRoute,
  recordBusLocation,
  getLatestBusLocation,
  getRecentBusLocations,
  startTrackingSession,
  pauseTrackingSession,
  resumeTrackingSession,
  stopTrackingSession,
  getBusTrackingSession,
  isBusTrackingActive,
  verifyDriverBusAssignment,
} from "../../../../src/db/services.ts";
import { getRouteForBus } from "../services/routesData";
import {
  validateGpsCoordinate,
  evaluateFreshness,
  calculateNextStopAndEta,
  haversineDistanceKm,
  type ComputedTelemetry,
  type RouteStopInfo,
} from "../services/gpsEngine";
import { realtimeHub } from "../services/realtimeHub";
import { processMobilityTelemetry } from "../services/mobilityPipeline";
import { requireAuth, requireDriver } from "../middleware/acimsAuth.ts";
import { getActiveTripForBus, startTripFromDriverSession, completeActiveTrip } from "../../../../src/db/mobilityOps.ts";

const router: IRouter = Router();

/**
 * Builds real computed telemetry for a bus using verified database GPS, route stops, and session state
 */
export async function buildBusTelemetry(busId: string): Promise<ComputedTelemetry> {
  const bus = await getDbBusById(busId);
  const busNumber = bus?.busNumber || busId.replace("bus-", "");
  const routeDef = getRouteForBus(busId);
  const routeId = bus?.routeId || routeDef?.id || `route-${busId}`;
  
  // 1. Fetch real stops from Cloud SQL
  const dbStops = await getDbStopsByRoute(routeId);
  const stops: RouteStopInfo[] =
    dbStops.length > 0
      ? dbStops.map((s, idx) => ({
          id: s.id,
          name: s.stopName,
          sequence: s.sequenceNumber,
          latitude: s.latitude,
          longitude: s.longitude,
          minutesFromPrevious: idx === 0 ? 0 : 3,
        }))
      : (routeDef?.stops || []).map((s: any, idx: number) => ({
          id: s.id || `stop-${idx}`,
          name: s.name || s.stopName || `Stop ${idx + 1}`,
          sequence: s.sequence ?? idx,
          latitude: s.latitude,
          longitude: s.longitude,
          minutesFromPrevious: s.minutesFromPrevious || (idx === 0 ? 0 : 3),
        }));

  // 2. Fetch latest verified GPS coordinate from bus_locations
  const latestLoc = await getLatestBusLocation(busId);

  // 3. Check active tracking session state
  const trackingState = await isBusTrackingActive(busId);

  // 4. Calculate centralized freshness based on driver device timestamp
  const { freshness, secondsAgo } = evaluateFreshness(
    latestLoc?.recordedAt || null,
    trackingState.status
  );

  // 5. If no location has ever been transmitted, return honest unverified/unavailable state
  if (!latestLoc) {
    const firstStop = stops[0]?.name || "Campus Depot";
    return {
      busId,
      busNumber,
      driverId: bus?.driverId || undefined,
      latitude: stops[0]?.latitude || 12.9287,
      longitude: stops[0]?.longitude || 80.132,
      accuracy: null,
      speed: null,
      heading: null,
      bearing: null,
      altitude: null,
      timestamp: 0,
      nextStop: firstStop,
      nextStopId: stops[0]?.id || "depot",
      isAtStop: false,
      isApproachingStop: false,
      stopSequenceIndex: 0,
      etaMinutes: 0,
      formattedEta: "Unavailable",
      etaLabel: "UNAVAILABLE",
      etaConfidence: "UNAVAILABLE",
      remainingDistanceKm: 0,
      status: trackingState.isActive
        ? "Driver Active · Waiting for GPS"
        : trackingState.isPaused
        ? "Tracking Paused"
        : "Tracking Standby · No Active Trip",
      freshness: "UNAVAILABLE",
      isLive: false,
      trackingStatus: trackingState.status,
      recordedAt: new Date(0).toISOString(),
      receivedAt: new Date(0).toISOString(),
      networkDelayMs: 0,
      secondsAgo: Infinity,
      quality: "INVALID",
      source: "unverified",
    };
  }

  // 6. Compute Next Stop and ETA using real GPS and route sequence
  const nextStopInfo = calculateNextStopAndEta(
    {
      latitude: latestLoc.latitude,
      longitude: latestLoc.longitude,
      speed: latestLoc.speed,
    },
    stops,
    freshness
  );

  const recordedDate = new Date(latestLoc.recordedAt);
  const receivedDate = new Date(latestLoc.receivedAt || latestLoc.recordedAt);
  const networkDelayMs = Math.max(0, receivedDate.getTime() - recordedDate.getTime());

  let displayStatus = nextStopInfo.statusText;
  if (trackingState.isPaused) {
    displayStatus = `Tracking Paused · Last near ${nextStopInfo.nextStop}`;
  } else if (!trackingState.isActive && freshness !== "LIVE") {
    displayStatus = `Trip Concluded · Last at ${nextStopInfo.nextStop}`;
  }

  let pathIndex = nextStopInfo.stopSequenceIndex * 6;
  if (routeDef?.path && routeDef.path.length > 0) {
    let minPathDist = Infinity;
    routeDef.path.forEach((pt, idx) => {
      const dist = haversineDistanceKm(
        { latitude: latestLoc.latitude, longitude: latestLoc.longitude },
        { latitude: pt.latitude, longitude: pt.longitude }
      );
      if (dist < minPathDist) {
        minPathDist = dist;
        pathIndex = idx;
      }
    });
  }

  return {
    busId,
    busNumber,
    driverId: latestLoc.driverId || bus?.driverId || undefined,
    latitude: latestLoc.latitude,
    longitude: latestLoc.longitude,
    accuracy: latestLoc.accuracy,
    speed: latestLoc.speed,
    heading: latestLoc.heading,
    bearing: latestLoc.heading,
    altitude: latestLoc.altitude,
    timestamp: recordedDate.getTime(),
    nextStop: nextStopInfo.nextStop,
    nextStopId: nextStopInfo.nextStopId,
    previousStop: nextStopInfo.previousStop,
    previousStopId: nextStopInfo.previousStopId,
    isAtStop: nextStopInfo.isAtStop,
    isApproachingStop: nextStopInfo.isApproachingStop,
    stopSequenceIndex: nextStopInfo.stopSequenceIndex,
    etaMinutes: nextStopInfo.etaMinutes,
    formattedEta: nextStopInfo.formattedEta,
    etaLabel: nextStopInfo.etaLabel,
    etaConfidence: nextStopInfo.etaConfidence,
    remainingDistanceKm: nextStopInfo.remainingDistanceKm,
    status: displayStatus,
    freshness,
    isLive: freshness === "LIVE",
    trackingStatus: trackingState.status,
    recordedAt: recordedDate.toISOString(),
    receivedAt: receivedDate.toISOString(),
    networkDelayMs,
    secondsAgo,
    quality: latestLoc.accuracy && latestLoc.accuracy <= 15 ? "HIGH" : latestLoc.accuracy && latestLoc.accuracy <= 40 ? "ACCEPTABLE" : "POOR",
    source: "real-device-gps",
    pathIndex,
  };
}

// -------------------------------------------------------------
// LIST ALL BUSES
// -------------------------------------------------------------
router.get("/buses", async (_req, res) => {
  try {
    const dbBusesList = await getDbBuses();
    const results = await Promise.all(
      dbBusesList.map(async (bus) => {
        const routeDef = getRouteForBus(bus.id);
        const telemetry = await buildBusTelemetry(bus.id);

        return {
          id: bus.id,
          busNumber: bus.busNumber,
          origin: routeDef?.origin || "Central Campus",
          destination: routeDef?.destination || "City Station",
          routeLabel: routeDef?.name || "Campus Express",
          capacity: 45,
          currentLocation: { latitude: telemetry.latitude, longitude: telemetry.longitude },
          nextStop: telemetry.nextStop,
          nextStopId: telemetry.nextStopId,
          isAtStop: telemetry.isAtStop,
          etaMinutes: telemetry.etaMinutes,
          formattedEta: telemetry.formattedEta,
          etaLabel: telemetry.etaLabel,
          etaConfidence: telemetry.etaConfidence,
          remainingDistanceKm: telemetry.remainingDistanceKm,
          status: telemetry.status,
          updatedAt: telemetry.recordedAt,
          active: bus.active,
          routeId: bus.routeId || routeDef?.id || "route-bus-12",
          driverId: bus.driverId || undefined,
          locationMode: "driver-gps",
          freshness: telemetry.freshness,
          isLive: telemetry.isLive,
          networkDelayMs: telemetry.networkDelayMs,
          secondsAgo: telemetry.secondsAgo,
        };
      })
    );

    res.json(results);
  } catch (err: any) {
    console.error("Error listing buses:", err);
    res.status(500).json({ error: "Failed to list buses" });
  }
});

// -------------------------------------------------------------
// GET SINGLE BUS
// -------------------------------------------------------------
router.get("/buses/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const bus = await getDbBusById(busId);
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }

    const routeDef = getRouteForBus(bus.id);
    const telemetry = await buildBusTelemetry(bus.id);

    res.json({
      id: bus.id,
      busNumber: bus.busNumber,
      origin: routeDef?.origin || "Central Campus",
      destination: routeDef?.destination || "City Station",
      routeLabel: routeDef?.name || "Campus Express",
      capacity: 45,
      currentLocation: { latitude: telemetry.latitude, longitude: telemetry.longitude },
      nextStop: telemetry.nextStop,
      nextStopId: telemetry.nextStopId,
      isAtStop: telemetry.isAtStop,
      etaMinutes: telemetry.etaMinutes,
      formattedEta: telemetry.formattedEta,
      etaLabel: telemetry.etaLabel,
      etaConfidence: telemetry.etaConfidence,
      remainingDistanceKm: telemetry.remainingDistanceKm,
      status: telemetry.status,
      updatedAt: telemetry.recordedAt,
      active: bus.active,
      routeId: bus.routeId || routeDef?.id || "route-bus-12",
      driverId: bus.driverId || undefined,
      locationMode: "driver-gps",
      freshness: telemetry.freshness,
      isLive: telemetry.isLive,
      networkDelayMs: telemetry.networkDelayMs,
      secondsAgo: telemetry.secondsAgo,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get bus" });
  }
});

// -------------------------------------------------------------
// GET BUS LIVE LOCATION (Snapshot)
// -------------------------------------------------------------
router.get("/buses/:busId/location", async (req, res) => {
  try {
    const { busId } = req.params;
    const bus = await getDbBusById(busId);
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }

    const telemetry = await buildBusTelemetry(bus.id);
    res.json(telemetry);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get bus location" });
  }
});

// -------------------------------------------------------------
// REALTIME SSE STREAM (Instant Server-Sent Events push)
// -------------------------------------------------------------
router.get("/realtime/bus/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const bus = await getDbBusById(busId);
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }

    const initialTelemetry = await buildBusTelemetry(busId);
    realtimeHub.subscribeBus(busId, res, initialTelemetry);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to connect to realtime location stream" });
  }
});

router.get("/realtime/buses", async (_req, res) => {
  try {
    const dbBusesList = await getDbBuses();
    const initialFleet = await Promise.all(
      dbBusesList.map((b) => buildBusTelemetry(b.id))
    );
    realtimeHub.subscribeAllBuses(res, initialFleet);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to connect to fleet realtime stream" });
  }
});

// -------------------------------------------------------------
// GET BUS RECENT GPS HISTORY
// -------------------------------------------------------------
router.get("/buses/:busId/history", async (req, res) => {
  try {
    const { busId } = req.params;
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "50", 10)));
    const history = await getRecentBusLocations(busId, limit);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get location history" });
  }
});

// -------------------------------------------------------------
// GET BUS STOPS
// -------------------------------------------------------------
router.get("/buses/:busId/stops", async (req, res) => {
  try {
    const { busId } = req.params;
    const bus = await getDbBusById(busId);
    const routeId = bus?.routeId || `route-${busId}`;
    const dbStops = await getDbStopsByRoute(routeId);

    if (dbStops.length > 0) {
      const formatted = dbStops.map((s, idx) => ({
        id: s.id,
        name: s.stopName,
        sequence: s.sequenceNumber,
        latitude: s.latitude,
        longitude: s.longitude,
        pathIndex: idx * 6,
        minutesFromPrevious: idx === 0 ? 0 : 3,
      }));
      return res.json(formatted);
    }

    const routeDef = getRouteForBus(busId);
    res.json(routeDef?.stops || []);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get stops" });
  }
});

// -------------------------------------------------------------
// GET BUS ROUTE DETAILS
// -------------------------------------------------------------
router.get("/buses/:busId/route", async (req, res) => {
  try {
    const { busId } = req.params;
    const routeDef = getRouteForBus(busId);
    if (!routeDef) {
      return res.status(404).json({ error: "Route not found" });
    }

    const bus = await getDbBusById(busId);
    const routeId = bus?.routeId || routeDef.id;
    const dbStops = await getDbStopsByRoute(routeId);

    const formattedStops =
      dbStops.length > 0
        ? dbStops.map((s, idx) => ({
            id: s.id,
            name: s.stopName,
            sequence: s.sequenceNumber,
            latitude: s.latitude,
            longitude: s.longitude,
            pathIndex: idx * 6,
            minutesFromPrevious: idx === 0 ? 0 : 3,
          }))
        : routeDef.stops;

    const effectivePath =
      routeDef.path && routeDef.path.length > 0
        ? routeDef.path
        : formattedStops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));

    res.json({
      ...routeDef,
      routeId,
      busId,
      busNumber: bus?.busNumber || routeDef.routeNumber || busId.replace("bus-", ""),
      origin: routeDef.origin || formattedStops[0]?.name || "Route Origin",
      destination:
        routeDef.destination ||
        formattedStops[formattedStops.length - 1]?.name ||
        "REC Campus",
      stops: formattedStops,
      path: effectivePath,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get route" });
  }
});

export async function ingestRealDriverGps(params: {
  busId: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  bearing?: number | null;
  timestamp?: number | string;
}): Promise<{
  ok: boolean;
  httpStatus: number;
  telemetry?: ComputedTelemetry;
  validation?: { quality: string; networkDelayMs: number };
  error?: string;
}> {
  const {
    busId,
    driverId = "driver-active",
    latitude,
    longitude,
    accuracy,
    altitude,
    altitudeAccuracy,
    speed,
    heading,
    bearing,
    timestamp,
  } = params;

  const bus = await getDbBusById(busId);
  if (!bus) {
    return { ok: false, httpStatus: 404, error: `Bus ${busId} not found` };
  }

  if (driverId) {
    const isAssigned = await verifyDriverBusAssignment(driverId, busId);
    if (!isAssigned) {
      return {
        ok: false,
        httpStatus: 403,
        error: `Unauthorized: Driver ${driverId} is not assigned to broadcast for bus ${bus.busNumber}`,
      };
    }
  }

  const trackingState = await isBusTrackingActive(busId);
  if (trackingState.isPaused) {
    return {
      ok: false,
      httpStatus: 409,
      error: "Tracking session is currently paused. Resume trip to transmit GPS.",
    };
  }

  const receivedAt = new Date();
  const recordedAt =
    typeof timestamp === "number" && timestamp > 0
      ? new Date(timestamp)
      : typeof timestamp === "string" && timestamp.length > 0
      ? new Date(timestamp)
      : receivedAt;

  const effectiveHeading =
    typeof bearing === "number" && !Number.isNaN(bearing)
      ? bearing
      : typeof heading === "number" && !Number.isNaN(heading)
      ? heading
      : null;

  const lastLoc = await getLatestBusLocation(busId);
  const validation = validateGpsCoordinate(
    { latitude, longitude, accuracy, speed, recordedAt },
    lastLoc,
    receivedAt
  );

  if (!validation.isValid) {
    return {
      ok: false,
      httpStatus: 400,
      error: `GPS point rejected: ${validation.rejectionReason}`,
      validation: {
        quality: validation.quality,
        networkDelayMs: validation.networkDelayMs,
      },
    };
  }

  const saved = await recordBusLocation({
    busId,
    driverId: driverId || bus.driverId || undefined,
    latitude,
    longitude,
    accuracy: typeof accuracy === "number" ? accuracy : null,
    altitude: typeof altitude === "number" ? altitude : null,
    altitudeAccuracy: typeof altitudeAccuracy === "number" ? altitudeAccuracy : null,
    speed: typeof speed === "number" ? speed : null,
    heading: effectiveHeading,
    recordedAt,
    receivedAt,
  });

  const strictTrip = process.env.ACIMS_STRICT_GPS === "true";
  const activeTrip = await getActiveTripForBus(busId);
  if (strictTrip && !trackingState.isActive && !activeTrip) {
    return {
      ok: false,
      httpStatus: 409,
      error: "No active trip. Driver must start trip before GPS can be ingested.",
    };
  }
  if (!trackingState.isActive) {
    await startTrackingSession(busId, driverId || bus.driverId || "driver-active");
  }

  const telemetry = await buildBusTelemetry(busId);
  realtimeHub.broadcastLocation(telemetry);

  processMobilityTelemetry({
    id: busId,
    busNumber: telemetry.busNumber,
    latitude: telemetry.latitude,
    longitude: telemetry.longitude,
    speed: typeof speed === "number" ? speed : saved.speed,
    heading: effectiveHeading ?? saved.heading,
    tripId: activeTrip?.id ?? null,
    recordedAt: recordedAt ?? saved.recordedAt,
  }).catch(() => {});

  return {
    ok: true,
    httpStatus: 200,
    telemetry,
    validation: {
      quality: validation.quality,
      networkDelayMs: validation.networkDelayMs,
    },
  };
}

// -------------------------------------------------------------
// INGEST REAL DRIVER GPS (Single update via HTTP POST)
// -------------------------------------------------------------
router.post("/bus/location", requireAuth, requireDriver, async (req, res) => {
  try {
    const {
      busId: bodyBusId,
      bus_id,
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      speed,
      heading,
      bearing,
      timestamp,
      recorded_at,
    } = req.body;

    const busId = bodyBusId || bus_id;
    const rawRecordedAt = timestamp ?? recorded_at;

    if (!busId || typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "bus_id/busId, valid latitude and longitude required" });
    }

    const authUser = (req as any).user as { uid?: string; email?: string } | undefined;
    const driverId =
      authUser?.uid ||
      req.header("x-acims-driver-id") ||
      req.body.driverId ||
      req.body.driver_id ||
      "driver-active";

    const result = await ingestRealDriverGps({
      busId,
      driverId,
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      speed,
      heading,
      bearing,
      timestamp: rawRecordedAt,
    });

    if (!result.ok) {
      return res.status(result.httpStatus).json({
        error: result.error,
        ...(result.validation ? { quality: result.validation.quality } : {}),
      });
    }

    res.json({
      success: true,
      telemetry: result.telemetry,
      validation: result.validation,
    });
  } catch (err: any) {
    console.error("Failed to ingest driver location:", err);
    res.status(500).json({ error: "Internal error recording GPS location" });
  }
});

// -------------------------------------------------------------
// BATCH INGEST OFFLINE-QUEUED GPS POINTS
// -------------------------------------------------------------
router.post("/bus/location/batch", requireAuth, requireDriver, async (req, res) => {
  try {
    const { busId, points } = req.body as {
      busId: string;
      points: Array<{
        latitude: number;
        longitude: number;
        accuracy?: number | null;
        altitude?: number | null;
        altitudeAccuracy?: number | null;
        speed?: number | null;
        heading?: number | null;
        timestamp: string;
        driverId?: string;
      }>;
    };

    if (!busId || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: "busId and points array required" });
    }

    const bus = await getDbBusById(busId);
    if (!bus) return res.status(404).json({ error: "Bus not found" });

    let insertedCount = 0;
    const receivedAt = new Date();

    // Sort chronologically by original recorded timestamp
    const sorted = [...points].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const pt of sorted) {
      const recordedAt = new Date(pt.timestamp);
      const validation = validateGpsCoordinate({
        latitude: pt.latitude,
        longitude: pt.longitude,
        accuracy: pt.accuracy,
        speed: pt.speed,
        recordedAt,
      });

      if (validation.isValid) {
        await recordBusLocation({
          busId,
          driverId: pt.driverId || bus.driverId || undefined,
          latitude: pt.latitude,
          longitude: pt.longitude,
          accuracy: pt.accuracy,
          altitude: pt.altitude,
          altitudeAccuracy: pt.altitudeAccuracy,
          speed: pt.speed,
          heading: pt.heading,
          recordedAt,
          receivedAt,
        });
        insertedCount++;
      }
    }

    const telemetry = await buildBusTelemetry(busId);
    realtimeHub.broadcastLocation(telemetry);

    res.json({
      success: true,
      insertedCount,
      totalReceived: points.length,
      currentTelemetry: telemetry,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to batch upload offline GPS coordinates" });
  }
});

// -------------------------------------------------------------
// DRIVER TRACKING SESSION CONTROLS
// -------------------------------------------------------------
/** Demo / lab: path coordinates to simulate GPS moving along the assigned route. */
router.get("/driver/simulator-path/:busId", async (req, res) => {
  const route = getRouteForBus(req.params.busId);
  if (!route) {
    return res.status(404).json({ error: "No route geometry for this bus." });
  }
  const path =
    route.path.length > 0
      ? route.path
      : route.stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
  res.json({
    busId: req.params.busId,
    routeId: route.id,
    routeName: route.name,
    path,
  });
});

router.post("/driver/session/start", requireAuth, requireDriver, async (req, res) => {
  try {
    const { busId, driverId = "driver-active" } = req.body;
    if (!busId) return res.status(400).json({ error: "busId required" });

    const bus = await getDbBusById(busId);
    if (!bus) return res.status(404).json({ error: "Bus not found" });

    // Verify driver assignment
    const isAssigned = await verifyDriverBusAssignment(driverId, busId);
    if (!isAssigned) {
      return res.status(403).json({
        error: `Unauthorized: Driver ${driverId} is not assigned to bus ${bus.busNumber}`,
      });
    }

    const { resolveShiftForDriverTrip } = await import("../../../../src/db/shiftManagement.ts");
    const shift = await resolveShiftForDriverTrip(busId, driverId);
    if (shift && !shift.active) {
      return res.status(400).json({ error: "Assigned shift is inactive. Contact transport admin." });
    }

    const scheduledStartAt =
      shift?.startTime
        ? (() => {
            const [h, m] = shift.startTime.split(":").map(Number);
            const d = new Date();
            d.setHours(h || 0, m || 0, 0, 0);
            return d;
          })()
        : null;

    const session = await startTrackingSession(busId, driverId);
    const trip = await startTripFromDriverSession({
      busId,
      driverId,
      routeId: shift?.routeId || bus.routeId || `route-${busId}`,
      shiftId: typeof req.body.shiftId === "string" ? req.body.shiftId : shift?.id,
      trackingSessionId: session.id,
      scheduledStartAt,
      shiftStartSnapshot: shift?.startTime ?? null,
      shiftEndSnapshot: shift?.endTime ?? null,
    });
    realtimeHub.broadcastSessionState(busId, "ACTIVE", session);
    res.json({ status: "ACTIVE", session, trip });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to start tracking session" });
  }
});

router.post("/driver/session/pause", requireAuth, requireDriver, async (req, res) => {
  try {
    const { busId } = req.body;
    if (!busId) return res.status(400).json({ error: "busId required" });

    const session = await pauseTrackingSession(busId);
    realtimeHub.broadcastSessionState(busId, "PAUSED", session);
    res.json({ status: "PAUSED", session });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to pause tracking session" });
  }
});

router.post("/driver/session/resume", requireAuth, requireDriver, async (req, res) => {
  try {
    const { busId } = req.body;
    if (!busId) return res.status(400).json({ error: "busId required" });

    const session = await resumeTrackingSession(busId);
    realtimeHub.broadcastSessionState(busId, "ACTIVE", session);
    res.json({ status: "ACTIVE", session });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to resume tracking session" });
  }
});

router.post("/driver/session/stop", requireAuth, requireDriver, async (req, res) => {
  try {
    const { busId } = req.body;
    if (!busId) return res.status(400).json({ error: "busId required" });

    const session = await stopTrackingSession(busId);
    const trip = await completeActiveTrip(busId);
    realtimeHub.broadcastSessionState(busId, "ENDED", session);
    res.json({ status: "ENDED", session, trip });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to stop tracking session" });
  }
});

router.get("/driver/session/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const session = await getBusTrackingSession(busId);
    res.json(session || { status: "IDLE", busId });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get session status" });
  }
});

export function startBusSimulation() {
  // Real GPS Architecture: Zero simulation loop.
  return null;
}

export default router;
