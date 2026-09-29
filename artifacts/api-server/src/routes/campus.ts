import { Router, type IRouter } from "express";
import {
  CalculateNavigationRouteBody,
} from "@workspace/api-zod";
import {
  calculateNavigation,
  calculateCampusWalkingRoute,
  getCampusMobilityData,
  listCampusLocations,
  listCampusRoutes,
  listCampusStops,
} from "../services/campus";

const router: IRouter = Router();

router.get("/campus/mobility", (_req, res) => {
  res.json(getCampusMobilityData());
});

router.get("/campus/locations", (_req, res) => {
  res.json(listCampusLocations());
});

router.get("/campus/stops", (_req, res) => {
  res.json(listCampusStops());
});

router.get("/campus/routes", (_req, res) => {
  res.json(listCampusRoutes());
});

router.get("/navigation/destinations", (_req, res) => {
  res.json(listCampusLocations());
});

router.post("/campus/walk-route", (req, res) => {
  const { startId, destinationId } = req.body as { startId: string; destinationId: string };
  if (!startId || !destinationId) {
    res.status(400).json({ error: "startId and destinationId are required" });
    return;
  }
  const route = calculateCampusWalkingRoute(startId, destinationId);
  if (!route) {
    res.status(404).json({ error: "Campus walking route not found" });
    return;
  }
  res.json(route);
});

router.post("/navigation/route", (req, res) => {
  const body = req.body as any;
  const route = calculateNavigation({
    destinationId: body.destinationId,
    startLatitude: body.startLatitude,
    startLongitude: body.startLongitude,
    startLocationId: body.startLocationId,
    mode: body.mode,
  });
  if (!route) {
    res.status(404).json({ error: "Destination not found" });
    return;
  }
  res.json(route);
});

export default router;