import { Router, type IRouter } from "express";
import { transportDb } from "../services/transportDb";
import { distanceInKilometers, calculateEtaMinutes } from "../services/eta";

const router: IRouter = Router();

// GET /api/student/profile
router.get("/student/profile", (req, res) => {
  const studentId = (req.query.studentId as string) || "student-20418";
  const student = transportDb.getStudentProfile(studentId);
  const pickupStop = student.pickupStopId ? transportDb.getStop(student.pickupStopId) : null;
  res.json({
    ...student,
    name: "Shalini S",
    email: "shalini.s.2024.csd@rajalakshmi.edu.in",
    pickupStop,
  });
});

// PUT /api/student/pickup-stop
router.put("/student/pickup-stop", (req, res) => {
  const { stopId, studentId = "student-20418" } = req.body;
  if (stopId !== null && stopId !== undefined) {
    const stop = transportDb.getStop(stopId);
    if (!stop) {
      res.status(400).json({ error: "Invalid pickup stop ID. Must match a registered stop." });
      return;
    }
  }
  const updated = transportDb.updateStudentPickupStop(stopId ?? null, studentId);
  const pickupStop = updated.pickupStopId ? transportDb.getStop(updated.pickupStopId) : null;
  res.json({
    ...updated,
    name: "Shalini S",
    email: "shalini.s.2024.csd@rajalakshmi.edu.in",
    pickupStop,
  });
});

// GET /api/stops - All registered stops
router.get("/stops", (_req, res) => {
  res.json(transportDb.getAllStops());
});

// GET /api/stops/nearest?latitude=...&longitude=...
router.get("/stops/nearest", (req, res) => {
  const lat = parseFloat(req.query.latitude as string);
  const lng = parseFloat(req.query.longitude as string);
  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "Valid latitude and longitude query parameters are required." });
    return;
  }
  const nearest = transportDb.findNearestStop({ latitude: lat, longitude: lng });
  if (!nearest) {
    res.status(404).json({ error: "No registered stops found." });
    return;
  }
  res.json(nearest);
});

// GET /api/stops/:stopId
router.get("/stops/:stopId", (req, res) => {
  const stop = transportDb.getStop(req.params.stopId);
  if (!stop) {
    res.status(404).json({ error: "Stop not found" });
    return;
  }
  res.json(stop);
});

// GET /api/routes/for-stop/:stopId
router.get("/routes/for-stop/:stopId", (req, res) => {
  const routes = transportDb.getRoutesForStop(req.params.stopId);
  res.json(routes);
});

// GET /api/trips/active
router.get("/trips/active", (_req, res) => {
  res.json(transportDb.getActiveTrips());
});

// GET /api/routes - All routes
router.get("/routes", (_req, res) => {
  res.json(transportDb.getAllRoutes());
});

// GET /api/routes/:routeId
router.get("/routes/:routeId", (req, res) => {
  const route = transportDb.getRoute(req.params.routeId);
  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  const routeStops = transportDb.getRouteStops(route.id);
  res.json({ ...route, stops: routeStops });
});

