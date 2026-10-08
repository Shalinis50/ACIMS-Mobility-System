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
import { naturalBusSort } from "../../../../src/lib/naturalSort.ts";
import { INITIAL_DEMO_ROUTES } from "../../../../src/db/initialDemoRoutes.ts";
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
        routeId: b.routeId || undefined,
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

async function replaceRouteStops(routeId: string, stopIds: string[]) {
  await db.delete(busStops).where(eq(busStops.routeId, routeId));
  for (let i = 0; i < stopIds.length; i++) {
    const sid = stopIds[i];
    const label =
      sid.includes(" ")
        ? sid
        : sid.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    await db.insert(busStops).values({
      id: `${routeId}-stop-${i + 1}`,
      routeId,
      stopName: label,
      latitude: 13.0084 + i * 0.0008,
      longitude: 80.0033 + i * 0.0008,
      sequenceNumber: i + 1,
    });
  }
}

router.patch("/admin/routes/:routeId", async (req, res) => {
  try {
    const { routeId } = req.params;
    const { name, active, stopIds } = req.body as {
      name?: string;
      active?: boolean;
      stopIds?: string[];
    };

    const updated = await updateDbRoute(routeId, {
      ...(name ? { routeName: name } : {}),
      ...(active !== undefined ? { active } : {}),
    });

    if (!updated) {
      return res.status(404).json({ error: "Route not found" });
    }

    if (Array.isArray(stopIds) && stopIds.length > 0) {
      await replaceRouteStops(routeId, stopIds);
    }

    const stops = await db
      .select()
      .from(busStops)
      .where(eq(busStops.routeId, routeId))
      .orderBy(busStops.sequenceNumber);

    res.json({
      id: updated.id,
      name: updated.routeName,
      active: updated.active,
      destination: stops[stops.length - 1]?.stopName || "Campus",
      stopIds: stops.map((s) => s.stopName),
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

// -------------------------------------------------------------
// UNIFIED BUSES & ROUTES (ACMIS Combined Concept)
// -------------------------------------------------------------
const isMtcBusOrRoute = (b: { busNumber?: string; id?: string; source?: string; routeId?: string | null }, r?: { id?: string; source?: string; routeName?: string } | null) => {
  const num = (b.busNumber || "").toUpperCase();
  const id = (b.id || "").toLowerCase();
  const rId = (r?.id || b.routeId || "").toLowerCase();
  const rName = (r?.routeName || "").toUpperCase();
  return (
    num.includes("MTC") ||
    id.startsWith("mtc") ||
    b.source === "MTC" ||
    b.source === "PUBLIC_TRANSIT" ||
    rId.startsWith("mtc") ||
    r?.source === "MTC" ||
    rName.includes("MTC")
  );
};

router.get("/admin/buses-and-routes", async (_req, res) => {
  try {
    const rawBusList = await getDbBuses();
    const routeList = await getDbRoutes();
    // Exclude any MTC or public transit buses from ACMIS campus transport
    const busList = rawBusList.filter((b) => !isMtcBusOrRoute(b, routeList.find((r) => r.id === b.routeId)));

    const allStops = await db.select().from(busStops).orderBy(busStops.sequenceNumber);
    const driverProfiles = await db
      .select({
        driverId: drivers.id,
        userId: profiles.userId,
        name: profiles.name,
        phone: profiles.phone,
        assignedBusId: drivers.assignedBusId,
      })
      .from(drivers)
      .innerJoin(profiles, eq(drivers.profileId, profiles.id));

    const { getAllShiftsWithAssignments } = await import("../../../../src/db/shiftManagement.ts");
    const shiftsWithAssignments = await getAllShiftsWithAssignments();
    const { buildBusTelemetry } = await import("./buses.ts");

    const items = await Promise.all(
      busList.map(async (b) => {
        const route = routeList.find((r) => r.id === b.routeId);
        const rawRouteName = route ? route.routeName.replace(/^\d+[A-Z]?\s*·?\s*/i, "").trim() : "CAMPUS";
        const routeName = rawRouteName || "CAMPUS";
        const displayName = `BUS ${b.busNumber} · ${routeName.toUpperCase()}`;

        const driver = driverProfiles.find((d) => d.userId === b.driverId || d.assignedBusId === b.id);
        const busRouteStops = allStops.filter((s) => s.routeId === b.routeId);

        // Find shifts assigning this bus
        const morningShift = shiftsWithAssignments.find((s) => s.direction === "TO_COLLEGE" && s.assignedBusIds.includes(b.id));
        const eveningShift = shiftsWithAssignments.find((s) => s.direction === "FROM_COLLEGE" && s.assignedBusIds.includes(b.id));

        // Get telemetry
        let telemetry = null;
        try {
          telemetry = await buildBusTelemetry(b.id);
        } catch {
          // ignore
        }

        let gpsStatus: "LIVE" | "STALE" | "GPS UNAVAILABLE" | "DELAYED" = "GPS UNAVAILABLE";
        if (telemetry?.isLive && telemetry.secondsAgo != null && telemetry.secondsAgo <= 90) {
          gpsStatus = (telemetry.delayMinutes && telemetry.delayMinutes > 2) ? "DELAYED" : "LIVE";
        } else if (telemetry?.latitude != null && telemetry.longitude != null) {
          gpsStatus = "STALE";
        } else if (telemetry?.trackingStatus === "PAUSED") {
          gpsStatus = "STALE";
        }

        return {
          id: b.id,
          busNumber: b.busNumber,
          routeId: b.routeId,
          routeName: routeName.toUpperCase(),
          displayName,
          driverId: b.driverId || driver?.userId,
          driverName: driver?.name ?? null,
          driverPhone: driver?.phone ?? null,
          morningShift: morningShift ? morningShift.startTime || "6:30 AM" : null,
          eveningShift: eveningShift ? eveningShift.startTime || "3:15 PM" : null,
          stopCount: busRouteStops.length,
          stops: busRouteStops.map((s) => {
            const demoRoute = INITIAL_DEMO_ROUTES.find((dr) => dr.routeNumber.toUpperCase() === b.busNumber.toUpperCase());
            const demoStop = demoRoute?.stops.find((ds) => ds.name.toLowerCase() === s.stopName.toLowerCase());
            return {
              id: s.id,
              name: s.stopName,
              time: demoStop?.time || "Scheduled",
              latitude: s.latitude,
              longitude: s.longitude,
              sequence: s.sequenceNumber,
            };
          }),
          gpsStatus,
          latitude: telemetry?.isLive ? telemetry.latitude : null,
          longitude: telemetry?.isLive ? telemetry.longitude : null,
          accuracy: telemetry?.isLive ? telemetry.accuracy : null,
          secondsAgo: telemetry?.secondsAgo ?? null,
          nextStop: telemetry?.nextStop ?? null,
          etaMinutes: telemetry?.etaMinutes ?? null,
          active: b.active,
        };
      })
    );

    // Natural sort by bus number (1, 1B, 1C, 2, 2B, 2C, 3, 3B, 3C, 4, 18...)
    items.sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));

    res.json(items);
  } catch (err: any) {
    console.error("[admin/buses-and-routes]", err);
    res.status(500).json({ error: "Failed to list buses and routes" });
  }
});

router.post("/admin/buses-and-routes", async (req, res) => {
  try {
    const { busNumber, routeName, driverId, driverName, driverPhone, morningShift, eveningShift, stops } = req.body as {
      busNumber: string;
      routeName: string;
      driverId?: string;
      driverName?: string;
      driverPhone?: string;
      morningShift?: string;
      eveningShift?: string;
      stops?: Array<{ name: string; time?: string; latitude?: number; longitude?: number }>;
    };

    if (!busNumber?.trim() || !routeName?.trim()) {
      return res.status(400).json({ error: "Bus number and Route name are required" });
    }

    const cleanNumber = busNumber.trim().toUpperCase();
    const cleanRoute = routeName.trim().toUpperCase();
    const busId = `bus-${cleanNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const routeId = `route-${cleanNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const fullRouteName = `${cleanNumber} · ${cleanRoute}`;

    // Handle driver creation/linking directly from the bus form
    let effectiveDriverId = driverId || null;
    if (driverName?.trim()) {
      const cleanDName = driverName.trim();
      const cleanDPhone = driverPhone?.trim() || null;
      let targetUserId = effectiveDriverId;
      let profId: number | null = null;

      if (targetUserId) {
        const existingProf = await db.select().from(profiles).where(eq(profiles.userId, targetUserId)).limit(1);
        if (existingProf.length) {
          profId = existingProf[0].id;
          await db.update(profiles).set({
            name: cleanDName,
            ...(cleanDPhone ? { phone: cleanDPhone } : {}),
          }).where(eq(profiles.userId, targetUserId));
        }
      }

      if (!profId) {
        targetUserId = `driver-${Date.now()}`;
        const newProf = await db.insert(profiles).values({
          userId: targetUserId,
          name: cleanDName,
          email: `${targetUserId}@acims.local`,
          phone: cleanDPhone,
          role: "DRIVER",
        }).returning();
        profId = newProf[0].id;
        await db.insert(drivers).values({
          profileId: profId,
          assignedBusId: busId,
        });
      }

      if (profId) {
        await db.update(drivers).set({ assignedBusId: busId }).where(eq(drivers.profileId, profId));
      }
      effectiveDriverId = targetUserId;
    }

    // 1. Create or update route
    await db.insert(busRoutes).values({
      id: routeId,
      routeName: fullRouteName,
      routeCode: cleanNumber,
      active: true,
      source: "ADMIN",
    }).onConflictDoNothing();

    // 2. Create or update bus
    await db.insert(buses).values({
      id: busId,
      busNumber: cleanNumber,
      routeId,
      driverId: effectiveDriverId,
      active: true,
      source: "ADMIN",
    }).onConflictDoNothing();

    // 3. Create initial stops if provided
    if (Array.isArray(stops) && stops.length > 0) {
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        await db.insert(busStops).values({
          id: `${routeId}-stop-${i + 1}`,
          routeId,
          stopName: s.name,
          latitude: s.latitude ?? 13.0084,
          longitude: s.longitude ?? 80.0033,
          sequenceNumber: i + 1,
        }).onConflictDoNothing();
      }
    } else {
      // Add default stops: Route Origin & College Campus
      await db.insert(busStops).values({
        id: `${routeId}-stop-1`,
        routeId,
        stopName: `${cleanRoute} Bus Stand`,
        latitude: 13.0827,
        longitude: 80.2707,
        sequenceNumber: 1,
      }).onConflictDoNothing();
      await db.insert(busStops).values({
        id: `${routeId}-stop-2`,
        routeId,
        stopName: "College Campus",
        latitude: 13.0084,
        longitude: 80.0033,
        sequenceNumber: 2,
      }).onConflictDoNothing();
    }

    // 4. Update shift assignments if selected
    const { setShiftAssignedBuses, listShiftAssignmentsForShift } = await import("../../../../src/db/shiftManagement.ts");
    if (morningShift) {
      const existingM = await listShiftAssignmentsForShift("shift-morning-630");
      const ids = Array.from(new Set([...existingM.map((x) => x.busId), busId]));
      await setShiftAssignedBuses("shift-morning-630", ids);
    }
    if (eveningShift) {
      const existingE = await listShiftAssignmentsForShift("shift-evening-315");
      const ids = Array.from(new Set([...existingE.map((x) => x.busId), busId]));
      await setShiftAssignedBuses("shift-evening-315", ids);
    }

    res.status(201).json({
      id: busId,
      busNumber: cleanNumber,
      routeId,
      routeName: cleanRoute,
      displayName: `BUS ${cleanNumber} · ${cleanRoute}`,
      driverId: effectiveDriverId,
      active: true,
    });
  } catch (err: any) {
    console.error("[admin/buses-and-routes POST]", err);
    res.status(400).json({ error: err.message || "Failed to create bus and route" });
  }
});

router.patch("/admin/buses-and-routes/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const { busNumber, routeName, driverId, driverName, driverPhone, active } = req.body as {
      busNumber?: string;
      routeName?: string;
      driverId?: string;
      driverName?: string;
      driverPhone?: string;
      active?: boolean;
    };

    const existingBus = await db.select().from(buses).where(eq(buses.id, busId)).limit(1);
    if (!existingBus.length) {
      return res.status(404).json({ error: "Bus not found" });
    }

    const bus = existingBus[0];
    const newNumber = busNumber ? busNumber.trim().toUpperCase() : bus.busNumber;

    // Handle driver name/phone edits directly on the bus form
    let assignedDriverId = driverId !== undefined ? (driverId || null) : bus.driverId;
    if (driverName !== undefined) {
      if (driverName.trim()) {
        const cleanDName = driverName.trim();
        const cleanDPhone = driverPhone?.trim() || null;
        let profId: number | null = null;
        let targetUserId = assignedDriverId;

        if (targetUserId) {
          const existingProf = await db.select().from(profiles).where(eq(profiles.userId, targetUserId)).limit(1);
          if (existingProf.length) {
            profId = existingProf[0].id;
            await db.update(profiles).set({
              name: cleanDName,
              ...(cleanDPhone !== null ? { phone: cleanDPhone } : {}),
            }).where(eq(profiles.userId, targetUserId));
          }
        }

        if (!profId) {
          targetUserId = `driver-${Date.now()}`;
          const newProf = await db.insert(profiles).values({
            userId: targetUserId,
            name: cleanDName,
            email: `${targetUserId}@acims.local`,
            phone: cleanDPhone,
            role: "DRIVER",
          }).returning();
          profId = newProf[0].id;
          await db.insert(drivers).values({
            profileId: profId,
            assignedBusId: busId,
          });
        }

        if (profId) {
          await db.update(drivers).set({ assignedBusId: busId }).where(eq(drivers.profileId, profId));
        }
        assignedDriverId = targetUserId;
      } else {
        // Driver cleared
        if (assignedDriverId) {
          const prof = await db.select().from(profiles).where(eq(profiles.userId, assignedDriverId)).limit(1);
          if (prof.length) {
            await db.update(drivers).set({ assignedBusId: null }).where(eq(drivers.profileId, prof[0].id));
          }
        }
        assignedDriverId = null;
      }
    } else if (driverPhone !== undefined && assignedDriverId) {
      // Just phone updated
      await db.update(profiles).set({ phone: driverPhone.trim() || null }).where(eq(profiles.userId, assignedDriverId));
    }

    await db
      .update(buses)
      .set({
        busNumber: newNumber,
        driverId: assignedDriverId,
        active: active !== undefined ? active : bus.active,
      })
      .where(eq(buses.id, busId));

    if (bus.routeId && routeName) {
      const cleanRoute = routeName.trim().toUpperCase();
      await db
        .update(busRoutes)
        .set({
          routeName: `${newNumber} · ${cleanRoute}`,
        })
        .where(eq(busRoutes.id, bus.routeId));
    }

    res.json({
      id: busId,
      busNumber: newNumber,
      driverId: assignedDriverId,
      active,
      message: "Bus & route updated successfully",
    });
  } catch (err: any) {
    console.error("[admin/buses-and-routes PATCH]", err);
    res.status(400).json({ error: err.message || "Failed to update bus and route" });
  }
});

