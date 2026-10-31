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

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // 12-hour format e.g. "6:30 AM", "03:15 PM", "12:00 pm", "6:30AM"
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampmMatch) {
    let h = Number(ampmMatch[1]);
    const m = Number(ampmMatch[2]);
    const isPm = ampmMatch[3].toLowerCase() === "pm";
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (isPm && h !== 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return h * 60 + m;
  }

  // 24-hour format e.g. "06:30", "15:15", "6:30", "0:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = Number(match24[1]);
    const m = Number(match24[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  return null;
}

export function normalizeTime24(value: string | null | undefined): string | null {
  if (!value) return null;
  const mins = parseTimeToMinutes(value);
  if (mins == null) return value.trim();
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
  name?: string;
  shiftType?: string;
  startTime?: string | null;
  endTime?: string | null;
  direction?: string;
  routeId?: string | null;
  busId?: string | null;
  driverId?: string | null;
  operatingDays?: string;
  active?: boolean;
};

export type ShiftCreateInput = {
  name: string;
  shiftType?: string;
  startTime: string;
  endTime: string;
  direction?: string;
  operatingDays?: string;
  active?: boolean;
};

export async function createShift(input: ShiftCreateInput) {
  const name = input.name?.trim();
  if (!name) throw new Error("Shift name is required.");

  const rawStartTime = input.startTime?.trim();
  const rawEndTime = input.endTime?.trim();
  if (!rawStartTime) throw new Error("Departure time (start time) is required.");
  if (!rawEndTime) throw new Error("Return time (end time) is required.");

  const startMin = parseTimeToMinutes(rawStartTime);
  const endMin = parseTimeToMinutes(rawEndTime);
  if (startMin == null || endMin == null) throw new Error("Invalid time format. Please use HH:MM (e.g. 06:30 or 6:30 AM).");
  if (endMin <= startMin) throw new Error("Return time must be after departure time on the same day.");

  const startTime = normalizeTime24(rawStartTime)!;
  const endTime = normalizeTime24(rawEndTime)!;

  // Check for duplicate shift name
  const existingName = await db
    .select()
    .from(shifts)
    .where(eq(shifts.name, name))
    .limit(1);
  if (existingName.length > 0) {
    throw new Error(`A shift with the name "${name}" already exists.`);
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let id = `shift-${slug || Date.now()}`;
  const existingId = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
  if (existingId.length > 0) {
    id = `shift-${slug}-${Date.now()}`;
  }

  const direction = input.direction === "FROM_COLLEGE" ? "FROM_COLLEGE" : "TO_COLLEGE";
  const shiftType = (input.shiftType?.trim() || "REGULAR").toUpperCase();
  const operatingDays = input.operatingDays?.trim() || "MON,TUE,WED,THU,FRI";
  const active = input.active ?? true;

  const inserted = await db
    .insert(shifts)
    .values({
      id,
      name,
      shiftType,
      startTime,
      endTime,
      direction,
      operatingDays,
      active,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return inserted[0];
}

export async function deleteShift(shiftId: string) {
  const current = await getShiftById(shiftId);
  if (!current) throw new Error("Shift not found");

  const { shiftAssignments: saTable } = await import("./schema.ts");
  // Deactivate assignments for this shift
  await db.update(saTable).set({ active: false }).where(eq(saTable.shiftId, shiftId));

  // Remove the shift
  await db.delete(shifts).where(eq(shifts.id, shiftId));
  return { success: true, id: shiftId, name: current.name };
}

export async function validateAndUpdateShift(shiftId: string, input: ShiftUpdateInput) {
  const current = await getShiftById(shiftId);
  if (!current) throw new Error("Shift not found");

  const name = input.name !== undefined ? input.name?.trim() || current.name : current.name;
  const shiftType = input.shiftType !== undefined ? input.shiftType?.trim() || current.shiftType : current.shiftType;
  const rawStartTime = input.startTime !== undefined ? input.startTime?.trim() || null : current.startTime;
  const rawEndTime = input.endTime !== undefined ? input.endTime?.trim() || null : current.endTime;
  const direction = input.direction ?? current.direction;
  const routeId = input.routeId !== undefined ? input.routeId || null : current.routeId;
  const busId = input.busId !== undefined ? input.busId || null : current.busId;
  const driverId = input.driverId !== undefined ? input.driverId || null : current.driverId;
  const operatingDays = input.operatingDays ?? current.operatingDays;
  const active = input.active ?? current.active;

  if (!name) throw new Error("Shift name cannot be empty.");
  if (!rawStartTime) throw new Error("Start time is required.");
  if (!rawEndTime) throw new Error("End time is required.");

  const startMin = parseTimeToMinutes(rawStartTime);
  const endMin = parseTimeToMinutes(rawEndTime);
  if (startMin == null || endMin == null) throw new Error("Invalid time format. Use HH:MM (e.g. 06:30 or 6:30 AM).");
  if (endMin <= startMin) throw new Error("End time must be after start time on the same day.");

  const startTime = normalizeTime24(rawStartTime)!;
  const endTime = normalizeTime24(rawEndTime)!;

  // Only validate route if an explicit non-null routeId is set on this shift
  if (routeId) {
    const routes = await getDbRoutes();
    if (!routes.some((r) => r.id === routeId && r.active)) {
      throw new Error("Selected route is invalid or inactive.");
    }
  }

  // Only validate bus if an explicit non-null busId is set on this shift
  if (busId) {
    const bus = await getDbBusById(busId);
    if (!bus) throw new Error("Selected bus was not found.");
    if (!bus.active) throw new Error("Selected bus is inactive.");
  }

  if (driverId && active) {
    // Driver existence validated loosely via assignment; inactive drivers not modeled separately in DB
  }

  // Overlap check only if a specific single bus/driver is assigned directly to the shift table
  if (busId || driverId) {
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
  }

  const updated = await db
    .update(shifts)
    .set({
      name,
      shiftType,
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

  if (active && updated[0].busId && updated[0].driverId && updated[0].routeId) {
    try {
      await syncScheduledTripForShift(updated[0]);
    } catch {
      // Gracefully ignore if scheduled trip sync is not required
    }
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

export async function updateShiftBusTiming(shiftId: string, busId: string, departureTime: string | null) {
  const { shiftAssignments: saTable } = await import("./schema.ts");
  let normalized: string | null = null;
  if (departureTime && departureTime.trim()) {
    const mins = parseTimeToMinutes(departureTime);
    if (mins == null) throw new Error("Invalid departure time format. Please use HH:MM (e.g. 06:30 or 6:30 AM).");
    normalized = normalizeTime24(departureTime);
  }

  const existing = await db
    .select()
    .from(saTable)
    .where(and(eq(saTable.shiftId, shiftId), eq(saTable.busId, busId)))
    .limit(1);

  if (existing.length) {
    await db
      .update(saTable)
      .set({ departureTime: normalized, active: true })
      .where(eq(saTable.id, existing[0].id));
  } else {
    await db.insert(saTable).values({
      id: `sa-${shiftId}-${busId}-${Date.now()}`,
      shiftId,
      busId,
      departureTime: normalized,
      active: true,
    });
  }

  return { success: true, shiftId, busId, departureTime: normalized };
}

export async function removeBusFromShift(shiftId: string, busId: string) {
  const { shiftAssignments: saTable } = await import("./schema.ts");
  await db
    .update(saTable)
    .set({ active: false })
    .where(and(eq(saTable.shiftId, shiftId), eq(saTable.busId, busId)));

  return { success: true, shiftId, busId };
}

export async function getAllShiftsWithAssignments() {
  await ensureCanonicalShiftSlots();
  const allShifts = await db.select().from(shifts).orderBy(shifts.startTime);
  const { shiftAssignments: saTable } = await import("./schema.ts");
  const allAssignments = await db.select().from(saTable).where(eq(saTable.active, true));

  return allShifts.map((s) => {
    const assignments = allAssignments.filter((a) => a.shiftId === s.id);
    const busDepartureTimes: Record<string, string> = {};
    for (const a of assignments) {
      if (a.departureTime) {
        busDepartureTimes[a.busId] = a.departureTime;
      }
    }

    return {
      ...s,
      displayTime: formatShiftTimeDisplay(s.startTime),
      directionLabel: directionLabel(s.direction),
      assignedBusIds: assignments.map((a) => a.busId),
      busDepartureTimes,
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

