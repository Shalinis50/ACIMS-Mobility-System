import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "./index.ts";
import { shifts, trips } from "./schema.ts";
import { getDbBusById, getDbRoutes } from "./services.ts";

export const CANONICAL_SHIFT_TYPES = ["MORNING", "EVENING", "REGULAR", "EXAM_ONLY"] as const;
export type CanonicalShiftType = (typeof CANONICAL_SHIFT_TYPES)[number];

export const PRIMARY_SHIFTS = [
  {
    id: "shift-morning-630",
    name: "6:30 AM Shift",
    shiftType: "REGULAR",
    startTime: "06:30",
    endTime: "08:00",
    direction: "TO_COLLEGE",
    operatingDays: "MON,TUE,WED,THU,FRI",
    active: true,
  },
  {
    id: "shift-morning-830",
    name: "8:30 AM Shift",
    shiftType: "REGULAR",
    startTime: "08:30",
    endTime: "10:00",
    direction: "TO_COLLEGE",
    operatingDays: "MON,TUE,WED,THU,FRI",
    active: true,
  },
  {
    id: "shift-evening-315",
    name: "3:15 PM Shift",
    shiftType: "REGULAR",
    startTime: "15:15",
    endTime: "17:00",
    direction: "FROM_COLLEGE",
    operatingDays: "MON,TUE,WED,THU,FRI",
    active: true,
  },
  {
    id: "shift-evening-515",
    name: "5:15 PM Shift",
    shiftType: "REGULAR",
    startTime: "17:15",
    endTime: "19:00",
    direction: "FROM_COLLEGE",
    operatingDays: "MON,TUE,WED,THU,FRI",
    active: true,
  },
  {
    id: "shift-exam-1145",
    name: "11:45 AM Exam Service",
    shiftType: "EXAM_ONLY",
    startTime: "11:45",
    endTime: "13:30",
    direction: "FROM_COLLEGE",
    operatingDays: "MON,TUE,WED,THU,FRI",
    active: false,
  },
  {
    id: "shift-exam-1200",
    name: "12:00 PM Exam Service",
    shiftType: "EXAM_ONLY",
    startTime: "12:00",
    endTime: "13:45",
    direction: "FROM_COLLEGE",
    operatingDays: "MON,TUE,WED,THU,FRI",
    active: false,
  },
] as const;

export function parseTimeToMinutes(value: string): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const a0 = parseTimeToMinutes(startA);
  const a1 = parseTimeToMinutes(endA);
  const b0 = parseTimeToMinutes(startB);
  const b1 = parseTimeToMinutes(endB);
  if (a0 == null || a1 == null || b0 == null || b1 == null) return false;
  if (a1 <= a0 || b1 <= b0) return false;
  return a0 < b1 && b0 < a1;
}

export async function ensureCanonicalShiftSlots() {
  for (const s of PRIMARY_SHIFTS) {
    const existing = await db.select().from(shifts).where(eq(shifts.id, s.id)).limit(1);
    if (!existing.length) {
      await db.insert(shifts).values({
        id: s.id,
        name: s.name,
        shiftType: s.shiftType,
        startTime: s.startTime,
        endTime: s.endTime,
        direction: s.direction,
        operatingDays: s.operatingDays,
        active: s.active,
      });
    }
  }

  // Also seed default assignments for 6:30 AM and 3:15 PM if empty
  const { shiftAssignments: saTable } = await import("./schema.ts");
  const existingAssignments = await db.select().from(saTable).limit(1);
  if (existingAssignments.length === 0) {
    const defaultMorningBuses = ["bus-1", "bus-1b", "bus-1c", "bus-2", "bus-2b", "bus-18"];
    for (const bId of defaultMorningBuses) {
      await db.insert(saTable).values({
        id: `sa-morning-${bId}`,
        shiftId: "shift-morning-630",
        busId: bId,
        active: true,
      }).onConflictDoNothing();
    }
    const defaultEveningBuses = ["bus-1", "bus-1b", "bus-2", "bus-18"];
    for (const bId of defaultEveningBuses) {
      await db.insert(saTable).values({
        id: `sa-evening-${bId}`,
        shiftId: "shift-evening-315",
        busId: bId,
        active: true,
      }).onConflictDoNothing();
    }
  }
}

export async function listAdminShifts() {
  await ensureCanonicalShiftSlots();
  const rows = await db.select().from(shifts).orderBy(shifts.shiftType);
  return rows;
}

export async function getShiftById(shiftId: string) {
  const rows = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
  return rows[0] ?? null;
}

export async function getShiftByType(shiftType: CanonicalShiftType) {
  await ensureCanonicalShiftSlots();
  const rows = await db.select().from(shifts).where(eq(shifts.shiftType, shiftType)).limit(1);
  return rows[0] ?? null;
}

export type ShiftUpdateInput = {
  startTime?: string | null;
  endTime?: string | null;
  direction?: string;
  routeId?: string | null;
  busId?: string | null;
  driverId?: string | null;
  operatingDays?: string;
  active?: boolean;
};