// GET /api/route-pulse - Real personalized Route Pulse
router.get("/route-pulse", (req, res) => {
  const studentId = (req.query.studentId as string) || "student-20418";
  const student = transportDb.getStudentProfile(studentId);

  // 1. Check pickup stop
  if (!student.pickupStopId) {
    res.json({
      hasPickupStop: false,
      hasActiveRoute: false,
      hasActiveBus: false,
      hasLiveLocation: false,
      student: {
        id: student.id,
        name: "Shalini S",
        pickupStopId: null,
      },
      pickupStop: null,
      route: null,
      trip: null,
      bus: null,
      liveLocation: null,
      etaMinutes: null,
      routeProgressPercentage: null,
      status: "No pickup point configured",
      lastUpdated: null,
      message: "Set your pickup point to see your route.",
    });
    return;
  }

  const pickupStop = transportDb.getStop(student.pickupStopId);
  if (!pickupStop) {
    res.json({
      hasPickupStop: false,
      hasActiveRoute: false,
      hasActiveBus: false,
      hasLiveLocation: false,
      student: {
        id: student.id,
        name: "Shalini S",
        pickupStopId: null,
      },
      pickupStop: null,
      route: null,
      trip: null,
      bus: null,
      liveLocation: null,
      etaMinutes: null,
      routeProgressPercentage: null,
      status: "Invalid pickup point",
      lastUpdated: null,
      message: "Registered pickup point could not be found. Please select a valid stop.",
    });
    return;
  }

  // 2. Find active routes serving this stop
  const servingRoutes = transportDb.getRoutesForStop(pickupStop.id);
  if (!servingRoutes.length) {
    res.json({
      hasPickupStop: true,
      hasActiveRoute: false,
      hasActiveBus: false,
      hasLiveLocation: false,
      student: {
        id: student.id,
        name: "Shalini S",
        pickupStopId: pickupStop.id,
      },
      pickupStop,
      route: null,
      trip: null,
      bus: null,
      liveLocation: null,
      etaMinutes: null,
      routeProgressPercentage: null,
      status: "No serving route",
      lastUpdated: null,
      message: "No active route currently serves your pickup point.",
    });
    return;
  }

  const route = servingRoutes[0];

  // 3. Find today's active trip for this route
  const trip = transportDb.getTripForRoute(route.id);
  const busId = trip?.busId ?? route.assignedBusIds[0];
  const bus = busId ? transportDb.getBus(busId) : null;

  if (!bus) {
    res.json({
      hasPickupStop: true,
      hasActiveRoute: true,
      hasActiveBus: false,
      hasLiveLocation: false,
      student: {
        id: student.id,
        name: "Shalini S",
        pickupStopId: pickupStop.id,
      },
      pickupStop,
      route,
      trip: trip ?? null,
      bus: null,
      liveLocation: null,
      etaMinutes: null,
      routeProgressPercentage: null,
      status: "No active vehicle",
      lastUpdated: null,
      message: "No active bus found for this trip.",
    });
    return;
  }

  // 4. Get real-time bus location
  // 4. Get real-time bus location & tracking status
  const liveLocation = transportDb.getLiveLocation(bus.id);
  const trackingStatus = transportDb.getTrackingStatus(bus.id);
  const studentLoc = transportDb.getStudentLocation(student.id);

  let studentToPickupKm: number | null = null;
  let studentWalkingMinutes: number | null = null;
  if (studentLoc && pickupStop) {
    studentToPickupKm = Number(
      distanceInKilometers(
        { latitude: studentLoc.latitude, longitude: studentLoc.longitude },
        { latitude: pickupStop.latitude, longitude: pickupStop.longitude }
      ).toFixed(2)
    );
    studentWalkingMinutes = Math.max(1, Math.round(studentToPickupKm * 12.5));
  }

  if (!liveLocation || trackingStatus === "OFFLINE") {
    res.json({
      hasPickupStop: true,
      hasActiveRoute: true,
      hasActiveBus: true,
      hasLiveLocation: false,
      trackingStatus: "OFFLINE",
      student: {
        id: student.id,
        name: "Shalini S",
        pickupStopId: pickupStop.id,
      },
      studentLocation: studentLoc ?? null,
      studentToPickupKm,
      studentWalkingMinutes,
      pickupStop,
      route,
      trip: trip ?? null,
      bus: {
        id: bus.id,
        busNumber: bus.busNumber,
        plateNumber: bus.plateNumber,
        status: "Offline",
        origin: bus.origin,
        destination: bus.destination,
        routeLabel: bus.routeLabel,
        nextStop: bus.nextStop,
        nextStopId: bus.nextStopId,
        etaMinutes: 0,
        updatedAt: bus.updatedAt,
      },
      liveLocation: null,
      etaMinutes: null,
      routeProgressPercentage: null,
      status: "Bus offline",
      lastUpdated: liveLocation?.recordedAt?.toISOString() ?? bus.updatedAt.toISOString(),
      message: "Bus offline · Driver has not started live GPS tracking yet.",
    });
    return;
  }

  // 5. Calculate real ETA and route progress from live bus phone GPS
  const distanceToStop = distanceInKilometers(
    { latitude: liveLocation.latitude, longitude: liveLocation.longitude },
    { latitude: pickupStop.latitude, longitude: pickupStop.longitude }
  );

  const effectiveSpeedKmh = liveLocation.speed > 5 ? liveLocation.speed : 24;
  const etaMinutes = Math.max(1, Math.ceil((distanceToStop / effectiveSpeedKmh) * 60));

  let statusText = trackingStatus === "TRACKING_STALE" ? "Signal Stale" : "On Route";
  if (trackingStatus === "TRACKING_ACTIVE") {
    if (distanceToStop < 0.4) {
      statusText = "Approaching your stop";
    } else if (bus.status === "Boarding") {
      statusText = "Boarding passengers";
    } else if (bus.status === "Standby") {
      statusText = "Standby at depot";
    }
  }

  // Calculate route progress percentage
  const routeStops = transportDb.getRouteStops(route.id);
  const firstStop = routeStops[0];
  const lastStop = routeStops[routeStops.length - 1];
  let routeProgressPercentage = 50;

  if (firstStop && lastStop) {
    const totalDist = distanceInKilometers(firstStop, lastStop);
    const distFromStart = distanceInKilometers(firstStop, liveLocation);
    if (totalDist > 0) {
      routeProgressPercentage = Math.min(100, Math.max(5, Math.round((distFromStart / totalDist) * 100)));
    }
  }

  const accuracyFormatted = `±${Math.round(liveLocation.accuracy ?? 10)}m`;
  let displayMessage = `${statusText} · Arriving in ${etaMinutes} mins`;
  if (trackingStatus === "TRACKING_STALE") {
    displayMessage = `Signal stale · Last seen ${Math.round((Date.now() - liveLocation.recordedAt.getTime()) / 1000)}s ago`;
  }

  res.json({
    hasPickupStop: true,
    hasActiveRoute: true,
    hasActiveBus: true,
    hasLiveLocation: true,
    trackingStatus,
    busAccuracy: liveLocation.accuracy ?? 10,
    student: {
      id: student.id,
      name: "Shalini S",
      pickupStopId: pickupStop.id,
    },
    studentLocation: studentLoc ?? null,
    studentToPickupKm,
    studentWalkingMinutes,
    pickupStop,
    route,
    trip: trip ?? null,
    bus: {
      id: bus.id,
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      status: bus.status,
      origin: bus.origin,
      destination: bus.destination,
      routeLabel: bus.routeLabel,
      nextStop: bus.nextStop,
      nextStopId: bus.nextStopId,
      etaMinutes,
      updatedAt: bus.updatedAt,
    },
    liveLocation: {
      ...liveLocation,
      accuracy: liveLocation.accuracy ?? 10,
      trackingStatus,
    },
    etaMinutes,
    distanceKm: Number(distanceToStop.toFixed(2)),
    routeProgressPercentage,
    status: statusText,
    lastUpdated: liveLocation.recordedAt.toISOString(),
    message: displayMessage,
  });
});

export default router;
