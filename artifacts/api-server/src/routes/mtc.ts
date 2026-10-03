import { Router, type IRouter } from "express";
import { requireAdmin, requireAuth } from "../middleware/acimsAuth.ts";
import {
  buildGetToCollegeRecommendations,
  buildMissedBusMtcOptions,
  getMtcIntegrationStatus,
  getMtcRoutesForStop,
  getMtcTimingsForRoute,
  getNearestMtcStops,
  searchMtcRoutes,
  searchMtcStopsByName,
  syncMtcFromOfficialSource,
} from "../services/mtc/mtcService.ts";

const router: IRouter = Router();

router.get("/mtc/status", (_req, res) => {
  try {
    res.json(getMtcIntegrationStatus());
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to read MTC status" });
  }
});

router.post("/mtc/sync", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await syncMtcFromOfficialSource();
    res.json({ ok: true, ...result, status: getMtcIntegrationStatus().status });
  } catch (err: any) {
    res.status(502).json({
      ok: false,
      error: err.message || "MTC sync failed",
      status: getMtcIntegrationStatus().status,
    });
  }
});

router.get("/mtc/routes/search", (req, res) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : typeof req.query.query === "string" ? req.query.query : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    res.json(searchMtcRoutes({ query, limit }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mtc/stops/search", (req, res) => {
  try {
    const q = String(req.query.q || "");
    if (!q.trim()) return res.status(400).json({ error: "q required" });
    res.json(searchMtcStopsByName(q));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mtc/stops/nearby", (req, res) => {
  try {
    const lat = parseFloat(String(req.query.lat ?? req.query.latitude));
    const lon = parseFloat(String(req.query.lon ?? req.query.longitude));
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({ error: "lat and lon required" });
    }
    const radiusKm = req.query.radiusKm ? parseFloat(String(req.query.radiusKm)) : 5;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    res.json(getNearestMtcStops({ latitude: lat, longitude: lon, radiusKm, limit }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mtc/stops/:stopId/routes", (req, res) => {
  try {
    res.json(getMtcRoutesForStop(req.params.stopId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mtc/routes/:routeId/timings", (req, res) => {
  try {
    res.json(getMtcTimingsForRoute(req.params.routeId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mtc/get-to-college", (req, res) => {
  try {
    const latitude = req.query.latitude ? parseFloat(String(req.query.latitude)) : undefined;
    const longitude = req.query.longitude ? parseFloat(String(req.query.longitude)) : undefined;
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
    res.json(buildGetToCollegeRecommendations({ latitude, longitude, studentId }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mtc/missed-bus", (req, res) => {
  try {
    const lat = parseFloat(String(req.query.lat ?? req.query.latitude));
    const lon = parseFloat(String(req.query.lon ?? req.query.longitude));
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({ error: "lat and lon required" });
    }
    res.json(buildMissedBusMtcOptions({ latitude: lat, longitude: lon }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
