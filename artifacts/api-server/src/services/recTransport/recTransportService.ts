import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../../../../src/db/index.ts";
import { busRoutes, officialPickupPoints, recTransportRoutes, recTransportStops, recTransportSyncStatus } from "../../../../../src/db/schema.ts";
import { upsertPickupPoint } from "../../../../../src/db/mobilityOps.ts";
import { fetchRecTransportHtml } from "./recTransportSource.ts";
import { activateOfficialCollegeFleet } from "./collegeFleetService.ts";
import {
  parseRecBoardingPage,
  parseRecClock,
  parseRecIndexPage,
  recRouteId,
  recStopId,
  REC_TRANSPORT_DEFAULT_TIMETABLE_URL,
  REC_TRANSPORT_SOURCE_LABEL,
} from "./recTransportParser.ts";

const STATUS_ID = 1;
const FETCH_CONCURRENCY = 6;

export function defaultTimetableUrl(): string {
  return process.env.REC_TRANSPORT_TIMETABLE_URL?.trim() || REC_TRANSPORT_DEFAULT_TIMETABLE_URL;
}

async function ensureStatusRow(timetableUrl: string) {
  const existing = await db.select().from(recTransportSyncStatus).where(eq(recTransportSyncStatus.id, STATUS_ID)).limit(1);
  if (!existing.length) {
    await db.insert(recTransportSyncStatus).values({
      id: STATUS_ID,
      timetableUrl,
      connectionStatus: "PENDING",
    });
    return;
  }
  if (existing[0].timetableUrl !== timetableUrl) {
    await db
      .update(recTransportSyncStatus)
      .set({ timetableUrl, updatedAt: new Date() })
      .where(eq(recTransportSyncStatus.id, STATUS_ID));
  }
}

