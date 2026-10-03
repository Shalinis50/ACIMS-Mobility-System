import { and, desc, eq } from "drizzle-orm";
import { db } from "./index.ts";
import {
  officialPickupPoints,
  shiftAssignments,
  shifts,
  trips,
  students,
  mobilityEvents,
  notifications,
} from "./schema.ts";

import { timeRangesOverlap } from "./shiftManagement.ts";

function shiftsOverlap(
  aStart: string,
  aEnd: string | null | undefined,
  bStart: string,
  bEnd: string | null | undefined,
): boolean {
  if (!aEnd || !bEnd) return false;
  return timeRangesOverlap(aStart, aEnd, bStart, bEnd);
}

// ---------- Pickup points ----------
export async function listPickupPoints(routeId?: string) {
  if (routeId) {
    return db.select().from(officialPickupPoints).where(eq(officialPickupPoints.routeId, routeId));
  }
  return db.select().from(officialPickupPoints);
}

export async function upsertPickupPoint(input: {
  id: string;
  routeId: string;
  stopName: string;
  latitude: number;
  longitude: number;
  sequenceNumber: number;
  geofenceRadiusM?: number;
  expectedOffsetMinutes?: number;
  active?: boolean;
}) {
  const existing = await db.select().from(officialPickupPoints).where(eq(officialPickupPoints.id, input.id));
  if (existing.length) {
    const updated = await db
      .update(officialPickupPoints)
      .set({
        routeId: input.routeId,
        stopName: input.stopName,
        latitude: input.latitude,
        longitude: input.longitude,
        sequenceNumber: input.sequenceNumber,
        geofenceRadiusM: input.geofenceRadiusM ?? 150,
        expectedOffsetMinutes: input.expectedOffsetMinutes ?? 0,
        active: input.active ?? true,
      })
      .where(eq(officialPickupPoints.id, input.id))
      .returning();
    return updated[0];
  }
  const inserted = await db
    .insert(officialPickupPoints)
    .values({
      id: input.id,
      routeId: input.routeId,
      stopName: input.stopName,
      latitude: input.latitude,
      longitude: input.longitude,
      sequenceNumber: input.sequenceNumber,
      geofenceRadiusM: input.geofenceRadiusM ?? 150,
      expectedOffsetMinutes: input.expectedOffsetMinutes ?? 0,
      active: input.active ?? true,
    })
    .returning();
  return inserted[0];
}

export async function bindStudentPickup(studentUserId: string, pickupPointId: string) {
  await db.update(students).set({ pickupStopId: pickupPointId }).where(eq(students.registerNumber, studentUserId));
  const byProfile = await db.select().from(students).where(eq(students.pickupStopId, pickupPointId));
  return byProfile;
}

// ---------- Shifts ----------
export async function listShifts() {
  return db.select().from(shifts).orderBy(shifts.shiftType);
}

export async function createShift(input: {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
  direction: string;
  routeId?: string;
  operatingDays?: string;
}) {
  const inserted = await db
    .insert(shifts)
    .values({
      id: input.id,
      name: input.name,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      direction: input.direction,
      routeId: input.routeId ?? null,
      operatingDays: input.operatingDays ?? "MON,TUE,WED,THU,FRI",
      active: false,
    })
    .returning();
  return inserted[0];
}

export async function listShiftAssignments() {
  const rows = await db.select().from(shiftAssignments).where(eq(shiftAssignments.active, true));
  const shiftList = await listShifts();
  return rows.map((row) => ({
    ...row,
    shift: shiftList.find((s) => s.id === row.shiftId) ?? null,
  }));
}

export async function assignShift(input: { id: string; shiftId: string; busId: string; driverId: string }) {
  const allShifts = await db.select().from(shifts);
  const target = allShifts.find((s) => s.id === input.shiftId);
  if (!target) throw new Error("Shift not found");

  const assignments = await db
    .select()
    .from(shiftAssignments)
    .where(and(eq(shiftAssignments.active, true), eq(shiftAssignments.busId, input.busId)));

  for (const a of assignments) {
    const otherShift = allShifts.find((s) => s.id === a.shiftId);
    if (
      otherShift?.startTime &&
      otherShift.endTime &&
      target.startTime &&
      target.endTime &&
      shiftsOverlap(target.startTime, target.endTime, otherShift.startTime, otherShift.endTime)
    ) {
      throw new Error(`Bus ${input.busId} already assigned to overlapping shift ${otherShift.name}`);
    }
  }

  const driverAssignments = await db
    .select()
    .from(shiftAssignments)
    .where(and(eq(shiftAssignments.active, true), eq(shiftAssignments.driverId, input.driverId)));

  for (const a of driverAssignments) {
    const otherShift = allShifts.find((s) => s.id === a.shiftId);
    if (
      otherShift?.startTime &&
      otherShift.endTime &&
      target.startTime &&
      target.endTime &&
      shiftsOverlap(target.startTime, target.endTime, otherShift.startTime, otherShift.endTime)
    ) {
      throw new Error(`Driver ${input.driverId} already assigned to overlapping shift ${otherShift.name}`);
    }
  }

  const inserted = await db
    .insert(shiftAssignments)
    .values({
      id: input.id,
      shiftId: input.shiftId,
      busId: input.busId,
      driverId: input.driverId,
      active: true,
    })
    .returning();
  return inserted[0];
}

