import { eq, or } from "drizzle-orm";
import { db } from "../../../../../src/db/index.ts";
import { busRoutes, buses, busStops, drivers, recTransportRoutes, students } from "../../../../../src/db/schema.ts";
import { recBusId, recRouteId } from "./recTransportParser.ts";

export const DUMMY_ROUTE_IDS = ["route-dummy-legacy-test"] as const;
export const DUMMY_BUS_IDS = ["bus-dummy-legacy-test"] as const;
export const DUMMY_PICKUP_IDS = ["dummy-pickup-legacy-test"] as const;

export type CollegeRouteRow = {
  id: string;
  routeNumber: string;
  routeName: string;
  startingTimeDisplay: string | null;
  startingTime24: string | null;
  campusArrivalDisplay: string | null;
  campusArrival24: string | null;
  busId: string | null;
  busNumber: string | null;
  active: boolean;
  source: string;
  manuallyEdited: boolean;
};

function isDummyRouteId(id: string) {
  return (DUMMY_ROUTE_IDS as readonly string[]).includes(id);
}

export async function deactivateDummyFleet() {
  let removedRoutes = 0;
  let removedBuses = 0;

  for (const id of DUMMY_BUS_IDS) {
    const existing = await db.select({ id: buses.id }).from(buses).where(eq(buses.id, id)).limit(1);
    if (!existing.length) continue;
    await db.delete(buses).where(eq(buses.id, id));
    removedBuses += 1;
  }

  for (const id of DUMMY_ROUTE_IDS) {
    const existing = await db.select({ id: busRoutes.id }).from(busRoutes).where(eq(busRoutes.id, id)).limit(1);
    if (!existing.length) continue;
    await db.delete(busStops).where(eq(busStops.routeId, id));
    await db.delete(busRoutes).where(eq(busRoutes.id, id));
    removedRoutes += 1;
  }

  await db
    .update(students)
    .set({ assignedBusId: null, assignedRouteId: null, pickupStopId: null })
    .where(
      or(
        ...DUMMY_BUS_IDS.map((id) => eq(students.assignedBusId, id)),
        ...DUMMY_ROUTE_IDS.map((id) => eq(students.assignedRouteId, id)),
        ...DUMMY_PICKUP_IDS.map((id) => eq(students.pickupStopId, id)),
      ),
    );

  await db.update(drivers).set({ assignedBusId: null }).where(or(...DUMMY_BUS_IDS.map((id) => eq(drivers.assignedBusId, id))));

  return { removedRoutes, removedBuses };
}

export async function promoteOfficialRecFleet() {
  const catalog = await db.select().from(recTransportRoutes).where(eq(recTransportRoutes.active, true));
  let routesUpserted = 0;
  let busesUpserted = 0;

  for (const rec of catalog) {
    const routeId = rec.id || recRouteId(rec.routeNumber);
    const [existingRoute] = await db.select().from(busRoutes).where(eq(busRoutes.id, routeId)).limit(1);
    const routeName = `${rec.routeNumber} ${rec.routeName}`.trim();
    if (!existingRoute) {
      await db.insert(busRoutes).values({
        id: routeId,
        routeName,
        routeCode: rec.routeNumber,
        startingTimeDisplay: rec.startingTimeDisplay,
        startingTime24: rec.startingTime24,
        campusArrivalDisplay: rec.campusArrivalDisplay,
        campusArrival24: rec.campusArrival24,
        source: "REC_TRANSPORT",
        manuallyEdited: false,
        active: true,
      });
      routesUpserted += 1;
    } else if (!existingRoute.manuallyEdited) {
      await db
        .update(busRoutes)
        .set({
          routeName,
          routeCode: rec.routeNumber,
          startingTimeDisplay: rec.startingTimeDisplay,
          startingTime24: rec.startingTime24,
          campusArrivalDisplay: rec.campusArrivalDisplay,
          campusArrival24: rec.campusArrival24,
          source: "REC_TRANSPORT",
          active: true,
        })
        .where(eq(busRoutes.id, routeId));
      routesUpserted += 1;
    }

    const busId = recBusId(rec.routeNumber);
    const [existingBus] = await db.select().from(buses).where(eq(buses.id, busId)).limit(1);
    if (!existingBus) {
      const [onRoute] = await db.select().from(buses).where(eq(buses.routeId, routeId)).limit(1);
      if (onRoute) {
        if (!onRoute.manuallyEdited) {
          await db
            .update(buses)
            .set({ busNumber: rec.routeNumber, source: "REC_TRANSPORT", active: true })
            .where(eq(buses.id, onRoute.id));
          busesUpserted += 1;
        }
      } else {
        await db.insert(buses).values({
          id: busId,
          busNumber: rec.routeNumber,
          routeId,
          active: true,
          source: "REC_TRANSPORT",
          manuallyEdited: false,
        });
        busesUpserted += 1;
      }
    } else if (!existingBus.manuallyEdited) {
      await db
        .update(buses)
        .set({
          busNumber: rec.routeNumber,
          routeId,
          source: "REC_TRANSPORT",
          active: true,
        })
        .where(eq(buses.id, busId));
      busesUpserted += 1;
    }
  }

  return { catalogRoutes: catalog.length, routesUpserted, busesUpserted };
}

