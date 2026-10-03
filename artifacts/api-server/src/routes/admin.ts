import { Router, type IRouter, type RequestHandler } from "express";
import { requireAuth, requireAdmin } from "../middleware/acimsAuth.ts";
import {
  CreateAdminBusBody,
  CreateAdminDriverBody,
  CreateAdminRouteBody,
  DeactivateAdminBusParams,
  GetAdminDashboardResponse,
  UpdateAdminBusBody,
  UpdateAdminBusParams,
} from "@workspace/api-zod";
import { db } from "../../../../src/db/index.ts";
import { buses, busRoutes, busStops, profiles, drivers, safetyReports } from "../../../../src/db/schema.ts";
import { eq, desc } from "drizzle-orm";
import {
  getDbBuses,
  createDbBus,
  updateDbBus,
  getDbRoutes,
  createDbRoute,
  updateDbRoute,
} from "../../../../src/db/services.ts";
import { listProviders } from "../services/transport";
import { getAdminQueues } from "../services/admin";
import type { AuthRequest } from "../../../../src/middleware/auth.ts";
import {
  getAdminTransportDashboard,
  getGpsHealthFleet,
  getEtaDelayBoard,
  listAdminStudents,
  updateStudentTransport,
  listRecentMobilityNotifications,
  sendAdminBroadcast,
  getNaviAdminStatus,
  listCampusLocationsAdmin,
  getExtendedAnalytics,
  getAdminTrips,
  getBusLiveDetail,
  listAdminAuditLogs,
  recordAdminAudit,
} from "../services/adminPortalService.ts";
import { getCommandCenterSnapshot } from "../services/commandCenterService.ts";
import {
  listAdminShifts,
  getShiftById,
  validateAndUpdateShift,
  setShiftActive,
} from "../../../../src/db/shiftManagement.ts";

const router: IRouter = Router();

const requireAdminRole: RequestHandler = (req, res, next) => {
  const role = req.header("x-acims-role");
  if (!role) {
    res.status(401).json({ error: "Unauthorized: Admin authorization required" });
    return;
  }
  if (role.toLowerCase() !== "admin") {
    res.status(403).json({ error: "Forbidden: Admin role required" });
    return;
  }
  next();
};
router.use("/admin", requireAuth, requireAdminRole, requireAdmin);

// -------------------------------------------------------------
// DASHBOARD
// -------------------------------------------------------------
router.get("/admin/dashboard", async (_req, res) => {
  try {
    const busList = await getDbBuses();
    const routeList = await getDbRoutes();
    let reports: (typeof safetyReports.$inferSelect)[] = [];
    try {
      reports = await db.select().from(safetyReports);
    } catch {
      reports = [];
    }

    let commandCounters = {
      activeBuses: busList.filter((b) => b.active).length,
      activeDrivers: 0,
      activeTrips: 0,
      onTime: 0,
      delayed: 0,
      gpsIssues: 0,
    };
    try {
      const command = await getCommandCenterSnapshot();
      commandCounters = command.counters;
    } catch (err) {
      console.warn("[admin/dashboard] command center snapshot skipped:", err);
    }

    const dashboard = {
      activeBuses: commandCounters.activeBuses,
      activeDrivers: commandCounters.activeDrivers,
      activeTrips: commandCounters.activeTrips,
      onTime: commandCounters.onTime,
      delayedBuses: commandCounters.delayed,
      gpsIssues: commandCounters.gpsIssues,
      activeRoutes: routeList.filter((r) => r.active).length,
      queueEntries: getAdminQueues().reduce((total, q) => total + q.queueSize, 0),
      openSafetyReports: reports.filter((r) => r.status === "OPEN" || r.status === "UNDER REVIEW").length,
      providersOnline: listProviders().filter((p) => p.status === "live").length,
      systemStatus: "Operational",
      fleetSize: busList.filter((b) => b.active).length,
    };
    res.json(dashboard);
  } catch (err: any) {
    console.error("[admin/dashboard]", err);
    res.status(500).json({ error: "Failed to generate admin dashboard" });
  }
});

router.get("/admin/transport-dashboard", async (_req, res) => {
  try {
    res.json(await getAdminTransportDashboard());
  } catch {
    res.status(500).json({ error: "Failed to load transport dashboard" });
  }
});

