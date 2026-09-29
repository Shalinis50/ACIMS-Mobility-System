import { Router, type IRouter, type Request, type Response } from "express";
import { transportDb, busLocationEvents, studentLocationEvents } from "../services/transportDb";
import { distanceInKilometers } from "../services/eta";
import { getLocation, updateLocation } from "../services/busTracking";

const router: IRouter = Router();

// ==========================================
// 1. STUDENT PHONE GPS ENDPOINTS (Phone 1)
// ==========================================

/**
 * POST /api/location/student
 * Receives real coordinates from student phone GPS via navigator.geolocation.watchPosition()
 */
router.post("/location/student", (req: Request, res: Response) => {
  const {
    studentId = "student-20418",
    latitude,
    longitude,
    accuracy,
    speed,
    heading,
    timestamp,
  } = req.body;

  const lat = Number(latitude);
  const lng = Number(longitude);
  const acc = Number(accuracy);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: "Invalid latitude or longitude coordinates." });
    return;
  }

  const record = transportDb.recordStudentLocation({
    studentId,
    latitude: lat,
    longitude: lng,
    accuracy: !isNaN(acc) && acc >= 0 ? acc : 10,
    speed: typeof speed === "number" && !isNaN(speed) ? speed : null,
    heading: typeof heading === "number" && !isNaN(heading) ? heading : null,
    timestamp,
    source: "student-phone-gps",
  });

  const student = transportDb.getStudentProfile(studentId);
  const pickupStop = student?.pickupStopId ? transportDb.getStop(student.pickupStopId) : null;
  const nearest = transportDb.findNearestStop({ latitude: lat, longitude: lng });

  let distanceToPickupKm: number | null = null;
  let distanceToPickupMeters: number | null = null;
  let walkingMinutes: number | null = null;

  if (pickupStop) {
    distanceToPickupKm = Number(
      distanceInKilometers({ latitude: lat, longitude: lng }, pickupStop).toFixed(2)
    );
    distanceToPickupMeters = Math.round(distanceToPickupKm * 1000);
    // Walking speed ~ 4.8 km/h => ~12.5 minutes per km
    walkingMinutes = Math.max(1, Math.round(distanceToPickupKm * 12.5));
  }

  res.json({
    success: true,
    studentId,
    location: record,
    pickupStop,
    nearestStop: nearest?.stop ?? null,
    distanceToPickupKm,
    distanceToPickupMeters,
    walkingMinutes,
    isAtPickupStop: distanceToPickupMeters !== null && distanceToPickupMeters < 50,
  });
});

/**
 * GET /api/location/student
 * Returns the latest real student phone GPS position and stop relationship
 */
router.get("/location/student", (req: Request, res: Response) => {
  const studentId = (req.query.studentId as string) || "student-20418";
  const location = transportDb.getStudentLocation(studentId);
  const student = transportDb.getStudentProfile(studentId);
  const pickupStop = student?.pickupStopId ? transportDb.getStop(student.pickupStopId) : null;

  if (!location) {
    res.json({
      hasLocation: false,
      studentId,
      location: null,
      pickupStop,
      message: "No live GPS coordinates reported by student phone yet.",
    });
    return;
  }

  let distanceToPickupKm: number | null = null;
  let distanceToPickupMeters: number | null = null;
  let walkingMinutes: number | null = null;

  if (pickupStop) {
    distanceToPickupKm = Number(
      distanceInKilometers(location, pickupStop).toFixed(2)
    );
    distanceToPickupMeters = Math.round(distanceToPickupKm * 1000);
    walkingMinutes = Math.max(1, Math.round(distanceToPickupKm * 12.5));
  }

  res.json({
    hasLocation: true,
    studentId,
    location,
    pickupStop,
    distanceToPickupKm,
    distanceToPickupMeters,
    walkingMinutes,
    isAtPickupStop: distanceToPickupMeters !== null && distanceToPickupMeters < 50,
  });
});

// ==========================================
// 2. BUS / DRIVER PHONE GPS ENDPOINTS (Phone 2)
// ==========================================

/**
 * POST /api/location/bus
 * Broadcasts real driver phone GPS position for a specific bus
 */
router.post("/location/bus", (req: Request, res: Response) => {
  const busId = req.body.bus_id || req.body.busId;
  const {
    latitude,
    longitude,
    accuracy,
    speed,
    heading,
    timestamp,
    driverId,
    driverName,
  } = req.body;

  if (!busId) {
    res.status(400).json({ error: "bus_id (or busId) is required." });
    return;
  }

  const bus = transportDb.getBus(busId);
  if (!bus) {
    res.status(404).json({ error: `Bus with id '${busId}' not found in registry.` });
    return;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const acc = Number(accuracy);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: "Invalid latitude or longitude coordinates." });
    return;
  }

  const location = transportDb.recordLiveLocation({
    busId,
    latitude: lat,
    longitude: lng,
    accuracy: !isNaN(acc) && acc >= 0 ? acc : 10,
    speed: typeof speed === "number" && !isNaN(speed) ? speed : 0,
    heading: typeof heading === "number" && !isNaN(heading) ? heading : 0,
    source: "driver-phone-gps",
    recordedAt: timestamp,
    driverId,
    driverName,
  });

  const fullLocation = getLocation(busId);

  res.json({
    success: true,
    busId,
    busNumber: bus.busNumber,
    trackingStatus: fullLocation?.trackingStatus ?? "TRACKING_ACTIVE",
    location: fullLocation,
  });
});