export async function listCollegeRoutes(query?: string): Promise<CollegeRouteRow[]> {
  const allRoutes = await db.select().from(busRoutes);
  const allBuses = await db.select().from(buses);
  const recRows = await db.select().from(recTransportRoutes);
  const recById = new Map(recRows.map((r) => [r.id, r]));

  const rows: CollegeRouteRow[] = allRoutes
    .filter((r) => !isDummyRouteId(r.id))
    .map((route) => {
      const rec = recById.get(route.id);
      const bus = allBuses.find((b) => b.routeId === route.id && b.active) ?? allBuses.find((b) => b.routeId === route.id);
      return {
        id: route.id,
        routeNumber: route.routeCode,
        routeName: rec?.routeName ?? route.routeName.replace(new RegExp(`^${route.routeCode}\\s+`), ""),
        startingTimeDisplay: route.startingTimeDisplay ?? rec?.startingTimeDisplay ?? null,
        startingTime24: route.startingTime24 ?? rec?.startingTime24 ?? null,
        campusArrivalDisplay: route.campusArrivalDisplay ?? rec?.campusArrivalDisplay ?? null,
        campusArrival24: route.campusArrival24 ?? rec?.campusArrival24 ?? null,
        busId: bus?.id ?? null,
        busNumber: bus?.busNumber ?? route.routeCode,
        active: route.active,
        source: route.source || (rec ? "REC_TRANSPORT" : "ADMIN"),
        manuallyEdited: Boolean(route.manuallyEdited || rec?.manuallyEdited),
      };
    })
    .sort((a, b) => a.routeNumber.localeCompare(b.routeNumber, undefined, { numeric: true }));

  const q = query?.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      r.routeNumber.toLowerCase().includes(q) ||
      r.routeName.toLowerCase().includes(q) ||
      (r.busNumber ?? "").toLowerCase().includes(q),
  );
}

