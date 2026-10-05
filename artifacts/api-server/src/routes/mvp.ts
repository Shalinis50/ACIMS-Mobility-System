import { Router, type IRouter } from "express";
import { requireAdmin } from "../middleware/acimsAuth.ts";
import { getDbBuses, getDbRoutes } from "../../../../src/db/services.ts";
import { listPickupPoints } from "../../../../src/db/mobilityOps.ts";
import {
  getMvpCollegeRoute,
  isMvpCollegeRouteActive,
  setMvpCollegeRoute,
} from "../services/mvpCollegeRouteService.ts";
import { getRouteForBus } from "../services/routesData.ts";
import { recordAdminAudit } from "../services/adminPortalService.ts";
import type { AuthRequest } from "../../../../src/middleware/auth.ts";

const router: IRouter = Router();

/** Public: student transport assignment. Dummy single-route MVP is disabled when official REC fleet exists. */
router.get("/mvp/college-route", async (_req, res) => {
  const config = getMvpCollegeRoute();
  if (!isMvpCollegeRouteActive()) {
    const pickups = (await listPickupPoints()).filter((p) => p.active);
    return res.json({
      enabled: false,
      routeId: null,
      busId: null,
      busNumber: null,
      routeLabel: "Official REC college buses",
      morningShiftStart: null,
      morningShiftEnd: null,
      directionLabel: "Home → College",
      pickupPoints: pickups.map((p) => ({
        id: p.id,
        stopName: p.stopName,
        sequenceNumber: p.sequenceNumber,
        scheduledTimeDisplay: p.scheduledTimeDisplay ?? null,
      })),
    });
  }
  const routeDef = getRouteForBus(config.busId);
  const pickups = (await listPickupPoints(config.routeId)).filter((p) => p.active);
  const buses = await getDbBuses();
  const bus = buses.find((b) => b.id === config.busId);

  res.json({
    ...config,
    busNumber: bus?.busNumber ?? null,
    directionLabel: routeDef ? `${routeDef.origin} → ${routeDef.destination}` : config.routeLabel,
    pickupPoints: pickups.map((p) => ({
      id: p.id,
      stopName: p.stopName,
      sequenceNumber: p.sequenceNumber,
    })),
  });
});

router.get("/admin/mvp/college-route", requireAdmin, async (_req, res) => {
  const config = getMvpCollegeRoute();
  const routes = await getDbRoutes();
  const buses = await getDbBuses();
  res.json({
    config,
    routes: routes.filter((r) => r.active),
    buses,
  });
});

router.put("/admin/mvp/college-route", requireAdmin, async (req, res) => {
  try {
    const { routeId, busId, routeLabel, morningShiftStart, morningShiftEnd } = req.body as {
      routeId?: string;
      busId?: string;
      routeLabel?: string;
      morningShiftStart?: string;
      morningShiftEnd?: string;
    };
    if (!routeId || !busId || !morningShiftStart) {
      return res.status(400).json({ error: "routeId, busId, and morningShiftStart are required." });
    }
    const config = await setMvpCollegeRoute({
      routeId,
      busId,
      routeLabel,
      morningShiftStart,
      morningShiftEnd,
    });
    const authUser = (req as AuthRequest).user as { uid?: string };
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "SET_MVP_COLLEGE_ROUTE",
      entityType: "college_route",
      entityId: config.routeId,
      detail: `bus=${config.busId} start=${config.morningShiftStart}`,
    });
    res.json({ config, message: "College route saved. All students use this route for ETA and delay." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save college route";
    res.status(400).json({ error: message });
  }
});

export default router;
