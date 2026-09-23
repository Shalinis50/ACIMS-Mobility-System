import { Router, type IRouter } from "express";
import {
  CalculateNavigationRouteBody,
} from "@workspace/api-zod";
import {
  calculateNavigation,
  listCampusLocations,
  listCampusRoutes,
  listCampusStops,
} from "../services/campus";

const router: IRouter = Router();

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

router.post("/navigation/route", (req, res) => {
  const route = calculateNavigation(CalculateNavigationRouteBody.parse(req.body));
  if (!route) {
    res.status(404).json({ error: "Destination not found" });
    return;
  }
  res.json(route);
});

export default router;