// ---------- Trips ----------
export async function getActiveTripForBus(busId: string) {
  const rows = await db
    .select()
    .from(trips)
    .where(and(eq(trips.busId, busId), eq(trips.status, "ACTIVE")))
    .orderBy(desc(trips.startedAt))
    .limit(1);
  return rows[0] || null;
}

export async function startTripFromDriverSession(params: {
  busId: string;
  driverId: string;
  routeId: string;
  shiftId?: string;
  trackingSessionId: string;
  scheduledStartAt?: Date | null;
  shiftStartSnapshot?: string | null;
  shiftEndSnapshot?: string | null;
}) {
  const tripId = `trip-${params.busId}-${Date.now()}`;
  const inserted = await db
    .insert(trips)
    .values({
      id: tripId,
      shiftId: params.shiftId,
      busId: params.busId,
      driverId: params.driverId,
      routeId: params.routeId,
      trackingSessionId: params.trackingSessionId,
      status: "ACTIVE",
      startedAt: new Date(),
      scheduledStartAt: params.scheduledStartAt ?? null,
      shiftStartSnapshot: params.shiftStartSnapshot ?? null,
      shiftEndSnapshot: params.shiftEndSnapshot ?? null,
    })
    .returning();
  return inserted[0];
}

export async function completeActiveTrip(busId: string) {
  const updated = await db
    .update(trips)
    .set({ status: "COMPLETED", endedAt: new Date() })
    .where(and(eq(trips.busId, busId), eq(trips.status, "ACTIVE")))
    .returning();
  return updated[0] || null;
}

export async function updateTripDelay(tripId: string, delayMinutes: number) {
  await db.update(trips).set({ delayMinutes }).where(eq(trips.id, tripId));
}

export async function getTripHistory(limit = 50) {
  return db.select().from(trips).orderBy(desc(trips.startedAt)).limit(limit);
}

export async function listTripsByStatus(status?: string, limit = 100) {
  const capped = Math.min(200, Math.max(1, limit));
  if (status) {
    return db
      .select()
      .from(trips)
      .where(eq(trips.status, status))
      .orderBy(desc(trips.startedAt))
      .limit(capped);
  }
  return getTripHistory(capped);
}

export async function getMobilityAnalyticsSummary() {
  const allTrips = await db.select().from(trips);
  const completed = allTrips.filter((t) => t.status === "COMPLETED");
  const avgDelay =
    completed.length > 0
      ? completed.reduce((sum, t) => sum + (t.delayMinutes ?? 0), 0) / completed.length
      : 0;

  return {
    totalTrips: allTrips.length,
    completedTrips: completed.length,
    activeTrips: allTrips.filter((t) => t.status === "ACTIVE").length,
    cancelledTrips: allTrips.filter((t) => t.status === "CANCELLED").length,
    averageDelayMinutes: Math.round(avgDelay * 10) / 10,
  };
}

// ---------- Mobility events / notifications ----------
export async function recordMobilityEvent(input: {
  id: string;
  userId: string;
  busId: string;
  tripId?: string;
  pickupPointId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  const existing = await db.select().from(mobilityEvents).where(eq(mobilityEvents.id, input.id)).limit(1);
  if (existing.length) return existing[0];

  await db.insert(mobilityEvents).values({
    id: input.id,
    userId: input.userId,
    busId: input.busId,
    tripId: input.tripId ?? null,
    pickupPointId: input.pickupPointId ?? null,
    eventType: input.eventType,
    payload: JSON.stringify(input.payload ?? {}),
  });

  const titleMap: Record<string, string> = {
    TRIP_STARTED: "Trip started",
    PROXIMITY_10: "Bus approaching",
    PROXIMITY_5: "Bus arriving soon",
    ARRIVED: "Bus arrived",
    DEPARTED: "Bus departed",
    DELAY: "Delay update",
    GPS_UNAVAILABLE: "GPS unavailable",
  };

  await db.insert(notifications).values({
    userId: input.userId,
    type: input.eventType,
    title: titleMap[input.eventType] ?? "Mobility update",
    message: String((input.payload as any)?.message ?? input.eventType),
  });

  return input;
}
