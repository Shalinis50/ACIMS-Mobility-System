import { Router, type IRouter } from "express";
import {
  calculateNavigation,
  getCampusMobilityData,
  listCampusRoutes,
  listCampusStops,
} from "../services/campus";
import {
  getDbCampusLocations,
  searchDbCampusLocations,
  calculateDbCampusWalkingRoute,
  getDbCampusPaths,
} from "../../../../src/db/services.ts";

const router: IRouter = Router();

router.get("/campus/mobility", async (_req, res) => {
  const data = getCampusMobilityData();
  const dbLocations = await getDbCampusLocations();
  const dbPaths = await getDbCampusPaths();
  res.json({
    ...data,
    buildings: dbLocations.filter((l) => l.category === "academic" || l.category === "facility"),
    campusPaths: dbPaths.length > 0 ? dbPaths : data.campusPaths,
  });
});

router.get("/campus/locations", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const locations = await getDbCampusLocations(category);
    res.json(locations);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch campus locations" });
  }
});

router.get("/campus/search", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      return res.json([]);
    }
    const results = await searchDbCampusLocations(query);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: "Search failed" });
  }
});

router.get("/campus/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Valid latitude and longitude required" });
    }

    const locations = await getDbCampusLocations();

    function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const sorted = locations
      .map((loc) => ({
        ...loc,
        distanceMeters: Math.round(haversineM(lat, lon, loc.latitude, loc.longitude)),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 10);

    res.json(sorted);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to find nearby campus locations" });
  }
});

router.get("/campus/stops", (_req, res) => {
  res.json(listCampusStops());
});

router.get("/campus/routes", (_req, res) => {
  res.json(listCampusRoutes());
});

router.get("/navigation/destinations", async (_req, res) => {
  try {
    const locations = await getDbCampusLocations();
    res.json(locations);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch destinations" });
  }
});

router.post("/campus/walk-route", async (req, res) => {
  try {
    const { startId, destinationId, startLatitude, startLongitude } = req.body as {
      startId?: string;
      destinationId?: string;
      startLatitude?: number;
      startLongitude?: number;
    };

    if (!destinationId) {
      return res.status(400).json({ error: "destinationId is required" });
    }

    let start: string | { latitude: number; longitude: number };
    if (typeof startLatitude === "number" && typeof startLongitude === "number") {
      start = { latitude: startLatitude, longitude: startLongitude };
    } else if (startId) {
      start = startId;
    } else {
      return res.status(400).json({ error: "Either startId or real GPS coordinates (startLatitude/startLongitude) are required" });
    }

    const route = await calculateDbCampusWalkingRoute(start, destinationId);
    if (!route) {
      return res.status(404).json({ error: "Walking route unavailable." });
    }
    res.json(route);
  } catch (err: any) {
    console.error("Error calculating walk route:", err);
    res.status(500).json({ error: "Walking route unavailable." });
  }
});

router.post("/navigation/route", async (req, res) => {
  try {
    const body = req.body as any;
    if (!body.destinationId) {
      return res.status(400).json({ error: "destinationId required" });
    }

    let start: string | { latitude: number; longitude: number };
    if (typeof body.startLatitude === "number" && typeof body.startLongitude === "number") {
      start = { latitude: body.startLatitude, longitude: body.startLongitude };
    } else if (body.startLocationId) {
      start = body.startLocationId;
    } else {
      start = "REC Main Gate";
    }

    const dbRoute = await calculateDbCampusWalkingRoute(start, body.destinationId);
    if (dbRoute) {
      return res.json({
        destinationId: body.destinationId,
        destinationName: dbRoute.destination,
        totalDistanceMeters: dbRoute.distanceMeters,
        totalTimeMinutes: dbRoute.walkingMinutes,
        mode: body.mode || "walking",
        steps: dbRoute.steps.map((text, i) => ({
          instruction: text,
          distanceMeters: Math.round(dbRoute.distanceMeters / dbRoute.steps.length),
          timeMinutes: Math.round(dbRoute.walkingMinutes / dbRoute.steps.length),
        })),
        pathPoints: dbRoute.pathPoints,
        source: "Cloud SQL campus_paths",
      });
    }

    res.status(404).json({ error: "Walking route unavailable." });
  } catch (err: any) {
    res.status(500).json({ error: "Walking route unavailable." });
  }
});

export default router;