router.put("/admin/buses-and-routes/:busId/stops", async (req, res) => {
  try {
    const { busId } = req.params;
    const { stops } = req.body as {
      stops: Array<{ id?: string; name: string; time?: string; latitude?: number; longitude?: number }>;
    };

    const existingBus = await db.select().from(buses).where(eq(buses.id, busId)).limit(1);
    if (!existingBus.length || !existingBus[0].routeId) {
      return res.status(404).json({ error: "Bus or associated route not found" });
    }

    const routeId = existingBus[0].routeId;
    await db.delete(busStops).where(eq(busStops.routeId, routeId));

    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      await db.insert(busStops).values({
        id: s.id || `${routeId}-stop-${i + 1}-${Date.now()}`,
        routeId,
        stopName: s.name.trim(),
        latitude: s.latitude ?? 13.0084,
        longitude: s.longitude ?? 80.0033,
        sequenceNumber: i + 1,
      });
    }

    res.json({ success: true, count: stops.length, message: "Route stops updated successfully" });
  } catch (err: any) {
    console.error("[admin/buses-and-routes/:busId/stops]", err);
    res.status(400).json({ error: err.message || "Failed to update stops" });
  }
});

// -------------------------------------------------------------
// SHIFT ASSIGNMENTS (Bulk checklist & per-bus stop checklist)
// -------------------------------------------------------------
router.get("/admin/shift-assignments", async (_req, res) => {
  try {
    const { getAllShiftsWithAssignments } = await import("../../../../src/db/shiftManagement.ts");
    const shifts = await getAllShiftsWithAssignments();
    res.json(shifts);
  } catch (err: any) {
    console.error("[admin/shift-assignments GET]", err);
    res.status(500).json({ error: "Failed to list shift assignments" });
  }
});

