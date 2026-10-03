import { desc, eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.ts";
import { listAdminAuditLogs, recordAdminAudit } from "../../../../src/db/adminAuditOps.ts";
import { listTripsByStatus, getMobilityAnalyticsSummary } from "../../../../src/db/mobilityOps.ts";
import {
  createDbNotification,
  getDbCampusLocations,
  getLatestBusLocation,
  getDbBuses,
} from "../../../../src/db/services.ts";
import { mobilityEvents, profiles, students } from "../../../../src/db/schema.ts";
import { getCommandCenterSnapshot } from "./commandCenterService.ts";
import { assessTripDelay, predictTripDelay } from "./delayEngine.ts";
import { calculatePickupEta } from "./pickupEtaEngine.ts";
import { evaluateFreshness } from "./gpsEngine.ts";
import { isGeminiConfigured, getGeminiAdminTelemetry } from "./geminiNavi.ts";

export { recordAdminAudit, listAdminAuditLogs };

const NAVI_TOOLS = [
  "get_live_bus",
  "get_my_bus",
  "get_eta",
  "get_delay",
  "get_next_shift",
  "get_pickup_points",
  "get_nearest_stop",
  "get_campus_location",
  "get_campus_route",
  "get_public_transport",
];

export async function getAdminTransportDashboard() {
  const snapshot = await getCommandCenterSnapshot();
  const analytics = await getMobilityAnalyticsSummary();
  const gpsReliable =
    snapshot.fleet.length > 0
      ? Math.round(
          (snapshot.fleet.filter((f) => !f.isGpsIssue).length / snapshot.fleet.length) * 1000,
        ) / 10
      : 100;

  return {
    ...snapshot,
    analytics: {
      ...analytics,
      gpsReliabilityPercent: gpsReliable,
    },
  };
}

export async function getGpsHealthFleet() {
  const snapshot = await getCommandCenterSnapshot();
  return snapshot.fleet.map((row) => {
    let state: "CONNECTED" | "WEAK_GPS" | "OFFLINE" = "CONNECTED";
    if (row.isGpsIssue && row.secondsSinceGps > 120) state = "OFFLINE";
    else if (row.isGpsIssue || row.gpsFreshness === "STALE") state = "WEAK_GPS";

    return {
      busId: row.busId,
      busNumber: row.busNumber,
      gpsState: state,
      trackingStatus: row.trackingStatus,
      secondsSinceUpdate: row.secondsSinceGps,
      latitude: row.latitude,
      longitude: row.longitude,
      speed: row.speed,
      heading: row.heading,
      accuracy: row.accuracy,
      lastUpdate: row.lastGpsAt,
    };
  });
}

export async function getEtaDelayBoard() {
  const snapshot = await getCommandCenterSnapshot();
  const now = new Date();
  const { getBusShiftTimingContext } = await import("./shiftTiming.ts");

  return Promise.all(
    snapshot.fleet.map(async (row) => {
      const gpsStale = row.isGpsIssue || row.secondsSinceGps > 30;
      const shiftCtx = await getBusShiftTimingContext(row.busId);
      const assessment = shiftCtx
        ? assessTripDelay({
            busId: row.busId,
            shiftStartTime: shiftCtx.shiftStartTime,
            pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
            currentEtaToPickupMinutes: row.etaMinutes ?? 30,
            now,
          })
        : { delayMinutes: 0, status: "ON_TIME" as const, expectedArrivalMinutesFromShiftStart: 0, predictedArrivalMinutesFromShiftStart: 0 };
      const prediction = predictTripDelay({
        assessment,
        gpsStale,
        speedMps: row.speed,
        secondsSinceGps: row.secondsSinceGps,
      });

      return {
        busId: row.busId,
        busNumber: row.busNumber,
        etaMinutes: row.etaMinutes,
        delayMinutes: row.delayMinutes,
        delayStatus: row.delayStatus,
        prediction,
      };
    }),
  );
}

export async function listAdminStudents() {
  const studentProfiles = await db.select().from(profiles).where(eq(profiles.role, "STUDENT"));
  const rows = await db.select().from(students);
  const byProfileId = new Map(rows.map((s) => [s.profileId, s]));

  return studentProfiles.map((p) => {
    const s = byProfileId.get(p.id);
    return {
      userId: p.userId,
      name: p.name,
      email: p.email,
      registerNumber: s?.registerNumber ?? null,
      pickupStopId: s?.pickupStopId ?? null,
      assignedBusId: s?.assignedBusId ?? null,
      assignedRouteId: s?.assignedRouteId ?? null,
      status: "ACTIVE",
    };
  });
}

export async function updateStudentTransport(
  userId: string,
  patch: { pickupStopId?: string; assignedBusId?: string; assignedRouteId?: string },
) {
  const profile = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile.length) return null;

  const existing = await db.select().from(students).where(eq(students.profileId, profile[0].id)).limit(1);
  if (!existing.length) return null;

  const updated = await db
    .update(students)
    .set({
      pickupStopId: patch.pickupStopId ?? existing[0].pickupStopId,
      assignedBusId: patch.assignedBusId ?? existing[0].assignedBusId,
      assignedRouteId: patch.assignedRouteId ?? existing[0].assignedRouteId,
    })
    .where(eq(students.profileId, profile[0].id))
    .returning();

  return { ...profile[0], ...updated[0] };
}

