import fs from "node:fs";
import path from "node:path";
import { getDbBusById, getDbRoutes } from "../../../../src/db/services.ts";
import { db } from "../../../../src/db/index.ts";
import { students, profiles } from "../../../../src/db/schema.ts";
import { eq } from "drizzle-orm";
import {
  ensureCanonicalShiftSlots,
  getShiftByType,
  validateAndUpdateShift,
} from "../../../../src/db/shiftManagement.ts";
import { listPickupPoints, upsertPickupPoint } from "../../../../src/db/mobilityOps.ts";
import { getRouteForBus } from "./routesData.ts";

export type MvpCollegeRouteConfig = {
  enabled: boolean;
  routeId: string;
  busId: string;
  routeLabel: string;
  morningShiftStart: string;
  morningShiftEnd: string;
  updatedAt?: string;
};

const CONFIG_PATH = path.resolve(process.cwd(), "data/college-mvp-route.json");

const DEFAULT_CONFIG: MvpCollegeRouteConfig = {
  enabled: true,
  routeId: process.env.ACIMS_MVP_ROUTE_ID ?? "route-bus-12",
  busId: process.env.ACIMS_MVP_BUS_ID ?? "bus-12",
  routeLabel: "College bus route",
  morningShiftStart: process.env.ACIMS_MVP_SHIFT_START ?? "07:30",
  morningShiftEnd: process.env.ACIMS_MVP_SHIFT_END ?? "09:30",
};

let cached: MvpCollegeRouteConfig | null = null;

function readConfigFile(): MvpCollegeRouteConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as MvpCollegeRouteConfig;
    if (!raw.routeId || !raw.busId) return null;
    return { ...DEFAULT_CONFIG, ...raw, enabled: raw.enabled ?? true };
  } catch {
    return null;
  }
}

export function getMvpCollegeRoute(): MvpCollegeRouteConfig {
  if (!cached) cached = readConfigFile() ?? { ...DEFAULT_CONFIG };
  return cached;
}

export function isMvpCollegeRouteActive(): boolean {
  return getMvpCollegeRoute().enabled;
}

export function isBusOnCollegeRoute(busId: string): boolean {
  const mvp = getMvpCollegeRoute();
  if (!mvp.enabled) return true;
  return busId === mvp.busId;
}

export async function setMvpCollegeRoute(input: {
  routeId: string;
  busId: string;
  routeLabel?: string;
  morningShiftStart: string;
  morningShiftEnd?: string;
}) {
  const bus = await getDbBusById(input.busId);
  if (!bus) throw new Error("Selected bus was not found.");
  if (bus.routeId && bus.routeId !== input.routeId) {
    throw new Error("Selected bus is not assigned to this route in fleet records.");
  }

  const routes = await getDbRoutes();
  const route = routes.find((r) => r.id === input.routeId);
  if (!route) throw new Error("Selected route was not found.");

  const config: MvpCollegeRouteConfig = {
    enabled: true,
    routeId: input.routeId,
    busId: input.busId,
    routeLabel: input.routeLabel?.trim() || route.routeName,
    morningShiftStart: input.morningShiftStart,
    morningShiftEnd: input.morningShiftEnd ?? DEFAULT_CONFIG.morningShiftEnd,
    updatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  cached = config;

  await syncMorningShiftFromMvp(config);
  await seedPickupPointsForMvpRoute(config);
  await assignAllStudentsToMvp(config);

  return config;
}

async function syncMorningShiftFromMvp(config: MvpCollegeRouteConfig) {
  await ensureCanonicalShiftSlots();
  const morning = await getShiftByType("MORNING");
  if (!morning) return;
  await validateAndUpdateShift(morning.id, {
    routeId: config.routeId,
    busId: config.busId,
    startTime: config.morningShiftStart,
    endTime: config.morningShiftEnd,
    active: true,
    direction: "TO_COLLEGE",
  });
}

async function seedPickupPointsForMvpRoute(config: MvpCollegeRouteConfig) {
  const route = getRouteForBus(config.busId);
  if (!route) return;
  for (const stop of route.stops) {
    await upsertPickupPoint({
      id: stop.id,
      routeId: config.routeId,
      stopName: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      sequenceNumber: stop.sequence,
      geofenceRadiusM: 150,
      expectedOffsetMinutes: stop.sequence * 8,
      active: true,
    });
  }
  const all = await listPickupPoints();
  for (const p of all) {
    if (p.routeId !== config.routeId && p.active) {
      await upsertPickupPoint({
        id: p.id,
        routeId: p.routeId,
        stopName: p.stopName,
        latitude: p.latitude,
        longitude: p.longitude,
        sequenceNumber: p.sequenceNumber,
        geofenceRadiusM: p.geofenceRadiusM ?? 150,
        expectedOffsetMinutes: p.expectedOffsetMinutes ?? 0,
        active: false,
      });
    }
  }
}

async function assignAllStudentsToMvp(config: MvpCollegeRouteConfig) {
  const studentProfiles = await db.select().from(profiles).where(eq(profiles.role, "STUDENT"));
  for (const p of studentProfiles) {
    await db
      .update(students)
      .set({ assignedBusId: config.busId, assignedRouteId: config.routeId })
      .where(eq(students.profileId, p.id));
  }
}

export function clearMvpCache() {
  cached = null;
}