router.put("/admin/shift-assignments/:shiftId", async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { busIds } = req.body as { busIds: string[] };

    if (!Array.isArray(busIds)) {
      return res.status(400).json({ error: "busIds array is required" });
    }

    const { setShiftAssignedBuses } = await import("../../../../src/db/shiftManagement.ts");
    await setShiftAssignedBuses(shiftId, busIds);

    res.json({
      success: true,
      shiftId,
      assignedCount: busIds.length,
      message: "Shift assignment saved.",
    });
  } catch (err: any) {
    console.error("[admin/shift-assignments PUT]", err);
    res.status(400).json({ error: err.message || "Failed to update shift assignments" });
  }
});

router.put("/admin/shift-assignments/:shiftId/bus/:busId/stops", async (req, res) => {
  try {
    const { shiftId, busId } = req.params;
    const { activeStopIds } = req.body as { activeStopIds: string[] };

    if (!Array.isArray(activeStopIds)) {
      return res.status(400).json({ error: "activeStopIds array is required" });
    }

    const { updateShiftBusActiveStops } = await import("../../../../src/db/shiftManagement.ts");
    await updateShiftBusActiveStops(shiftId, busId, activeStopIds);

    res.json({
      success: true,
      shiftId,
      busId,
      activeStopCount: activeStopIds.length,
      message: "Stop checklist for shift saved.",
    });
  } catch (err: any) {
    console.error("[admin/shift-assignments/:shiftId/bus/:busId/stops]", err);
    res.status(400).json({ error: err.message || "Failed to update stop checklist" });
  }
});

