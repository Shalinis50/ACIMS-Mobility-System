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
import {
  buses,
  busRoutes,
  busStops,
  profiles,
  drivers,
  safetyReports,
  shifts,
  shiftAssignments,
  officialPickupPoints,
  busLocations,
  trackingSessions,
} from "../../../../src/db/schema.ts";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../../../../src/db/index.ts";
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
// SHIFT MANAGEMENT (Morning, Evening, Exam slots & Bus Assignment)
// -------------------------------------------------------------
router.get("/admin/shifts", async (_req, res) => {
  try {
    const allShifts = await db.select().from(shifts).orderBy(shifts.startTime);
    const allAssignments = await db.select().from(shiftAssignments).where(eq(shiftAssignments.active, true));

    const result = allShifts.map((s) => {
      const assignedBuses = allAssignments.filter((a) => a.shiftId === s.id).map((a) => a.busId);
      return {
        id: s.id,
        name: s.name,
        shiftType: s.shiftType || "MORNING",
        slotTime: s.slotTime || s.startTime || "06:30",
        startTime: s.startTime,
        endTime: s.endTime,
        direction: s.direction || "TO_COLLEGE",
        examOnly: Boolean(s.examOnly),
        active: Boolean(s.active),
        assignedBusIds: assignedBuses,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list shifts" });
  }
});

router.get("/admin/shifts/:shiftId", async (req, res) => {
  const shift = await getShiftById(req.params.shiftId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });
  const assigns = await db.select().from(shiftAssignments).where(and(eq(shiftAssignments.shiftId, req.params.shiftId), eq(shiftAssignments.active, true)));
  res.json({
    ...shift,
    assignedBusIds: assigns.map((a) => a.busId),
  });
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
      message: `${updated.name} updated successfully.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update shift" });
  }
});

router.put("/admin/shifts/:shiftId/buses", async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { busIds } = req.body as { busIds: string[] };

    if (!Array.isArray(busIds)) {
      return res.status(400).json({ error: "busIds array is required" });
    }

    // Remove existing assignments for this shift
    await db.delete(shiftAssignments).where(eq(shiftAssignments.shiftId, shiftId));

    // Insert new assignments
    for (const bId of busIds) {
      if (!bId) continue;
      await db.insert(shiftAssignments).values({
        id: `assign-${shiftId}-${bId}-${Date.now()}`,
        shiftId,
        busId: bId,
        active: true,
      });
    }

    res.json({ success: true, shiftId, assignedBusIds: busIds });
  } catch (err: any) {
    console.error("Failed to update shift buses:", err);
    res.status(500).json({ error: err.message || "Failed to update shift buses" });
  }
});

router.post("/admin/shifts/:shiftId/toggle-active", async (req, res) => {
  try {
    const { shiftId } = req.params;
    const current = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
    if (!current.length) return res.status(404).json({ error: "Shift not found" });

    const newActive = !current[0].active;
    await db.update(shifts).set({ active: newActive }).where(eq(shifts.id, shiftId));

    res.json({ id: shiftId, active: newActive });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to toggle shift active state" });
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
// BUS MANAGEMENT (Persisted to PostgreSQL)
// -------------------------------------------------------------
router.get("/admin/buses", async (_req, res) => {
  try {
    const list = await getDbBuses();
    const routeList = await getDbRoutes();
    const routeMap = new Map(routeList.map((r) => [r.id, r]));

    const driverProfiles = await db
      .select({
        profileId: profiles.id,
        userId: profiles.userId,
        name: profiles.name,
      })
      .from(profiles)
      .where(eq(profiles.role, "DRIVER"));
    const driverMap = new Map(driverProfiles.map((d) => [d.userId, d.name]));

    const allStops = await db.select().from(busStops);
    const morningShift = (await db.select().from(shifts).where(eq(shifts.shiftType, "MORNING")).limit(1))[0];
    const shiftAssigns = await db.select().from(shiftAssignments).where(eq(shiftAssignments.active, true));

    const result = list.map((b) => {
      const assignedRoute = b.routeId ? routeMap.get(b.routeId) : null;
      const stops = b.routeId ? allStops.filter((s) => s.routeId === b.routeId) : [];
      const driverName = b.driverId ? (driverMap.get(b.driverId) || b.driverId) : "Not assigned";

      const assignedSlots = shiftAssigns.filter((sa) => sa.busId === b.id).map((sa) => sa.shiftId);
      const isMorningAssigned = morningShift ? assignedSlots.includes(morningShift.id) : false;
      const morningSlotDisplay = isMorningAssigned ? (morningShift?.slotTime || "6:30 AM") : "Unassigned";

      return {
        id: b.id,
        busNumber: b.busNumber,
        routeId: b.routeId || undefined,
        routeName: assignedRoute ? `${assignedRoute.routeName} (${assignedRoute.routeCode})` : (b.routeId || "Not assigned"),
        driverId: b.driverId || undefined,
        driverName,
        morningSlot: morningSlotDisplay,
        stopsCount: stops.length,
        capacity: b.capacity || 40,
        active: b.active,
        status: b.active ? "Active" : "Inactive",
        assignedShiftIds: assignedSlots,
      };
    });

    res.json(result);
  } catch (err: any) {
    console.error("Failed to list buses:", err);
    res.status(500).json({ error: "Failed to list buses" });
  }
});

router.post("/admin/buses", async (req, res) => {
  try {
    const { busNumber, routeId, driverId, capacity, active } = req.body;
    if (!busNumber?.trim()) {
      return res.status(400).json({ error: "Bus number is required" });
    }
    const cleanNum = busNumber.trim();
    const busId = `bus-${cleanNum.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    const created = await createDbBus({
      id: busId,
      busNumber: cleanNum,
      routeId: routeId?.trim() || undefined,
      driverId: driverId?.trim() || null,
      capacity: capacity ? Number(capacity) : 40,
      active: active !== undefined ? Boolean(active) : true,
    });

    const authUser = (req as AuthRequest).user as { uid?: string };
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "CREATE_BUS",
      entityType: "bus",
      entityId: created.id,
      detail: created.busNumber,
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error("Error creating bus:", err);
    res.status(400).json({ error: err.message || "Failed to create bus" });
  }
});

router.patch("/admin/buses/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const { busNumber, routeId, driverId, capacity, active } = req.body;

    const updates: any = {};
    if (busNumber !== undefined) updates.busNumber = busNumber.trim();
    if (routeId !== undefined) updates.routeId = routeId ? routeId.trim() : null;
    if (driverId !== undefined) updates.driverId = driverId ? driverId.trim() : null;
    if (capacity !== undefined) updates.capacity = Number(capacity);
    if (active !== undefined) updates.active = Boolean(active);

    const updated = await updateDbBus(busId, updates);
    if (!updated) {
      return res.status(404).json({ error: "Bus not found" });
    }

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update bus" });
  }
});

