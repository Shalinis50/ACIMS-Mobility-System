import { Router, type IRouter } from "express";
import { requireAdmin, requireAuth } from "../middleware/acimsAuth.ts";
import {
  getRecTransportRoute,
  getRecTransportStatus,
  listRecTransportRoutes,
  publishAllOfficialPickups,
  publishRoutePickups,
  searchRecPickupPoints,
  syncRecTransportFromOfficialSource,
  updateRecTransportStop,
} from "../services/recTransport/recTransportService.ts";
import {
  activateOfficialCollegeFleet,
  createCollegeRoute,
  listCollegeRoutes,
  updateCollegeRoute,
} from "../services/recTransport/collegeFleetService.ts";
import { recordAdminAudit } from "../services/adminPortalService.ts";
import type { AuthRequest } from "../../../../src/middleware/auth.ts";

const router: IRouter = Router();

router.get("/rec-transport/status", async (_req, res) => {
  try {
    res.json(await getRecTransportStatus());
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to read REC transport status" });
  }
});

router.post("/rec-transport/sync", requireAuth, requireAdmin, async (req, res) => {
  try {
    const timetableUrl = typeof req.body?.timetableUrl === "string" ? req.body.timetableUrl : undefined;
    const publishOfficialPickups = Boolean(req.body?.publishOfficialPickups);
    const result = await syncRecTransportFromOfficialSource({ timetableUrl, publishOfficialPickups });
    const authUser = (req as AuthRequest).user as { uid?: string };
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "SYNC_REC_TRANSPORT",
      entityType: "rec_transport",
      entityId: result.timetableUrl,
      detail: `${result.routesImported} routes, ${result.stopsImported} stops`,
    });
    res.json({ ok: true, ...result, ...(await getRecTransportStatus()) });
  } catch (err: unknown) {
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "REC transport sync failed",
      ...(await getRecTransportStatus()),
    });
  }
});

router.get("/rec-transport/routes", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    res.json(await listRecTransportRoutes(q));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list routes" });
  }
});

router.get("/rec-transport/routes/:id", async (req, res) => {
  try {
    const detail = await getRecTransportRoute(req.params.id);
    if (!detail) return res.status(404).json({ error: "Route not found" });
    res.json(detail);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load route" });
  }
});

router.get("/rec-transport/pickups/search", async (req, res) => {
  try {
    const q = String(req.query.q || "");
    if (!q.trim()) return res.status(400).json({ error: "q required" });
    res.json(await searchRecPickupPoints(q));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Pickup search failed" });
  }
});

router.patch("/rec-transport/stops/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updated = await updateRecTransportStop(req.params.id, req.body ?? {});
    res.json(updated);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update stop" });
  }
});

router.post("/rec-transport/publish-pickups", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await publishAllOfficialPickups();
    const authUser = (req as AuthRequest).user as { uid?: string };
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "PUBLISH_REC_PICKUPS",
      entityType: "official_pickup_points",
      entityId: "rec-transport",
      detail: `${result.published} pickups from ${result.routesPublished} routes`,
    });
    res.json({ ok: true, ...result, ...(await getRecTransportStatus()) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update official pickup points" });
  }
});

router.post("/rec-transport/routes/:id/publish-pickups", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await publishRoutePickups(req.params.id);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to publish pickups" });
  }
});

router.get("/college-routes", requireAuth, requireAdmin, async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    res.json(await listCollegeRoutes(q));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list college routes" });
  }
});

router.post("/college-routes/activate-official", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await activateOfficialCollegeFleet();
    const authUser = (req as AuthRequest).user as { uid?: string };
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "ACTIVATE_REC_FLEET",
      entityType: "bus_routes",
      entityId: "rec-transport",
      detail: `${result.routesCount} official routes`,
    });
    res.json({ ok: true, ...result, routes: await listCollegeRoutes() });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to activate official routes" });
  }
});

router.post("/college-routes", requireAuth, requireAdmin, async (req, res) => {
  try {
    const created = await createCollegeRoute(req.body ?? {});
    res.status(201).json(created);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create route" });
  }
});

router.patch("/college-routes/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updated = await updateCollegeRoute(req.params.id, req.body ?? {});
    if (!updated) return res.status(404).json({ error: "Route not found" });
    res.json(updated);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update route" });
  }
});

export default router;