// -------------------------------------------------------------
// LIVE BUSES MONITORING (All registered buses on map with real GPS)
// -------------------------------------------------------------
router.get("/admin/live-buses", async (_req, res) => {
  try {
    const rawBusList = await getDbBuses();
    const routeList = await getDbRoutes();
    const busList = rawBusList.filter((b) => !isMtcBusOrRoute(b, routeList.find((r) => r.id === b.routeId)));

    const allStops = await db.select().from(busStops).orderBy(busStops.sequenceNumber);
    const driverProfiles = await db
      .select({
        driverId: drivers.id,
        userId: profiles.userId,
        name: profiles.name,
        phone: profiles.phone,
        assignedBusId: drivers.assignedBusId,
      })
      .from(drivers)
      .innerJoin(profiles, eq(drivers.profileId, profiles.id));

    const { buildBusTelemetry } = await import("./buses.ts");

    const busesWithGps = await Promise.all(
      busList.map(async (b) => {
        const route = routeList.find((r) => r.id === b.routeId);
        const routeName = route ? route.routeName.replace(/^\d+[A-Z]?\s*·?\s*/i, "").trim() : "CAMPUS";
        const displayName = `BUS ${b.busNumber} · ${routeName.toUpperCase()}`;
        const driver = driverProfiles.find((d) => d.userId === b.driverId || d.assignedBusId === b.id);

        let telemetry = null;
        try {
          telemetry = await buildBusTelemetry(b.id);
        } catch {
          // ignore
        }

        let status: "LIVE" | "STALE" | "GPS UNAVAILABLE" | "DELAYED" = "GPS UNAVAILABLE";
        if (telemetry?.isLive && telemetry.secondsAgo != null && telemetry.secondsAgo <= 90) {
          status = (telemetry.delayMinutes && telemetry.delayMinutes > 2) ? "DELAYED" : "LIVE";
        } else if (telemetry?.latitude != null && telemetry.longitude != null) {
          status = "STALE";
        } else if (telemetry?.trackingStatus === "PAUSED") {
          status = "STALE";
        }

        return {
          id: b.id,
          busNumber: b.busNumber,
          routeId: b.routeId,
          routeName: routeName.toUpperCase(),
          displayName,
          driverName: driver?.name ?? "Driver not assigned",
          driverPhone: driver?.phone ?? "Phone not available",
          status,
          latitude: telemetry?.isLive ? telemetry.latitude : (status === "STALE" ? telemetry?.latitude : null),
          longitude: telemetry?.isLive ? telemetry.longitude : (status === "STALE" ? telemetry?.longitude : null),
          accuracy: telemetry?.accuracy ? `±${Math.round(telemetry.accuracy)}m` : "Coordinates unavailable",
          lastUpdate: telemetry?.secondsAgo != null && telemetry.secondsAgo !== Infinity ? `${telemetry.secondsAgo}s ago` : "No telemetry",
          routeLabel: `${routeName} → REC Campus`,
          nextStop: telemetry?.nextStop ?? (status === "LIVE" ? "En route" : "GPS unavailable"),
          eta: telemetry?.etaMinutes != null ? `${telemetry.etaMinutes} min` : "ETA unavailable",
          active: b.active,
        };
      })
    );

    // Natural sort by bus number
    busesWithGps.sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));

    // Map stop markers (only campus stops with valid coordinates)
    const campusRouteIds = new Set(busList.map((b) => b.routeId));
    const stopMarkers = allStops
      .filter((s) => s.latitude != null && s.longitude != null && campusRouteIds.has(s.routeId))
      .map((s) => {
        const route = routeList.find((r) => r.id === s.routeId);
        const bus = busList.find((b) => b.routeId === s.routeId);
        return {
          id: s.id,
          name: s.stopName,
          busId: bus?.id,
          busNumber: bus?.busNumber,
          busDisplayName: bus ? `BUS ${bus.busNumber} · ${(route?.routeName || '').toUpperCase()}` : undefined,
          routeName: route?.routeName,
          sequence: s.sequenceNumber,
          latitude: s.latitude,
          longitude: s.longitude,
          time: "Scheduled",
        };
      });

    const counters = {
      total: busesWithGps.length,
      live: busesWithGps.filter((b) => b.status === "LIVE").length,
      stale: busesWithGps.filter((b) => b.status === "STALE").length,
      gpsUnavailable: busesWithGps.filter((b) => b.status === "GPS UNAVAILABLE").length,
      delayed: busesWithGps.filter((b) => b.status === "DELAYED").length,
    };

    res.json({
      buses: busesWithGps,
      stops: stopMarkers,
      counters,
    });
  } catch (err: any) {
    console.error("[admin/live-buses]", err);
    res.status(500).json({ error: "Failed to load live buses" });
  }
});