router.get("/admin/gps-health", async (_req, res) => {
  res.json(await getGpsHealthFleet());
});

router.get("/admin/eta-delays", async (_req, res) => {
  res.json(await getEtaDelayBoard());
});

router.get("/admin/eta-monitoring", async (_req, res) => {
  const { getAdminEtaMonitoring } = await import("../services/etaMonitoringService.ts");
  res.json(await getAdminEtaMonitoring());
});

router.get("/admin/delay-monitoring", async (_req, res) => {
  const { getAdminDelayMonitoring } = await import("../services/etaMonitoringService.ts");
  res.json(await getAdminDelayMonitoring());
});

router.get("/admin/students", async (_req, res) => {
  res.json(await listAdminStudents());
});

router.patch("/admin/students/:userId/transport", async (req, res) => {
  const updated = await updateStudentTransport(req.params.userId, req.body);
  if (!updated) return res.status(404).json({ error: "Student not found" });
  const authUser = (req as AuthRequest).user as { uid?: string };
  await recordAdminAudit({
    adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
    action: "UPDATE_STUDENT_TRANSPORT",
    entityType: "student",
    entityId: req.params.userId,
    detail: JSON.stringify(req.body),
  });
  res.json(updated);
});

router.get("/admin/notifications/recent", async (_req, res) => {
  res.json(await listRecentMobilityNotifications());
});

router.post("/admin/broadcast", async (req, res) => {
  const { title, message, target } = req.body as {
    title?: string;
    message?: string;
    target?: { scope: string; busId?: string; routeId?: string; pickupStopId?: string };
  };
  if (!title?.trim() || !message?.trim() || !target?.scope) {
    return res.status(400).json({ error: "title, message, and target.scope required" });
  }
  const result = await sendAdminBroadcast({
    title: title.trim(),
    message: message.trim(),
    target: target as any,
  });
  const authUser = (req as AuthRequest).user as { uid?: string };
  await recordAdminAudit({
    adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
    action: "BROADCAST",
    entityType: "notification",
    detail: `${target.scope}: ${title}`,
  });
  res.json(result);
});

router.get("/admin/navi", async (_req, res) => {
  res.json(getNaviAdminStatus());
});

router.get("/admin/campus/locations", async (_req, res) => {
  res.json(await listCampusLocationsAdmin());
});

router.get("/admin/analytics/transport", async (_req, res) => {
  res.json(await getExtendedAnalytics());
});

router.get("/admin/trips", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const limit = Number(req.query.limit || 80);
  res.json(await getAdminTrips(status, limit));
});

router.get("/admin/buses/:busId/live", async (req, res) => {
  const detail = await getBusLiveDetail(req.params.busId);
  if (!detail) return res.status(404).json({ error: "Bus not found" });
  res.json(detail);
});

router.get("/admin/audit-logs", async (req, res) => {
  const limit = Number(req.query.limit || 100);
  res.json(await listAdminAuditLogs(Math.min(200, Math.max(1, limit))));
});

// -------------------------------------------------------------
// SHIFT MANAGEMENT (Morning / Evening canonical slots)
// -------------------------------------------------------------
router.get("/admin/shifts", async (_req, res) => {
  try {
    res.json(await listAdminShifts());
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list shifts" });
  }
});

router.get("/admin/shifts/:shiftId", async (req, res) => {
  const shift = await getShiftById(req.params.shiftId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });
  res.json(shift);
});

