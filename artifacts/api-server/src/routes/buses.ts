import { Router, type IRouter } from "express";
import {
  GetBusLocationParams,
  GetBusParams,
  ListBusStopsParams,
  UpdateBusLocationBody,
  UpdateBusOccupancyBody,
} from "@workspace/api-zod";
import {
  advanceSimulation,
  getBus,
  getBuses,
  getLocation,
  getStops,
  updateLocation,
  updateOccupancy,
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
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  const bus = getBus(busId);
  if (bus) syncBusNotifications(bus);
  res.json(location);
});

router.get("/buses/:busId/stops", (req, res) => {
  const { busId } = ListBusStopsParams.parse(req.params);
  const busStops = getStops(busId);
  if (!busStops) {
    res.status(404).json({ error: "Bus not found" });
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

router.post("/buses/:busId/occupancy", (req, res) => {
  const { busId } = GetBusParams.parse(req.params);
  const input = UpdateBusOccupancyBody.parse(req.body);
  const bus = updateOccupancy(busId, input.currentOccupancy);
  if (!bus) {
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  syncBusNotifications(bus);
  res.json(bus);
});

export function startBusSimulation() {
  return setInterval(() => {
    const location = advanceSimulation();
    const bus = getBus(location.busId);
    if (bus) syncBusNotifications(bus);
  }, 10_000);
}

export default router;