// -------------------------------------------------------------
// OFFICIAL PICKUP POINTS MANAGEMENT
// -------------------------------------------------------------
router.get("/admin/pickup-points", async (req, res) => {
  try {
    const routeIdFilter = typeof req.query.routeId === "string" ? req.query.routeId : undefined;
    const { officialPickupPoints } = await import("../../../../src/db/schema.ts");
    const { getDbRoutes } = await import("../../../../src/db/services.ts");

    const query = routeIdFilter
      ? db.select().from(officialPickupPoints).where(eq(officialPickupPoints.routeId, routeIdFilter)).orderBy(officialPickupPoints.sequenceNumber)
      : db.select().from(officialPickupPoints).orderBy(officialPickupPoints.sequenceNumber);

    const rows = await query;
    const routes = await getDbRoutes();

    const filteredRows = rows.filter((p) => {
      const route = routes.find((r) => r.id === p.routeId);
      return !isMtcBusOrRoute({ routeId: p.routeId }, route);
    });

    const result = filteredRows.map((p) => {
      const route = routes.find((r) => r.id === p.routeId);
      return {
        id: p.id,
        routeId: p.routeId,
        routeName: route?.routeName || p.routeId,
        stopName: p.stopName,
        latitude: p.latitude,
        longitude: p.longitude,
        sequenceNumber: p.sequenceNumber,
        scheduledTimeDisplay: p.scheduledTimeDisplay || "Scheduled",
        source: p.source,
        active: p.active,
      };
    });

    res.json(result);
  } catch (err: any) {
    console.error("[admin/pickup-points GET]", err);
    res.status(500).json({ error: "Failed to load pickup points" });
  }
});

