import { Router, type IRouter, type RequestHandler } from "express";
import {
  CreateAdminBusBody,
  CreateAdminDriverBody,
  CreateAdminRouteBody,
  DeactivateAdminBusParams,
  GetAdminDashboardResponse,
  UpdateAdminBusBody,
  UpdateAdminBusParams,
} from "@workspace/api-zod";
import { getBuses } from "../services/busTracking";
import { getAdminQueues, createAdminBus, createDriver, createRoute, deactivateAdminBus, listAdminBuses, listDrivers, listRoutes, updateAdminBus } from "../services/admin";
import { getAllSafetyReports } from "./safety";
import { listProviders } from "../services/transport";

const router: IRouter = Router();
const requireAdminRole: RequestHandler = (req, res, next) => {
  if (req.header("x-acims-role") !== "admin") {
    res.status(403).json({ error: "Admin role required" });
    return;
  }
  next();
};
router.use("/admin", requireAdminRole);

router.get("/admin/dashboard", (_req, res) => {
  const buses = getBuses();
  const safetyReports = getAllSafetyReports();
  const dashboard = {
    activeBuses: buses.length,
    activeTrips: buses.length,
    activeRoutes: listRoutes().filter((route) => route.active).length,
    delayedBuses: buses.filter((bus) => bus.status.toLowerCase().includes("delay")).length,
    queueEntries: getAdminQueues().reduce((total, queue) => total + queue.queueSize, 0),
    openSafetyReports: safetyReports.filter((report) => report.status === "OPEN").length,
    providersOnline: listProviders().filter((provider) => provider.status === "live").length,
    systemStatus: "Operational",
  };
  res.json(GetAdminDashboardResponse.parse(dashboard));
});

router.get("/admin/buses", (_req, res) => res.json(listAdminBuses()));
router.post("/admin/buses", (req, res) => {
  const input = CreateAdminBusBody.parse(req.body);
  res.status(201).json(createAdminBus({ ...input, active: input.active ?? true }));
});
router.patch("/admin/buses/:busId", (req, res) => {
  const { busId } = UpdateAdminBusParams.parse(req.params);
  const input = UpdateAdminBusBody.parse(req.body);
  const bus = updateAdminBus(busId, { ...input, active: input.active ?? true });
  if (!bus) {
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  res.json(bus);
});
router.delete("/admin/buses/:busId", (req, res) => {
  const { busId } = DeactivateAdminBusParams.parse(req.params);
  const bus = deactivateAdminBus(busId);
  if (!bus) {
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  res.json(bus);
});

router.get("/admin/drivers", (_req, res) => res.json(listDrivers()));
router.post("/admin/drivers", (req, res) => {
  const input = CreateAdminDriverBody.parse(req.body);
  res.status(201).json(createDriver({ ...input, active: input.active ?? true }));
});

router.get("/admin/routes", (_req, res) => res.json(listRoutes()));
router.post("/admin/routes", (req, res) => {
  const input = CreateAdminRouteBody.parse(req.body);
  res.status(201).json(createRoute({ ...input, active: input.active ?? true }));
});

router.get("/admin/queues", (_req, res) => res.json(getAdminQueues()));
router.get("/admin/safety", (_req, res) => res.json(getAllSafetyReports()));

export default router;