export async function updateCollegeRoute(
  routeId: string,
  patch: {
    routeName?: string;
    routeNumber?: string;
    startingTime24?: string | null;
    campusArrival24?: string | null;
    busNumber?: string;
    active?: boolean;
  },
) {
  const [route] = await db.select().from(busRoutes).where(eq(busRoutes.id, routeId)).limit(1);
  if (!route) throw new Error("Route not found");
  if (isDummyRouteId(routeId)) throw new Error("Dummy routes cannot be edited. They have been removed.");

  const routeNumber = (patch.routeNumber ?? route.routeCode).trim();
  const routeName = (patch.routeName ?? route.routeName).trim();
  const displayName = routeName.startsWith(routeNumber) ? routeName : `${routeNumber} ${routeName}`.trim();
  const start24 = patch.startingTime24 !== undefined ? patch.startingTime24 : route.startingTime24;
  const campus24 = patch.campusArrival24 !== undefined ? patch.campusArrival24 : route.campusArrival24;

  await db
    .update(busRoutes)
    .set({
      routeName: displayName,
      routeCode: routeNumber,
      startingTimeDisplay: start24 ? toDisplay(start24) : route.startingTimeDisplay,
      startingTime24: start24,
      campusArrivalDisplay: campus24 ? toDisplay(campus24) : route.campusArrivalDisplay,
      campusArrival24: campus24,
      active: patch.active ?? route.active,
      manuallyEdited: true,
    })
    .where(eq(busRoutes.id, routeId));

  const [rec] = await db.select().from(recTransportRoutes).where(eq(recTransportRoutes.id, routeId)).limit(1);
  if (rec) {
    await db
      .update(recTransportRoutes)
      .set({
        routeNumber,
        routeName: routeName.replace(new RegExp(`^${routeNumber}\\s+`), ""),
        startingTimeDisplay: start24 ? toDisplay(start24) : rec.startingTimeDisplay,
        startingTime24: start24,
        campusArrivalDisplay: campus24 ? toDisplay(campus24) : rec.campusArrivalDisplay,
        campusArrival24: campus24,
        active: patch.active ?? rec.active,
        manuallyEdited: true,
      })
      .where(eq(recTransportRoutes.id, routeId));
  }

  if (patch.busNumber !== undefined || patch.active !== undefined) {
    const assigned = await db.select().from(buses).where(eq(buses.routeId, routeId));
    if (assigned.length) {
      await db
        .update(buses)
        .set({
          ...(patch.busNumber !== undefined ? { busNumber: patch.busNumber.trim() } : {}),
          ...(patch.active !== undefined ? { active: patch.active } : {}),
          manuallyEdited: true,
        })
        .where(eq(buses.id, assigned[0].id));
    } else if (patch.busNumber?.trim()) {
      await db.insert(buses).values({
        id: recBusId(routeNumber),
        busNumber: patch.busNumber.trim(),
        routeId,
        active: patch.active ?? true,
        source: rec ? "REC_TRANSPORT" : "ADMIN",
        manuallyEdited: true,
      });
    }
  }

  const rows = await listCollegeRoutes();
  return rows.find((r) => r.id === routeId) ?? null;
}

export async function createCollegeRoute(input: {
  routeNumber: string;
  routeName: string;
  startingTime24?: string | null;
  campusArrival24?: string | null;
  busNumber?: string;
}) {
  const routeNumber = input.routeNumber.trim();
  if (!routeNumber) throw new Error("Route number is required.");
  const routeName = input.routeName.trim();
  if (!routeName) throw new Error("Route name is required.");
  const id = recRouteId(routeNumber);
  const existing = await db.select().from(busRoutes).where(eq(busRoutes.id, id)).limit(1);
  if (existing.length) throw new Error(`Route ${routeNumber} already exists.`);

  await db.insert(busRoutes).values({
    id,
    routeName: `${routeNumber} ${routeName}`.trim(),
    routeCode: routeNumber,
    startingTimeDisplay: input.startingTime24 ? toDisplay(input.startingTime24) : null,
    startingTime24: input.startingTime24 ?? null,
    campusArrivalDisplay: input.campusArrival24 ? toDisplay(input.campusArrival24) : null,
    campusArrival24: input.campusArrival24 ?? null,
    source: "ADMIN",
    manuallyEdited: true,
    active: true,
  });

  const busNumber = (input.busNumber ?? routeNumber).trim();
  await db.insert(buses).values({
    id: recBusId(routeNumber),
    busNumber,
    routeId: id,
    active: true,
    source: "ADMIN",
    manuallyEdited: true,
  });

  const rows = await listCollegeRoutes();
  return rows.find((r) => r.id === id)!;
}

export async function activateOfficialCollegeFleet() {
  const dummy = await deactivateDummyFleet();
  const promoted = await promoteOfficialRecFleet();
  const routes = await listCollegeRoutes();
  return { dummy, promoted, routesCount: routes.length };
}

function toDisplay(hhmm: string): string {
  const [hRaw, m] = hhmm.split(":");
  const h = Number(hRaw);
  if (!Number.isFinite(h) || !m) return hhmm;
  const meridiem = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}.${m} ${meridiem}`;
}