/**
 * POST /api/location/bus/batch
 * Offline queue recovery: flushes points collected while bus phone had no network
 */
router.post("/location/bus/batch", (req: Request, res: Response) => {
  const busId = req.body.bus_id || req.body.busId;
  const locations = req.body.locations;

  if (!busId || !Array.isArray(locations) || !locations.length) {
    res.status(400).json({ error: "bus_id and a non-empty array of locations are required." });
    return;
  }

  const bus = transportDb.getBus(busId);
  if (!bus) {
    res.status(404).json({ error: `Bus with id '${busId}' not found.` });
    return;
  }

  let processedCount = 0;
  for (const item of locations) {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    const acc = Number(item.accuracy);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      transportDb.recordLiveLocation({
        busId,
        latitude: lat,
        longitude: lng,
        accuracy: !isNaN(acc) && acc >= 0 ? acc : 10,
        speed: typeof item.speed === "number" ? item.speed : 0,
        heading: typeof item.heading === "number" ? item.heading : 0,
        source: "driver-phone-gps-offline-sync",
        recordedAt: item.timestamp,
      });
      processedCount++;
    }
  }

  const latest = getLocation(busId);

  res.json({
    success: true,
    busId,
    syncedPoints: processedCount,
    latestLocation: latest,
  });
});

/**
 * POST /api/location/bus/start
 * Driver explicitly starts tracking on Phone 2
 */
router.post("/location/bus/start", (req: Request, res: Response) => {
  const busId = req.body.bus_id || req.body.busId;
  const { driverId, driverName } = req.body;

  if (!busId) {
    res.status(400).json({ error: "bus_id is required." });
    return;
  }

  const session = transportDb.startBusTracking(busId, driverId, driverName);
  res.json({
    success: true,
    busId,
    session,
    trackingStatus: "TRACKING_ACTIVE",
    message: "Live tracking session started.",
  });
});

/**
 * POST /api/location/bus/stop
 * Driver explicitly stops live tracking on Phone 2
 */
router.post("/location/bus/stop", (req: Request, res: Response) => {
  const busId = req.body.bus_id || req.body.busId;

  if (!busId) {
    res.status(400).json({ error: "bus_id is required." });
    return;
  }

  const session = transportDb.stopBusTracking(busId);
  res.json({
    success: true,
    busId,
    session,
    trackingStatus: "OFFLINE",
    message: "Live tracking session stopped. No longer broadcasting.",
  });
});

/**
 * GET /api/location/bus/:busId
 * Returns the latest real location and tracking status for a bus
 */
router.get("/location/bus/:busId", (req: Request, res: Response) => {
  const { busId } = req.params;
  const location = getLocation(busId);
  const bus = transportDb.getBus(busId);
  const session = transportDb.getBusSession(busId);

  if (!bus) {
    res.status(404).json({ error: "Bus not found." });
    return;
  }

  res.json({
    busId: bus.id,
    busNumber: bus.busNumber,
    routeLabel: bus.routeLabel,
    session: session ?? { isActive: false },
    trackingStatus: location?.trackingStatus ?? "OFFLINE",
    location: location ?? null,
  });
});

/**
 * GET /api/location/bus/:busId/history
 * Returns the historical breadcrumb path from real GPS updates
 */
router.get("/location/bus/:busId/history", (req: Request, res: Response) => {
  const { busId } = req.params;
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const history = transportDb.getBusLocationHistory(busId, limit);
  res.json({
    busId,
    count: history.length,
    history,
  });
});

/**
 * GET /api/location/bus/:busId/stream
 * Server-Sent Events (SSE) stream for real-time sub-second updates from Phone 2 to Phone 1
 */
router.get("/location/bus/:busId/stream", (req: Request, res: Response) => {
  const { busId } = req.params;

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Send initial snapshot
  const initial = getLocation(busId);
  if (initial) {
    res.write(`data: ${JSON.stringify(initial)}\n\n`);
  }

  // Listener for real-time broadcasts
  const onLocationUpdate = (loc: any) => {
    if (loc.busId === busId) {
      const full = getLocation(busId);
      res.write(`data: ${JSON.stringify(full ?? loc)}\n\n`);
    }
  };

  busLocationEvents.on(`location:${busId}`, onLocationUpdate);

  // Heartbeat ping every 15 seconds to keep the socket alive
  const heartbeatTimer = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 15000);

  // Clean up on disconnect
  req.on("close", () => {
    clearInterval(heartbeatTimer);
    busLocationEvents.off(`location:${busId}`, onLocationUpdate);
    res.end();
  });
});

/**
 * GET /api/location/sessions
 * Returns the status of all active tracking sessions across the fleet
 */
router.get("/location/sessions", (_req: Request, res: Response) => {
  const sessions = transportDb.getAllBusSessions();
  const buses = transportDb.getAllBuses().map((bus) => {
    const loc = getLocation(bus.id);
    const session = sessions.find((s) => s.busId === bus.id);
    return {
      busId: bus.id,
      busNumber: bus.busNumber,
      routeLabel: bus.routeLabel,
      trackingStatus: loc?.trackingStatus ?? "OFFLINE",
      isActive: session?.isActive ?? false,
      lastRealGpsUpdate: loc?.updatedAt ?? null,
      accuracy: loc?.accuracy ?? null,
      speed: loc?.speed ?? 0,
      heading: loc?.heading ?? 0,
    };
  });
  res.json({ buses });
});

export default router;