export async function validateAndUpdateShift(shiftId: string, input: ShiftUpdateInput) {
  const current = await getShiftById(shiftId);
  if (!current) throw new Error("Shift not found");

  const startTime = input.startTime !== undefined ? input.startTime?.trim() || null : current.startTime;
  const endTime = input.endTime !== undefined ? input.endTime?.trim() || null : current.endTime;
  const direction = input.direction ?? current.direction;
  const routeId = input.routeId !== undefined ? input.routeId || null : current.routeId;
  const busId = input.busId !== undefined ? input.busId || null : current.busId;
  const driverId = input.driverId !== undefined ? input.driverId || null : current.driverId;
  const operatingDays = input.operatingDays ?? current.operatingDays;
  const active = input.active ?? current.active;

  if (!startTime) throw new Error("Start time is required.");
  if (!endTime) throw new Error("End time is required.");

  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (startMin == null || endMin == null) throw new Error("Invalid time format. Use HH:MM (24-hour).");
  if (endMin <= startMin) throw new Error("End time must be after start time on the same day.");

  if (routeId) {
    const routes = await getDbRoutes();
    if (!routes.some((r) => r.id === routeId && r.active)) {
      throw new Error("Selected route is invalid or inactive.");
    }
  } else if (active) {
    throw new Error("Route is required for an active shift.");
  }

  if (busId) {
    const bus = await getDbBusById(busId);
    if (!bus) throw new Error("Selected bus was not found.");
    if (!bus.active) throw new Error("Selected bus is inactive.");
  } else if (active) {
    throw new Error("Bus is required for an active shift.");
  }

  if (driverId && active) {
    // Driver existence validated loosely via assignment; inactive drivers not modeled separately in DB
  }

  const allShifts = await db.select().from(shifts).where(ne(shifts.id, shiftId));
  for (const other of allShifts) {
    if (!other.startTime || !other.endTime) continue;
    if (busId && other.busId === busId) {
      if (timeRangesOverlap(startTime, endTime, other.startTime, other.endTime)) {
        const bus = await getDbBusById(busId);
        const label = bus?.busNumber ? `BUS-${bus.busNumber}` : busId;
        throw new Error(`${label} is already assigned to another shift during this time.`);
      }
    }
    if (driverId && other.driverId === driverId) {
      if (timeRangesOverlap(startTime, endTime, other.startTime, other.endTime)) {
        throw new Error(`Driver is already assigned to another overlapping shift (${other.name}).`);
      }
    }
  }

  const updated = await db
    .update(shifts)
    .set({
      startTime,
      endTime,
      direction,
      routeId,
      busId,
      driverId,
      operatingDays,
      active,
      updatedAt: new Date(),
    })
    .where(eq(shifts.id, shiftId))
    .returning();

  if (active) {
    await syncScheduledTripForShift(updated[0]);
  }

  return updated[0];
}

function scheduledStartDateFromShiftStart(startTime: string, now = new Date()): Date {
  const [h, m] = startTime.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** Creates or updates today's SCHEDULED trip for an active shift (does not touch completed trips). */
export async function syncScheduledTripForShift(shift: typeof shifts.$inferSelect) {
  if (!shift.active || !shift.startTime || !shift.endTime || !shift.busId || !shift.driverId || !shift.routeId) {
    return null;
  }

  const scheduledStartAt = scheduledStartDateFromShiftStart(shift.startTime);
  const tripId = `scheduled-${shift.id}-${scheduledStartAt.toISOString().slice(0, 10)}`;

  const existing = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  if (existing.length && (existing[0].status === "COMPLETED" || existing[0].status === "CANCELLED")) {
    return existing[0];
  }

  const payload = {
    shiftId: shift.id,
    busId: shift.busId,
    driverId: shift.driverId,
    routeId: shift.routeId,
    status: "SCHEDULED",
    scheduledStartAt,
    shiftStartSnapshot: shift.startTime,
    shiftEndSnapshot: shift.endTime,
  };

  if (existing.length) {
    const updated = await db
      .update(trips)
      .set(payload)
      .where(eq(trips.id, tripId))
      .returning();
    return updated[0];
  }

  const inserted = await db
    .insert(trips)
    .values({
      id: tripId,
      ...payload,
    })
    .returning();
  return inserted[0];
}

export async function setShiftActive(shiftId: string, active: boolean) {
  const current = await getShiftById(shiftId);
  if (!current) throw new Error("Shift not found");
  if (active) {
    if (!current.startTime || !current.endTime) {
      throw new Error("Configure start and end times before activating this shift.");
    }
    return validateAndUpdateShift(shiftId, { active: true });
  }
  const updated = await db
    .update(shifts)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(shifts.id, shiftId))
    .returning();
  return updated[0];
}

