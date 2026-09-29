import { Router, type IRouter } from "express";
import {
  getAgencies,
  getNearbyStops,
  getRouteDetails,
  getSyncLogs,
  searchJourneyOptions,
  searchRoutes,
  searchStops,
  getMissedBusAlternatives,
} from "../services/publicTransitService";
import {
  getPersonalizedTransit,
  getRouteStopsWithStudentStop,
} from "../services/personalizedTransitService";

const router: IRouter = Router();

// ============================================================================
// PERSONALIZED PUBLIC TRANSPORT ENDPOINTS (Section 1-18)
// ============================================================================

router.get(["/public-transport/personalized", "/public-transport/nearby"], (req, res) => {
  try {
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
    const pickupStopId = typeof req.query.pickupStopId === "string" ? req.query.pickupStopId : undefined;
    const latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
    const destination = typeof req.query.destination === "string" ? req.query.destination : undefined;
    const filterTime = typeof req.query.filterTime === "string" ? req.query.filterTime : undefined;

    const result = getPersonalizedTransit({
      studentId,
      pickupStopId,
      latitude,
      longitude,
      targetDestination: destination,
      filterTime,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/public-transport/trip-stops", (req, res) => {
  try {
    const tripId = req.query.tripId as string;
    const studentStopId = req.query.studentStopId as string | undefined;

    if (!tripId) {
      res.status(400).json({ error: "tripId is required" });
      return;
    }

    const result = getRouteStopsWithStudentStop(tripId, studentStopId);
    if (!result) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transit/agencies", (_req, res) => {
  try {
    const agencies = getAgencies();
    res.json(agencies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transit/sync-status", (_req, res) => {
  try {
    const logs = getSyncLogs();
    res.json({
      status: "SUCCESS",
      provenance: logs[0] || null,
      recentSyncs: logs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transit/routes", (req, res) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query : undefined;
    const agencyId = typeof req.query.agencyId === "string" ? req.query.agencyId : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const routes = searchRoutes({ query, agencyId, limit, offset });
    res.json(routes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transit/routes/:routeId", (req, res) => {
  try {
    const route = getRouteDetails(req.params.routeId);
    if (!route) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    res.json(route);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transit/stops", (req, res) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query : undefined;
    const agencyId = typeof req.query.agencyId === "string" ? req.query.agencyId : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;

    const stops = searchStops({ query, agencyId, limit });
    res.json(stops);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transit/nearby", (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({ error: "Valid latitude and longitude required" });
      return;
    }

    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 5;
    const agencyId = typeof req.query.agencyId === "string" ? req.query.agencyId : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;

    const stops = getNearbyStops({
      latitude: lat,
      longitude: lon,
      radiusKm,
      limit,
      agencyId,
    });
    res.json(stops);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transit/search", (req, res) => {
  try {
    const fromText = typeof req.query.from === "string" ? req.query.from : "";
    const toText = typeof req.query.to === "string" ? req.query.to : "";
    const time = typeof req.query.time === "string" ? req.query.time : undefined;
    const agencyId = typeof req.query.agencyId === "string" ? req.query.agencyId : undefined;

    if (!fromText || !toText) {
      res.status(400).json({ error: "Both 'from' and 'to' parameters are required" });
      return;
    }

    const options = searchJourneyOptions({
      fromText,
      toText,
      time,
      agencyId,
    });
    res.json(options);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transit/missed-bus-alternatives", (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({ error: "Valid latitude and longitude required" });
      return;
    }

    const destinationText = typeof req.query.destination === "string" ? req.query.destination : undefined;
    const alternatives = getMissedBusAlternatives({
      studentLat: lat,
      studentLon: lon,
      destinationText,
    });
    res.json(alternatives);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