router.delete("/admin/buses/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const permanent = req.query.permanent === "true";
    if (permanent) {
      await db.delete(shiftAssignments).where(eq(shiftAssignments.busId, busId));
      await db.delete(buses).where(eq(buses.id, busId));
      res.json({ success: true, deleted: busId });
    } else {
      const updated = await updateDbBus(busId, { active: false });
      if (!updated) return res.status(404).json({ error: "Bus not found" });
      res.json({ success: true, bus: updated });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to deactivate bus" });
  }
});

// -------------------------------------------------------------
// LIVE MONITORING (All registered buses table for Admin)
// -------------------------------------------------------------
router.get("/admin/live-monitoring", async (_req, res) => {
  try {
    const busList = await getDbBuses();
    const routeList = await getDbRoutes();
    const routeMap = new Map(routeList.map((r) => [r.id, r]));

    const driverProfiles = await db
      .select({
        userId: profiles.userId,
        name: profiles.name,
      })
      .from(profiles)
      .where(eq(profiles.role, "DRIVER"));
    const driverMap = new Map(driverProfiles.map((d) => [d.userId, d.name]));

    const now = Date.now();

    const monitorList = await Promise.all(
      busList.map(async (b) => {
        const route = b.routeId ? routeMap.get(b.routeId) : null;
        const routeName = route ? `${route.routeName} (${route.routeCode})` : (b.routeId || "Not assigned");
        const driverName = b.driverId ? (driverMap.get(b.driverId) || b.driverId) : "Not assigned";

        const latestLoc = await db
          .select()
          .from(busLocations)
          .where(eq(busLocations.busId, b.id))
          .orderBy(desc(busLocations.recordedAt))
          .limit(1);

        const session = await db
          .select()
          .from(trackingSessions)
          .where(and(eq(trackingSessions.busId, b.id), eq(trackingSessions.status, "ACTIVE")))
          .limit(1);

        let status: "LIVE" | "OFFLINE" = "OFFLINE";
        let lastUpdateDisplay = "-";

        if (latestLoc.length > 0 && latestLoc[0].recordedAt) {
          const recordedTime = new Date(latestLoc[0].recordedAt).getTime();
          const secondsAgo = Math.max(0, Math.floor((now - recordedTime) / 1000));
          if (secondsAgo < 60) {
            lastUpdateDisplay = `${secondsAgo} sec ago`;
          } else if (secondsAgo < 3600) {
            lastUpdateDisplay = `${Math.floor(secondsAgo / 60)} min ago`;
          } else {
            lastUpdateDisplay = `${Math.floor(secondsAgo / 3600)} hr ago`;
          }

          if (session.length > 0 && secondsAgo < 180) {
            status = "LIVE";
          }
        }

        return {
          busId: b.id,
          busNumber: b.busNumber,
          routeName,
          driverName,
          status,
          lastUpdate: lastUpdateDisplay,
          latitude: latestLoc[0]?.latitude ?? null,
          longitude: latestLoc[0]?.longitude ?? null,
          active: b.active,
        };
      })
    );

    res.json(monitorList);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get live monitoring data" });
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
// ROUTE MANAGEMENT & STOP CHECKLIST
// -------------------------------------------------------------
router.get("/admin/routes", async (_req, res) => {
  try {
    const routeList = await getDbRoutes();
    const allStops = await db.select().from(busStops).orderBy(busStops.sequenceNumber);
    const allBuses = await db.select().from(buses);

    const result = routeList.map((r) => {
      const stops = allStops
        .filter((s) => s.routeId === r.id)
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
        .map((s) => ({
          id: s.id,
          stopName: s.stopName,
          sequenceNumber: s.sequenceNumber,
          approximateTime: s.approximateTime || "Approx.",
          isNonStop: Boolean(s.isNonStop),
          active: Boolean(s.active),
          latitude: s.latitude,
          longitude: s.longitude,
        }));

      const assignedBuses = allBuses
        .filter((b) => b.routeId === r.id)
        .map((b) => ({ id: b.id, busNumber: b.busNumber, driverId: b.driverId }));

      const destination = stops[stops.length - 1]?.stopName || "College Campus";

      return {
        id: r.id,
        routeCode: r.routeCode,
        routeName: r.routeName,
        name: `${r.routeName} (${r.routeCode})`,
        direction: r.direction || "TO_COLLEGE",
        startingTimeDisplay: r.startingTimeDisplay || "Approx.",
        campusArrivalDisplay: r.campusArrivalDisplay || "7:40 AM (Approx.)",
        destination,
        active: r.active,
        stops,
        assignedBuses,
        assignedBusIds: assignedBuses.map((b) => b.id),
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list routes" });
  }
});

router.post("/admin/routes", async (req, res) => {
  try {
    const { name, routeCode, direction, active } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "Route name is required" });
    }
    const cleanCode = routeCode?.trim() || name.split(" ")[0] || "RT";
    const routeId = `route-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    const created = await createDbRoute({
      id: routeId,
      routeName: name.trim(),
      routeCode: cleanCode,
      active: active !== undefined ? Boolean(active) : true,
    });

    // Update direction if provided
    if (direction) {
      await db.update(busRoutes).set({ direction }).where(eq(busRoutes.id, routeId));
    }

    res.status(201).json({
      id: created.id,
      name: created.routeName,
      routeName: created.routeName,
      routeCode: created.routeCode,
      direction: direction || "TO_COLLEGE",
      active: created.active,
      stops: [],
      assignedBuses: [],
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create route" });
  }
});

router.patch("/admin/routes/:routeId", async (req, res) => {
  try {
    const { routeId } = req.params;
    const { name, routeName, routeCode, direction, active } = req.body;

    const updates: any = {};
    if (name || routeName) updates.routeName = (name || routeName).trim();
    if (routeCode) updates.routeCode = routeCode.trim();
    if (direction) updates.direction = direction;
    if (active !== undefined) updates.active = Boolean(active);

    const updated = await updateDbRoute(routeId, updates);
    if (!updated) return res.status(404).json({ error: "Route not found" });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update route" });
  }
});

// Save complete ordered checklist of stops for a route
router.put("/admin/routes/:routeId/stops", async (req, res) => {
  try {
    const { routeId } = req.params;
    const { stops } = req.body as {
      stops: Array<{
        id?: string;
        stopName: string;
        approximateTime?: string;
        isNonStop?: boolean;
        active?: boolean;
        latitude?: number;
        longitude?: number;
      }>;
    };

    if (!Array.isArray(stops)) {
      return res.status(400).json({ error: "stops array is required" });
    }

    // Delete existing stops for this route
    await db.delete(busStops).where(eq(busStops.routeId, routeId));

    // Re-insert ordered stops with 1-based sequence
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      const seq = i + 1;
      const stopId = s.id || `stop-${routeId}-${seq}-${Date.now()}`;
      const stopLat = s.latitude || 13.0084 + seq * 0.005;
      const stopLng = s.longitude || 80.0034 + seq * 0.005;

      await db.insert(busStops).values({
        id: stopId,
        routeId,
        stopName: s.stopName.trim(),
        approximateTime: s.approximateTime?.trim() || (s.isNonStop ? "Non-stop" : "Approx."),
        isNonStop: Boolean(s.isNonStop),
        active: s.active !== undefined ? Boolean(s.active) : true,
        sequenceNumber: seq,
        latitude: stopLat,
        longitude: stopLng,
      });

      // Synchronize into official_pickup_points
      const existingPickup = await db.select().from(officialPickupPoints).where(eq(officialPickupPoints.id, stopId)).limit(1);
      if (existingPickup.length) {
        await db.update(officialPickupPoints).set({
          stopName: s.stopName.trim(),
          sequenceNumber: seq,
          scheduledTimeDisplay: s.approximateTime?.trim(),
          isNonStop: Boolean(s.isNonStop),
          active: s.active !== undefined ? Boolean(s.active) : true,
        }).where(eq(officialPickupPoints.id, stopId));
      } else {
        await db.insert(officialPickupPoints).values({
          id: stopId,
          routeId,
          stopName: s.stopName.trim(),
          sequenceNumber: seq,
          scheduledTimeDisplay: s.approximateTime?.trim(),
          isNonStop: Boolean(s.isNonStop),
          active: s.active !== undefined ? Boolean(s.active) : true,
          latitude: stopLat,
          longitude: stopLng,
          source: "ADMIN",
        });
      }
    }

    const refreshedStops = await db.select().from(busStops).where(eq(busStops.routeId, routeId)).orderBy(busStops.sequenceNumber);
    res.json({ success: true, routeId, stops: refreshedStops });
  } catch (err: any) {
    console.error("Failed to update route stops:", err);
    res.status(500).json({ error: err.message || "Failed to update route stops" });
  }
});

// Add a single stop to a route
router.post("/admin/routes/:routeId/stops", async (req, res) => {
  try {
    const { routeId } = req.params;
    const { stopName, approximateTime, isNonStop, latitude, longitude } = req.body;

    if (!stopName?.trim()) {
      return res.status(400).json({ error: "stopName is required" });
    }

    const currentStops = await db.select().from(busStops).where(eq(busStops.routeId, routeId));
    const nextSeq = currentStops.length + 1;
    const stopId = `stop-${routeId}-${nextSeq}-${Date.now()}`;
    const stopLat = latitude ? Number(latitude) : 13.0084 + nextSeq * 0.005;
    const stopLng = longitude ? Number(longitude) : 80.0034 + nextSeq * 0.005;

    const [created] = await db
      .insert(busStops)
      .values({
        id: stopId,
        routeId,
        stopName: stopName.trim(),
        approximateTime: approximateTime?.trim() || (isNonStop ? "Non-stop" : "Approx."),
        isNonStop: Boolean(isNonStop),
        sequenceNumber: nextSeq,
        latitude: stopLat,
        longitude: stopLng,
        active: true,
      })
      .returning();

    // Also add to official_pickup_points
    await db.insert(officialPickupPoints).values({
      id: stopId,
      routeId,
      stopName: stopName.trim(),
      sequenceNumber: nextSeq,
      scheduledTimeDisplay: approximateTime?.trim() || (isNonStop ? "Non-stop" : "Approx."),
      isNonStop: Boolean(isNonStop),
      latitude: stopLat,
      longitude: stopLng,
      active: true,
      source: "ADMIN",
    });

    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to add stop" });
  }
});

// Delete a stop from a route
router.delete("/admin/routes/:routeId/stops/:stopId", async (req, res) => {
  try {
    const { routeId, stopId } = req.params;
    await db.delete(busStops).where(and(eq(busStops.routeId, routeId), eq(busStops.id, stopId)));
    await db.delete(officialPickupPoints).where(eq(officialPickupPoints.id, stopId));

    // Re-sequence remaining stops
    const remaining = await db.select().from(busStops).where(eq(busStops.routeId, routeId)).orderBy(busStops.sequenceNumber);
    for (let i = 0; i < remaining.length; i++) {
      await db.update(busStops).set({ sequenceNumber: i + 1 }).where(eq(busStops.id, remaining[i].id));
      await db.update(officialPickupPoints).set({ sequenceNumber: i + 1 }).where(eq(officialPickupPoints.id, remaining[i].id));
    }

    res.json({ success: true, deletedStopId: stopId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to remove stop" });
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