export async function getActiveShiftsForStudents() {
  await ensureCanonicalShiftSlots();
  const rows = await db.select().from(shifts).where(eq(shifts.active, true));
  return rows
    .filter((s) => s.startTime && s.endTime && s.routeId && s.busId)
    .sort((a, b) => (a.shiftType === "MORNING" ? -1 : b.shiftType === "MORNING" ? 1 : 0));
}

export async function getShiftAssignedToBus(busId: string) {
  const rows = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.busId, busId), eq(shifts.active, true)))
    .orderBy(desc(shifts.updatedAt));
  return rows.find((s) => s.startTime && s.endTime) ?? null;
}

export async function resolveShiftTimingForBus(busId: string) {
  const activeTrip = await db
    .select()
    .from(trips)
    .where(and(eq(trips.busId, busId), eq(trips.status, "ACTIVE")))
    .orderBy(desc(trips.startedAt))
    .limit(1);

  if (activeTrip[0]?.shiftStartSnapshot) {
    return {
      shiftId: activeTrip[0].shiftId,
      shiftStartTime: activeTrip[0].shiftStartSnapshot,
      shiftEndTime: activeTrip[0].shiftEndSnapshot,
      pickupExpectedOffsetMinutes: 20,
    };
  }

  const shift = await getShiftAssignedToBus(busId);
  if (!shift?.startTime) return null;

  return {
    shiftId: shift.id,
    shiftStartTime: shift.startTime,
    shiftEndTime: shift.endTime,
    pickupExpectedOffsetMinutes: 20,
  };
}

export async function resolveShiftForDriverTrip(busId: string, driverId: string) {
  const assigned = await getShiftAssignedToBus(busId);
  if (!assigned || assigned.driverId !== driverId) {
    const rows = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.busId, busId), eq(shifts.driverId, driverId), eq(shifts.active, true)));
    return rows.find((s) => s.startTime && s.endTime) ?? assigned;
  }
  return assigned;
}

export function formatShiftTimeDisplay(hhmm: string | null | undefined): string {
  if (!hhmm) return "—";
  const mins = parseTimeToMinutes(hhmm);
  if (mins == null) return hhmm;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export function directionLabel(direction: string): string {
  if (direction === "TO_COLLEGE") return "Home → College";
  if (direction === "FROM_COLLEGE") return "College → Home";
  return direction;
}

export async function listShiftAssignmentsForShift(shiftId: string) {
  const { shiftAssignments: saTable } = await import("./schema.ts");
  return db.select().from(saTable).where(and(eq(saTable.shiftId, shiftId), eq(saTable.active, true)));
}

export async function setShiftAssignedBuses(shiftId: string, busIds: string[]) {
  const { shiftAssignments: saTable } = await import("./schema.ts");
  // Deactivate existing for this shift
  await db.update(saTable).set({ active: false }).where(eq(saTable.shiftId, shiftId));

  for (const busId of busIds) {
    const existing = await db
      .select()
      .from(saTable)
      .where(and(eq(saTable.shiftId, shiftId), eq(saTable.busId, busId)))
      .limit(1);

    if (existing.length) {
      await db.update(saTable).set({ active: true }).where(eq(saTable.id, existing[0].id));
    } else {
      await db.insert(saTable).values({
        id: `sa-${shiftId}-${busId}-${Date.now()}`,
        shiftId,
        busId,
        active: true,
      });
    }
  }
}

export async function updateShiftBusActiveStops(shiftId: string, busId: string, activeStopIds: string[]) {
  const { shiftAssignments: saTable } = await import("./schema.ts");
  const existing = await db
    .select()
    .from(saTable)
    .where(and(eq(saTable.shiftId, shiftId), eq(saTable.busId, busId)))
    .limit(1);

  const serialized = JSON.stringify(activeStopIds);
  if (existing.length) {
    await db.update(saTable).set({ activeStopIds: serialized, active: true }).where(eq(saTable.id, existing[0].id));
  } else {
    await db.insert(saTable).values({
      id: `sa-${shiftId}-${busId}-${Date.now()}`,
      shiftId,
      busId,
      activeStopIds: serialized,
      active: true,
    });
  }
}

export async function getAllShiftsWithAssignments() {
  await ensureCanonicalShiftSlots();
  const allShifts = await db.select().from(shifts).orderBy(shifts.startTime);
  const { shiftAssignments: saTable } = await import("./schema.ts");
  const allAssignments = await db.select().from(saTable).where(eq(saTable.active, true));

  return allShifts.map((s) => {
    const assignments = allAssignments.filter((a) => a.shiftId === s.id);
    return {
      ...s,
      displayTime: formatShiftTimeDisplay(s.startTime),
      directionLabel: directionLabel(s.direction),
      assignedBusIds: assignments.map((a) => a.busId),
      busStopsConfig: assignments.reduce<Record<string, string[]>>((acc, a) => {
        if (a.activeStopIds) {
          try {
            acc[a.busId] = JSON.parse(a.activeStopIds);
          } catch {
            acc[a.busId] = a.activeStopIds.split(",").filter(Boolean);
          }
        }
        return acc;
      }, {}),
    };
  });
}