export async function listRecentMobilityNotifications(limit = 60) {
  const events = await db.select().from(mobilityEvents).orderBy(desc(mobilityEvents.createdAt)).limit(limit);
  return events.map((e) => ({
    id: e.id,
    userId: e.userId,
    busId: e.busId,
    eventType: e.eventType,
    createdAt: e.createdAt,
    payload: (() => {
      try {
        return JSON.parse(e.payload);
      } catch {
        return {};
      }
    })(),
  }));
}

export type BroadcastTarget =
  | { scope: "ALL" }
  | { scope: "BUS"; busId: string }
  | { scope: "ROUTE"; routeId: string }
  | { scope: "PICKUP"; pickupStopId: string };

export async function sendAdminBroadcast(input: {
  title: string;
  message: string;
  target: BroadcastTarget;
}) {
  const allStudents = await listAdminStudents();
  let recipients = allStudents;

  if (input.target.scope === "BUS") {
    recipients = allStudents.filter((s) => s.assignedBusId === input.target.busId);
  } else if (input.target.scope === "ROUTE") {
    recipients = allStudents.filter((s) => s.assignedRouteId === input.target.routeId);
  } else if (input.target.scope === "PICKUP") {
    recipients = allStudents.filter((s) => s.pickupStopId === input.target.pickupStopId);
  }

  const sent: string[] = [];
  for (const student of recipients) {
    const note = await createDbNotification(student.userId, "ADMIN_BROADCAST", input.title, input.message);
    if (note) sent.push(student.userId);
  }

  return { recipientCount: sent.length, userIds: sent };
}

export function getNaviAdminStatus() {
  const telemetry = getGeminiAdminTelemetry();
  return {
    status: isGeminiConfigured() ? "ONLINE" : "OFFLINE",
    provider: "Gemini",
    apiConnected: isGeminiConfigured(),
    lastSuccessfulRequestAt: telemetry.lastSuccessAt,
    tools: NAVI_TOOLS,
  };
}

export async function listCampusLocationsAdmin() {
  return getDbCampusLocations();
}

export async function getExtendedAnalytics() {
  const base = await getMobilityAnalyticsSummary();
  const snapshot = await getCommandCenterSnapshot();
  const gpsReliable =
    snapshot.fleet.length > 0
      ? Math.round(
          (snapshot.fleet.filter((f) => !f.isGpsIssue).length / snapshot.fleet.length) * 1000,
        ) / 10
      : 100;

  const buses = await getDbBuses();
  const busUsage = buses.map((b) => ({
    busId: b.id,
    busNumber: b.busNumber,
    trips: 0,
  }));

  return {
    ...base,
    gpsReliabilityPercent: gpsReliable,
    fleetOnTime: snapshot.counters.onTime,
    fleetDelayed: snapshot.counters.delayed,
    busUsage,
  };
}

export async function getAdminTrips(status?: string, limit = 80) {
  return listTripsByStatus(status, limit);
}

/** Enrich a single bus row for live map detail panel. */
export async function getBusLiveDetail(busId: string) {
  const buses = await getDbBuses();
  const bus = buses.find((b) => b.id === busId);
  if (!bus) return null;

  const loc = await getLatestBusLocation(busId);
  const freshness = loc
    ? evaluateFreshness(loc.recordedAt, new Date())
    : { freshness: "UNAVAILABLE" as const, secondsSinceUpdate: 9999 };

  let etaMinutes: number | null = null;
  let delayMinutes = 0;
  if (loc) {
    const eta = calculatePickupEta(busId, { latitude: loc.latitude, longitude: loc.longitude }, "tambaram");
    if (eta) {
      etaMinutes = eta.etaMinutes;
      const { getBusShiftTimingContext } = await import("./shiftTiming.ts");
      const shiftCtx = await getBusShiftTimingContext(busId);
      if (shiftCtx) {
        const delay = assessTripDelay({
          busId,
          shiftStartTime: shiftCtx.shiftStartTime,
          pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
          currentEtaToPickupMinutes: eta.etaMinutes,
        });
        delayMinutes = delay.delayMinutes;
      }
    }
  }

  return {
    busId: bus.id,
    busNumber: bus.busNumber,
    driverId: bus.driverId,
    routeId: bus.routeId,
    currentLocation: loc ? { latitude: loc.latitude, longitude: loc.longitude } : null,
    nextStop: "Urapakkam",
    etaMinutes,
    delayMinutes,
    gps: freshness.freshness === "FRESH" ? "ACTIVE" : freshness.freshness,
    secondsSinceGps: freshness.secondsSinceUpdate,
    speed: loc?.speed ?? null,
    heading: loc?.heading ?? null,
  };
}
