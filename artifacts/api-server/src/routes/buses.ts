import { Router, type IRouter } from "express";
import {
  GetBusLocationParams,
  GetBusParams,
  ListBusStopsParams,
  UpdateBusLocationBody,
} from "@workspace/api-zod";
import {
  getBus,
  getBuses,
  getLocation,
  getStops,
  updateLocation,
} from "../services/busTracking";
import { syncBusNotifications } from "../services/notificationEngine";

const router: IRouter = Router();

router.get("/buses", (_req, res) => {
  res.json(getBuses());
});

router.get("/buses/:busId", (req, res) => {
  const { busId } = GetBusParams.parse(req.params);
  const bus = getBus(busId);
  if (!bus) {
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  res.json(bus);
});

router.get("/buses/:busId/location", (req, res) => {
  const { busId } = GetBusLocationParams.parse(req.params);
  const location = getLocation(busId);
  if (!location) {
    res.status(404).json({ error: "Live location unavailable" });
    return;
  }
  const bus = getBus(busId);
  if (bus) syncBusNotifications(bus);
  res.json(location);
});

router.get("/buses/:busId/stops", (req, res) => {
  const { busId } = ListBusStopsParams.parse(req.params);
  const busStops = getStops(busId);
  if (!busStops || !busStops.length) {
    res.status(404).json({ error: "No stops registered for this bus" });
    return;
  }
  res.json(busStops);
});

router.post("/bus/location", (req, res) => {
  const input = UpdateBusLocationBody.parse(req.body);
  const location = updateLocation(
    input.busId,
    { latitude: input.latitude, longitude: input.longitude },
    "driver-device",
    input.timestamp,
  );
  if (!location) {
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  const bus = getBus(input.busId);
  if (bus) syncBusNotifications(bus);
  res.json(bus);
});

router.post("/buses/:busId/location", (req, res) => {
  const { busId } = GetBusLocationParams.parse(req.params);
  const { latitude, longitude, speed, heading, source } = req.body;
  const location = updateLocation(
    busId,
    { latitude, longitude },
    source ?? "driver-device",
    new Date(),
    speed,
    heading,
  );
  if (!location) {
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  const bus = getBus(busId);
  if (bus) syncBusNotifications(bus);
  res.json(location);
});

export default router;