router.post("/admin/pickup-points", async (req, res) => {
  try {
    const { routeId, stopName, scheduledTimeDisplay, latitude, longitude, sequenceNumber } = req.body;
    if (!routeId || !stopName?.trim()) {
      return res.status(400).json({ error: "routeId and stopName are required" });
    }

    const { officialPickupPoints } = await import("../../../../src/db/schema.ts");
    const id = `pickup-${routeId}-${Date.now()}`;

    const inserted = await db
      .insert(officialPickupPoints)
      .values({
        id,
        routeId,
        stopName: stopName.trim(),
        scheduledTimeDisplay: scheduledTimeDisplay || null,
        latitude: latitude != null ? Number(latitude) : null,
        longitude: longitude != null ? Number(longitude) : null,
        sequenceNumber: Number(sequenceNumber) || 1,
        source: "ADMIN",
        active: true,
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (err: any) {
    console.error("[admin/pickup-points POST]", err);
    res.status(400).json({ error: err.message || "Failed to create pickup point" });
  }
});

router.patch("/admin/pickup-points/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { stopName, scheduledTimeDisplay, latitude, longitude, sequenceNumber, active } = req.body;
    const { officialPickupPoints } = await import("../../../../src/db/schema.ts");

    const updated = await db
      .update(officialPickupPoints)
      .set({
        ...(stopName ? { stopName: stopName.trim() } : {}),
        ...(scheduledTimeDisplay !== undefined ? { scheduledTimeDisplay } : {}),
        ...(latitude !== undefined ? { latitude: latitude != null ? Number(latitude) : null } : {}),
        ...(longitude !== undefined ? { longitude: longitude != null ? Number(longitude) : null } : {}),
        ...(sequenceNumber !== undefined ? { sequenceNumber: Number(sequenceNumber) } : {}),
        ...(active !== undefined ? { active } : {}),
      })
      .where(eq(officialPickupPoints.id, id))
      .returning();

    if (!updated.length) return res.status(404).json({ error: "Pickup point not found" });
    res.json(updated[0]);
  } catch (err: any) {
    console.error("[admin/pickup-points PATCH]", err);
    res.status(400).json({ error: err.message || "Failed to update pickup point" });
  }
});

router.delete("/admin/pickup-points/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { officialPickupPoints } = await import("../../../../src/db/schema.ts");
    await db.delete(officialPickupPoints).where(eq(officialPickupPoints.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    console.error("[admin/pickup-points DELETE]", err);
    res.status(500).json({ error: "Failed to delete pickup point" });
  }
});

export default router;