export async function getRecTransportStatus() {
  const rows = await db.select().from(recTransportSyncStatus).where(eq(recTransportSyncStatus.id, STATUS_ID)).limit(1);
  const [routeCount] = await db.select({ count: sql<number>`count(*)` }).from(recTransportRoutes).where(eq(recTransportRoutes.active, true));
  const [stopCount] = await db.select({ count: sql<number>`count(*)` }).from(recTransportStops).where(eq(recTransportStops.active, true));
  const [officialCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(officialPickupPoints)
    .where(and(eq(officialPickupPoints.active, true), eq(officialPickupPoints.source, "REC_TRANSPORT")));
  return {
    sourceLabel: REC_TRANSPORT_SOURCE_LABEL,
    defaultUrl: defaultTimetableUrl(),
    status: rows[0] ?? null,
    routesCount: Number(routeCount?.count ?? 0),
    stopsCount: Number(stopCount?.count ?? 0),
    officialPickupsCount: Number(officialCount?.count ?? 0),
  };
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      results.push(await fn(current));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function syncRecTransportFromOfficialSource(input?: { timetableUrl?: string; publishOfficialPickups?: boolean }) {
  const timetableUrl = input?.timetableUrl?.trim() || defaultTimetableUrl();
  await ensureStatusRow(timetableUrl);

  try {
    const indexPage = await fetchRecTransportHtml(timetableUrl);
    if (indexPage.status >= 400 || !indexPage.body) {
      throw new Error(`REC timetable HTTP ${indexPage.status}`);
    }
    const catalog = parseRecIndexPage(indexPage.body, indexPage.finalUrl);
    if (!catalog.length) {
      throw new Error("No routes parsed from REC timetable. The page layout may have changed.");
    }

    const now = new Date();
    const seenRouteIds = new Set<string>();

    const boardingResults = await mapPool(catalog, FETCH_CONCURRENCY, async (entry) => {
      const routeId = recRouteId(entry.routeNumber);
      seenRouteIds.add(routeId);
      const startClock = parseRecClock(entry.startingTimeDisplay);
      let viaNotes: string | null = null;
      let campusArrivalDisplay: string | null = null;
      let campusArrival24: string | null = null;
      let fetchError: string | null = null;
      let parsedStops: ReturnType<typeof parseRecBoardingPage>["stops"] = [];

      try {
        const boarding = await fetchRecTransportHtml(entry.boardingHref);
        if (boarding.status >= 400) {
          fetchError = `Boarding page HTTP ${boarding.status}`;
        } else {
          const parsed = parseRecBoardingPage(boarding.body);
          viaNotes = parsed.viaNotes;
          parsedStops = parsed.stops;
          const campus = parsed.stops.find((s) => s.isCampus);
          if (campus) {
            const clock = parseRecClock(campus.timeDisplay, startClock.meridiem);
            campusArrivalDisplay = campus.timeDisplay;
            campusArrival24 = clock.time24;
          }
        }
      } catch (err) {
        fetchError = err instanceof Error ? err.message : "Boarding page fetch failed";
      }

      const existingRoute = await db.select().from(recTransportRoutes).where(eq(recTransportRoutes.id, routeId)).limit(1);
      const routeValues = existingRoute[0]?.manuallyEdited
        ? {
            boardingPageUrl: entry.boardingHref,
            viaNotes,
            sourceUrl: timetableUrl,
            active: true,
            lastSyncedAt: now,
          }
        : {
            routeNumber: entry.routeNumber,
            routeName: entry.routeName,
            startingTimeDisplay: entry.startingTimeDisplay,
            startingTime24: startClock.time24,
            boardingPageUrl: entry.boardingHref,
            viaNotes,
            campusArrivalDisplay,
            campusArrival24,
            sourceUrl: timetableUrl,
            active: true,
            lastSyncedAt: now,
          };
      if (existingRoute.length) {
        await db.update(recTransportRoutes).set(routeValues).where(eq(recTransportRoutes.id, routeId));
      } else {
        await db.insert(recTransportRoutes).values({ id: routeId, ...routeValues });
      }

      let meridiem = startClock.meridiem;
      const seenStopIds = new Set<string>();
      for (let i = 0; i < parsedStops.length; i++) {
        const stop = parsedStops[i];
        const sequence = i + 1;
        const stopId = recStopId(entry.routeNumber, sequence);
        seenStopIds.add(stopId);
        const clock = parseRecClock(stop.timeDisplay, meridiem);
        if (clock.meridiem) meridiem = clock.meridiem;

        const existingStop = await db.select().from(recTransportStops).where(eq(recTransportStops.id, stopId)).limit(1);
        const preservedLat = existingStop[0]?.latitude ?? null;
        const preservedLng = existingStop[0]?.longitude ?? null;
        const stopValues = {
          routeId,
          stopName: stop.stopName,
          sequenceNumber: sequence,
          timeDisplay: stop.timeDisplay || null,
          time24: clock.time24,
          isCampus: stop.isCampus,
          latitude: preservedLat,
          longitude: preservedLng,
          active: true,
          lastSyncedAt: now,
        };
        if (existingStop.length) {
          await db.update(recTransportStops).set(stopValues).where(eq(recTransportStops.id, stopId));
        } else {
          await db.insert(recTransportStops).values({ id: stopId, ...stopValues });
        }
      }

      if (parsedStops.length) {
        const leftover = await db.select().from(recTransportStops).where(eq(recTransportStops.routeId, routeId));
        for (const row of leftover) {
          if (!seenStopIds.has(row.id)) {
            await db.update(recTransportStops).set({ active: false, lastSyncedAt: now }).where(eq(recTransportStops.id, row.id));
          }
        }
      }

      if (input?.publishOfficialPickups) {
        await publishRoutePickups(routeId);
      }

      return { routeId, stops: parsedStops.length, fetchError };
    });

    const allRoutes = await db.select().from(recTransportRoutes);
    for (const route of allRoutes) {
      if (!seenRouteIds.has(route.id) && route.active) {
        await db.update(recTransportRoutes).set({ active: false, lastSyncedAt: now }).where(eq(recTransportRoutes.id, route.id));
      }
    }

    const [stopCount] = await db.select({ count: sql<number>`count(*)` }).from(recTransportStops).where(eq(recTransportStops.active, true));
    const boardingErrors = boardingResults.filter((r) => r.fetchError);
    const { activateOfficialCollegeFleet } = await import("./collegeFleetService.ts");
    await activateOfficialCollegeFleet();
    await db
      .update(recTransportSyncStatus)
      .set({
        timetableUrl,
        connectionStatus: boardingErrors.length && boardingErrors.length === catalog.length ? "PARTIAL" : "CONNECTED",
        lastSuccessfulSync: now,
        routesCount: catalog.length,
        stopsCount: Number(stopCount?.count ?? 0),
        lastError: boardingErrors.length ? `${boardingErrors.length} boarding pages failed` : null,
        updatedAt: now,
      })
      .where(eq(recTransportSyncStatus.id, STATUS_ID));

    return {
      sourceLabel: REC_TRANSPORT_SOURCE_LABEL,
      timetableUrl,
      routesImported: catalog.length,
      stopsImported: Number(stopCount?.count ?? 0),
      boardingFailures: boardingErrors.length,
      retrievedAt: now.toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "REC transport sync failed";
    await db
      .update(recTransportSyncStatus)
      .set({
        connectionStatus: "ERROR",
        lastError: message,
        updatedAt: new Date(),
      })
      .where(eq(recTransportSyncStatus.id, STATUS_ID));
    throw err;
  }
}

export async function listRecTransportRoutes(query?: string) {
  if (!query?.trim()) {
    return db.select().from(recTransportRoutes).where(eq(recTransportRoutes.active, true)).orderBy(recTransportRoutes.routeNumber);
  }
  const pattern = `%${query.trim()}%`;
  const byRoute = await db
    .select()
    .from(recTransportRoutes)
    .where(
      and(
        eq(recTransportRoutes.active, true),
        or(ilike(recTransportRoutes.routeNumber, pattern), ilike(recTransportRoutes.routeName, pattern)),
      ),
    )
    .orderBy(recTransportRoutes.routeNumber);
  const stopHits = await db
    .select({ routeId: recTransportStops.routeId })
    .from(recTransportStops)
    .where(and(eq(recTransportStops.active, true), ilike(recTransportStops.stopName, pattern)));
  const extraIds = [...new Set(stopHits.map((s) => s.routeId).filter((id) => !byRoute.some((r) => r.id === id)))];
  if (!extraIds.length) return byRoute;
  const extra =
    extraIds.length === 1
      ? await db.select().from(recTransportRoutes).where(eq(recTransportRoutes.id, extraIds[0]))
      : await db.select().from(recTransportRoutes).where(or(...extraIds.map((id) => eq(recTransportRoutes.id, id))));
  return [...byRoute, ...extra];
}

export async function getRecTransportRoute(routeId: string) {
  const [route] = await db.select().from(recTransportRoutes).where(eq(recTransportRoutes.id, routeId)).limit(1);
  if (!route) return null;
  const stops = await db
    .select()
    .from(recTransportStops)
    .where(and(eq(recTransportStops.routeId, routeId), eq(recTransportStops.active, true)))
    .orderBy(recTransportStops.sequenceNumber);
  return { ...route, stops };
}

export async function updateRecTransportStop(
  stopId: string,
  patch: { latitude?: number | null; longitude?: number | null; active?: boolean; stopName?: string },
) {
  const [existing] = await db.select().from(recTransportStops).where(eq(recTransportStops.id, stopId)).limit(1);
  if (!existing) throw new Error("Stop not found");
  const updated = await db
    .update(recTransportStops)
    .set({
      ...(patch.latitude !== undefined ? { latitude: patch.latitude } : {}),
      ...(patch.longitude !== undefined ? { longitude: patch.longitude } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      ...(patch.stopName !== undefined ? { stopName: patch.stopName } : {}),
    })
    .where(eq(recTransportStops.id, stopId))
    .returning();
  return updated[0];
}

async function ensureFleetRouteFromRec(route: { id: string; routeNumber: string; routeName: string; active: boolean }) {
  const existing = await db.select().from(busRoutes).where(eq(busRoutes.id, route.id)).limit(1);
  if (existing[0]?.manuallyEdited) return;
  const values = {
    routeName: `${route.routeNumber} ${route.routeName}`.trim(),
    routeCode: route.routeNumber,
    active: route.active,
    source: "REC_TRANSPORT" as const,
  };
  if (existing.length) {
    await db.update(busRoutes).set(values).where(eq(busRoutes.id, route.id));
    return;
  }
  await db.insert(busRoutes).values({ id: route.id, ...values });
}

const DUMMY_SEEDED_PICKUP_IDS = new Set(["vandalur", "perungalathur", "tambaram", "college"]);

export async function publishRoutePickups(routeId: string) {
  const detail = await getRecTransportRoute(routeId);
  if (!detail) throw new Error("Route not found");
  await ensureFleetRouteFromRec(detail);
  let published = 0;
  const seenIds: string[] = [];
  for (const stop of detail.stops) {
    if (stop.isCampus) continue;
    const existingOfficial = await db.select().from(officialPickupPoints).where(eq(officialPickupPoints.id, stop.id)).limit(1);
    const lat = stop.latitude ?? existingOfficial[0]?.latitude ?? null;
    const lng = stop.longitude ?? existingOfficial[0]?.longitude ?? null;
    const offset = stop.time24 && detail.startingTime24
      ? Math.max(0, toMinutes(stop.time24) - toMinutes(detail.startingTime24))
      : stop.sequenceNumber * 3;
    await upsertPickupPoint({
      id: stop.id,
      routeId: detail.id,
      stopName: stop.stopName,
      latitude: lat,
      longitude: lng,
      sequenceNumber: stop.sequenceNumber,
      geofenceRadiusM: 150,
      expectedOffsetMinutes: offset,
      scheduledTimeDisplay: stop.timeDisplay,
      scheduledTime24: stop.time24,
      source: "REC_TRANSPORT",
      active: stop.active,
    });
    published += 1;
    seenIds.push(stop.id);
  }
  return { routeId, published, stopIds: seenIds };
}

export async function publishAllOfficialPickups() {
  const { bootstrapCoreTables } = await import("../../../../../src/db/bootstrapCoreTables.ts");
  await bootstrapCoreTables();
  const routes = await db.select().from(recTransportRoutes).where(eq(recTransportRoutes.active, true));
  if (!routes.length) {
    throw new Error("No official REC routes synced yet. Sync the timetable first.");
  }
  const seenIds = new Set<string>();
  let published = 0;
  let routesPublished = 0;
  for (const route of routes) {
    const result = await publishRoutePickups(route.id);
    published += result.published;
    routesPublished += 1;
    for (const id of result.stopIds) seenIds.add(id);
  }

  const official = await db.select().from(officialPickupPoints);
  let deactivated = 0;
  for (const point of official) {
    const isRec = point.source === "REC_TRANSPORT" || point.id.startsWith("rec-stop-");
    const dropRec = isRec && point.active && !seenIds.has(point.id);
    const dropDummy = DUMMY_SEEDED_PICKUP_IDS.has(point.id) && point.active;
    if (dropRec || dropDummy) {
      await upsertPickupPoint({
        id: point.id,
        routeId: point.routeId,
        stopName: point.stopName,
        latitude: point.latitude,
        longitude: point.longitude,
        sequenceNumber: point.sequenceNumber,
        geofenceRadiusM: point.geofenceRadiusM,
        expectedOffsetMinutes: point.expectedOffsetMinutes,
        scheduledTimeDisplay: point.scheduledTimeDisplay,
        scheduledTime24: point.scheduledTime24,
        source: point.source,
        active: false,
      });
      deactivated += 1;
    }
  }

  const promoted = await activateOfficialCollegeFleet();

  return { routesPublished, published, deactivated, fleet: promoted };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export async function searchRecPickupPoints(query: string) {
  const pattern = `%${query.trim()}%`;
  return db
    .select({
      id: recTransportStops.id,
      stopName: recTransportStops.stopName,
      timeDisplay: recTransportStops.timeDisplay,
      time24: recTransportStops.time24,
      routeId: recTransportStops.routeId,
      routeNumber: recTransportRoutes.routeNumber,
      routeName: recTransportRoutes.routeName,
      startingTimeDisplay: recTransportRoutes.startingTimeDisplay,
    })
    .from(recTransportStops)
    .innerJoin(recTransportRoutes, eq(recTransportStops.routeId, recTransportRoutes.id))
    .where(and(eq(recTransportStops.active, true), eq(recTransportStops.isCampus, false), ilike(recTransportStops.stopName, pattern)))
    .orderBy(recTransportStops.stopName)
    .limit(40);
}