router.put("/admin/shifts/:shiftId", async (req, res) => {
  try {
    const updated = await validateAndUpdateShift(req.params.shiftId, req.body);
    const authUser = (req as AuthRequest).user as { uid?: string };
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "UPDATE_SHIFT",
      entityType: "shift",
      entityId: updated.id,
      detail: `${updated.name} ${updated.startTime}-${updated.endTime}`,
    });
    res.json({
      shift: updated,
      message: `${updated.name} timing updated successfully.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update shift" });
  }
});

router.post("/admin/shifts/:shiftId/activate", async (req, res) => {
  try {
    const updated = await setShiftActive(req.params.shiftId, true);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to activate shift" });
  }
});

router.post("/admin/shifts/:shiftId/deactivate", async (req, res) => {
  try {
    const updated = await setShiftActive(req.params.shiftId, false);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to deactivate shift" });
  }
});

// -------------------------------------------------------------
// BUS MANAGEMENT (Persisted to Cloud SQL PostgreSQL)
// -------------------------------------------------------------
router.get("/admin/buses", async (_req, res) => {
  try {
    const list = await getDbBuses();
    res.json(
      list.map((b) => ({
        id: b.id,
        busNumber: b.busNumber,
        routeId: b.routeId || "route-bus-12",
        driverId: b.driverId || undefined,
        capacity: 45,
        active: b.active,
        status: b.active ? "Active" : "Inactive",
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list buses" });
  }
});

router.post("/admin/buses", async (req, res) => {
  try {
    const input = CreateAdminBusBody.parse(req.body);
    const busId = `bus-${input.busNumber.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}`;

    const created = await createDbBus({
      id: busId,
      busNumber: input.busNumber,
      routeId: input.routeId,
      driverId: input.driverId,
      active: input.active ?? true,
    });

    const authUser = (req as AuthRequest).user as { uid?: string };
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "CREATE_BUS",
      entityType: "bus",
      entityId: created.id,
      detail: created.busNumber,
    });

    res.status(201).json({
      id: created.id,
      busNumber: created.busNumber,
      routeId: created.routeId || input.routeId,
      driverId: created.driverId || input.driverId,
      capacity: input.capacity,
      active: created.active,
      status: created.active ? "Active" : "Inactive",
    });
  } catch (err: any) {
    console.error("Error creating bus:", err);
    res.status(400).json({ error: "Failed to create bus" });
  }
});

router.patch("/admin/buses/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const input = UpdateAdminBusBody.partial().parse(req.body);

    const updated = await updateDbBus(busId, {
      ...(input.busNumber ? { busNumber: input.busNumber } : {}),
      ...(input.routeId ? { routeId: input.routeId } : {}),
      ...(input.driverId ? { driverId: input.driverId } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });

    if (!updated) {
      return res.status(404).json({ error: "Bus not found" });
    }

    res.json({
      id: updated.id,
      busNumber: updated.busNumber,
      routeId: updated.routeId || "route-bus-12",
      driverId: updated.driverId || undefined,
      capacity: input.capacity ?? 45,
      active: updated.active,
      status: updated.active ? "Active" : "Inactive",
    });
  } catch (err: any) {
    res.status(400).json({ error: "Failed to update bus" });
  }
});

router.delete("/admin/buses/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const updated = await updateDbBus(busId, { active: false });
    if (!updated) {
      return res.status(404).json({ error: "Bus not found" });
    }
    res.json({
      id: updated.id,
      busNumber: updated.busNumber,
      active: false,
      status: "Inactive",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to deactivate bus" });
  }
});

// -------------------------------------------------------------
// DRIVER MANAGEMENT (Persisted to Cloud SQL PostgreSQL)
// -------------------------------------------------------------
router.get("/admin/drivers", async (_req, res) => {
  try {
    const driverProfiles = await db
      .select({
        driverId: drivers.id,
        profileId: profiles.id,
        userId: profiles.userId,
        name: profiles.name,
        phone: profiles.phone,
        assignedBusId: drivers.assignedBusId,
      })
      .from(drivers)
      .innerJoin(profiles, eq(drivers.profileId, profiles.id));

    res.json(
      driverProfiles.map((d) => ({
        id: d.userId,
        name: d.name,
        phone: d.phone || "+91 98401 23450",
        active: true,
        busId: d.assignedBusId || undefined,
        routeId: d.assignedBusId ? `route-${d.assignedBusId}` : undefined,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list drivers" });
  }
});

router.post("/admin/drivers", async (req, res) => {
  try {
    const input = CreateAdminDriverBody.parse(req.body);
    const userId = `driver-${input.name.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}`;

    const prof = await db
      .insert(profiles)
      .values({
        userId,
        name: input.name,
        phone: input.phone,
        email: `${userId}@rec.edu.in`,
        role: "DRIVER",
      })
      .returning();

    await db.insert(drivers).values({
      profileId: prof[0].id,
      assignedBusId: input.busId || null,
    });

    res.status(201).json({
      id: userId,
      name: input.name,
      phone: input.phone,
      active: true,
      busId: input.busId,
      routeId: input.busId ? `route-${input.busId}` : undefined,
    });
  } catch (err: any) {
    res.status(400).json({ error: "Failed to create driver" });
  }
});

router.patch("/admin/drivers/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const { name, phone, busId } = req.body;

    const profs = await db.select().from(profiles).where(eq(profiles.userId, driverId));
    if (profs.length === 0) {
      return res.status(404).json({ error: "Driver not found" });
    }

    if (name || phone) {
      await db
        .update(profiles)
        .set({
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
        })
        .where(eq(profiles.userId, driverId));
    }

    if (busId !== undefined) {
      await db
        .update(drivers)
        .set({ assignedBusId: busId })
        .where(eq(drivers.profileId, profs[0].id));
    }

    res.json({
      id: driverId,
      name: name || profs[0].name,
      phone: phone || profs[0].phone,
      active: true,
      busId,
    });
  } catch (err: any) {
    res.status(400).json({ error: "Failed to update driver" });
  }
});

// -------------------------------------------------------------
// ROUTE MANAGEMENT (Persisted to Cloud SQL PostgreSQL)
// -------------------------------------------------------------
router.get("/admin/routes", async (_req, res) => {
  try {
    const routeList = await getDbRoutes();
    const result = await Promise.all(
      routeList.map(async (r) => {
        const stops = await db
          .select()
          .from(busStops)
          .where(eq(busStops.routeId, r.id))
          .orderBy(busStops.sequenceNumber);

        const assignedBuses = await db
          .select()
          .from(buses)
          .where(eq(buses.routeId, r.id));

        return {
          id: r.id,
          name: `${r.routeName} (${r.routeCode})`,
          destination: stops[stops.length - 1]?.stopName || "Campus Terminal",
          stopIds: stops.map((s) => s.id),
          active: r.active,
          assignedBusIds: assignedBuses.map((b) => b.id),
        };
      })
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list routes" });
  }
});

router.post("/admin/routes", async (req, res) => {
  try {
    const input = CreateAdminRouteBody.parse(req.body);
    const routeId = `route-bus-${input.name.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}`;

    const created = await createDbRoute({
      id: routeId,
      routeName: input.name,
      routeCode: input.name.split(" ")[0] || "RT",
      active: input.active ?? true,
    });

    if (input.stopIds && input.stopIds.length > 0) {
      for (let i = 0; i < input.stopIds.length; i++) {
        const sid = input.stopIds[i];
        await db.insert(busStops).values({
          id: `${routeId}-stop-${i + 1}`,
          routeId: created.id,
          stopName: sid.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          latitude: 12.92 + i * 0.01,
          longitude: 80.12 + i * 0.01,
          sequenceNumber: i + 1,
        }).onConflictDoNothing();
      }
    }

    res.status(201).json({
      id: created.id,
      name: created.routeName,
      destination: input.destination,
      stopIds: input.stopIds || [],
      active: created.active,
      assignedBusIds: [],
    });
  } catch (err: any) {
    res.status(400).json({ error: "Failed to create route" });
  }
});

router.patch("/admin/routes/:routeId", async (req, res) => {
  try {
    const { routeId } = req.params;
    const { name, active } = req.body;

    const updated = await updateDbRoute(routeId, {
      ...(name ? { routeName: name } : {}),
      ...(active !== undefined ? { active } : {}),
    });

    if (!updated) {
      return res.status(404).json({ error: "Route not found" });
    }

    res.json({
      id: updated.id,
      name: updated.routeName,
      active: updated.active,
    });
  } catch (err: any) {
    res.status(400).json({ error: "Failed to update route" });
  }
});

// -------------------------------------------------------------
// SAFETY & QUEUES
// -------------------------------------------------------------
router.get("/admin/queues", (_req, res) => res.json(getAdminQueues()));

router.get("/admin/safety", async (_req, res) => {
  try {
    const reports = await db.select().from(safetyReports).orderBy(desc(safetyReports.createdAt));
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list safety reports" });
  }
});

router.patch("/admin/safety/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body as { status?: string };
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updated = await db
      .update(safetyReports)
      .set({ status })
      .where(eq(safetyReports.id, reportId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update safety report" });
  }
});

export default router;
