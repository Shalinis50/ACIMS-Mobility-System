import { randomUUID } from "node:crypto";
import { getDatabase, haversineMeters } from "../publicTransitService.ts";
import {
  initializeMtcSchema,
  MTC_OFFICIAL_URL,
  MTC_SOURCE_LABEL,
} from "./mtcSchema.ts";
import { fetchOfficialMtcRouteCatalog } from "./mtcOfficialSource.ts";

const REC_COLLEGE = {
  name: "Rajalakshmi Engineering College (REC)",
  latitude: 13.0084,
  longitude: 80.0033,
};

export function ensureMtcSchema() {
  const db = getDatabase();
  initializeMtcSchema(db);
}

export function purgeLegacyDummyMtcFromTransitDb() {
  const db = getDatabase();
  const mtcTripIds = db
    .prepare(`SELECT id FROM public_transport_trips WHERE route_id LIKE 'MTC_%'`)
    .all() as { id: string }[];
  for (const t of mtcTripIds) {
    db.prepare(`DELETE FROM public_transport_stop_times WHERE trip_id = ?`).run(t.id);
  }
  db.prepare(`DELETE FROM public_transport_trips WHERE route_id LIKE 'MTC_%'`).run();
  db.prepare(`DELETE FROM public_transport_routes WHERE agency_id = 'MTC'`).run();
  db.prepare(`DELETE FROM public_transport_stops WHERE agency_id = 'MTC'`).run();
}

function logMtcError(operation: string, message: string, details?: string) {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO mtc_sync_error_log (id, occurred_at, operation, message, details) VALUES (?, ?, ?, ?, ?)`,
  ).run(randomUUID(), new Date().toISOString(), operation, message, details ?? null);
}

function updateIntegrationStatus(patch: {
  connection_status: string;
  last_successful_sync?: string | null;
  routes_count?: number;
  stages_count?: number;
  timetable_status?: string;
  live_tracking_status?: string;
  last_error?: string | null;
}) {
  const db = getDatabase();
  const current = db.prepare(`SELECT * FROM mtc_integration_status WHERE id = 1`).get() as any;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE mtc_integration_status SET
      connection_status = ?,
      last_successful_sync = ?,
      routes_count = ?,
      stages_count = ?,
      timetable_status = ?,
      live_tracking_status = ?,
      last_error = ?,
      updated_at = ?
    WHERE id = 1`,
  ).run(
    patch.connection_status ?? current.connection_status,
    patch.last_successful_sync !== undefined ? patch.last_successful_sync : current.last_successful_sync,
    patch.routes_count ?? current.routes_count,
    patch.stages_count ?? current.stages_count,
    patch.timetable_status ?? current.timetable_status,
    patch.live_tracking_status ?? current.live_tracking_status,
    patch.last_error !== undefined ? patch.last_error : current.last_error,
    now,
  );
}

export async function syncMtcFromOfficialSource(): Promise<{
  routesImported: number;
  retrievedAt: string;
}> {
  ensureMtcSchema();
  purgeLegacyDummyMtcFromTransitDb();

  try {
    const { routes, retrievedAt } = await fetchOfficialMtcRouteCatalog();
    const db = getDatabase();
    const insert = db.prepare(
      `INSERT OR REPLACE INTO mtc_routes (route_id, route_number, origin, destination, route_name, source, last_updated)
       VALUES (?, ?, NULL, NULL, ?, ?, ?)`,
    );

    db.exec("BEGIN");
    try {
      for (const r of routes) {
        insert.run(r.routeId, r.routeNumber, `MTC Route ${r.routeNumber}`, r.source, retrievedAt);
      }
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }

    const stagesCount = (db.prepare(`SELECT COUNT(*) as c FROM mtc_stops`).get() as { c: number }).c;
    const timingsCount = (db.prepare(`SELECT COUNT(*) as c FROM mtc_timings`).get() as { c: number }).c;

    updateIntegrationStatus({
      connection_status: "CONNECTED",
      last_successful_sync: retrievedAt,
      routes_count: routes.length,
      stages_count: stagesCount,
      timetable_status: timingsCount > 0 ? "AVAILABLE" : "UNAVAILABLE",
      live_tracking_status: "NOT_INTEGRATED",
      last_error: null,
    });

    db.prepare(
      `INSERT OR REPLACE INTO public_transport_agencies (
        id, name, agency_type, official_url, phone, timezone, source, source_url, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "MTC",
      "Metropolitan Transport Corporation (Chennai)",
      "Bus Transit",
      MTC_OFFICIAL_URL,
      "044-23455801",
      "Asia/Kolkata",
      MTC_SOURCE_LABEL,
      MTC_OFFICIAL_URL,
      retrievedAt,
    );

    return { routesImported: routes.length, retrievedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logMtcError("sync_route_catalog", message);
    updateIntegrationStatus({
      connection_status: "ERROR",
      last_error: message,
    });
    throw err;
  }
}

export function getMtcIntegrationStatus() {
  ensureMtcSchema();
  const db = getDatabase();
  const status = db.prepare(`SELECT * FROM mtc_integration_status WHERE id = 1`).get();
  const errors = db
    .prepare(`SELECT * FROM mtc_sync_error_log ORDER BY occurred_at DESC LIMIT 20`)
    .all();
  return { status, errors };
}

export function isMtcDataAvailable(): boolean {
  ensureMtcSchema();
  const db = getDatabase();
  const row = db.prepare(`SELECT routes_count, connection_status FROM mtc_integration_status WHERE id = 1`).get() as
    | { routes_count: number; connection_status: string }
    | undefined;
  return Boolean(row && row.connection_status === "CONNECTED" && row.routes_count > 0);
}

export function searchMtcRoutes(options: { query?: string; limit?: number }) {
  if (!isMtcDataAvailable()) {
    return { available: false as const, routes: [], message: mtcUnavailableMessage() };
  }
  const db = getDatabase();
  const limit = Math.min(50, Math.max(1, options.limit ?? 25));
  const q = options.query?.trim();
  let rows: any[];
  if (q) {
    const like = `%${q}%`;
    rows = db
      .prepare(
        `SELECT * FROM mtc_routes
         WHERE route_number LIKE ? OR route_name LIKE ? OR origin LIKE ? OR destination LIKE ?
         ORDER BY route_number LIMIT ?`,
      )
      .all(like, like, like, like, limit);
  } else {
    rows = db.prepare(`SELECT * FROM mtc_routes ORDER BY route_number LIMIT ?`).all(limit);
  }
  return {
    available: true as const,
    routes: rows.map((r) => ({
      ...r,
      source: r.source,
      last_updated: r.last_updated,
      official_url: MTC_OFFICIAL_URL + "Home/routewiseinfo",
    })),
  };
}

export function searchMtcStopsByName(query: string, limit = 20) {
  if (!isMtcDataAvailable()) {
    return { available: false as const, stops: [], message: mtcUnavailableMessage() };
  }
  const db = getDatabase();
  const like = `%${query.trim()}%`;
  const stops = db
    .prepare(
      `SELECT * FROM mtc_stops WHERE stage_name LIKE ? ORDER BY stage_name LIMIT ?`,
    )
    .all(like, limit);
  return { available: true as const, stops };
}

export function getNearestMtcStops(input: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}) {
  if (!isMtcDataAvailable()) {
    return { available: false as const, stops: [], message: mtcUnavailableMessage() };
  }
  const db = getDatabase();
  const radiusM = (input.radiusKm ?? 5) * 1000;
  const limit = input.limit ?? 10;
  const candidates = db
    .prepare(`SELECT * FROM mtc_stops WHERE latitude IS NOT NULL AND longitude IS NOT NULL`)
    .all() as any[];

  if (candidates.length === 0) {
    return {
      available: true as const,
      stops: [],
      message:
        "Official MTC stage coordinates are not loaded yet. Route numbers are available — use route search or sync stages when published on mtcbus.tn.gov.in.",
    };
  }

  const withDist = candidates
    .map((s) => ({
      ...s,
      distance_meters: haversineMeters(input.latitude, input.longitude, s.latitude, s.longitude),
      walking_minutes: Math.max(1, Math.round(haversineMeters(input.latitude, input.longitude, s.latitude, s.longitude) / 80)),
    }))
    .filter((s) => s.distance_meters <= radiusM)
    .sort((a, b) => a.distance_meters - b.distance_meters)
    .slice(0, limit);

  return { available: true as const, stops: withDist };
}

export function getMtcRoutesForStop(stopId: string) {
  if (!isMtcDataAvailable()) {
    return { available: false as const, routes: [], message: mtcUnavailableMessage() };
  }
  const db = getDatabase();
  const stop = db.prepare(`SELECT * FROM mtc_stops WHERE stop_id = ?`).get(stopId) as any;
  if (!stop?.route_id) {
    return { available: true as const, routes: [] };
  }
  const routes = db.prepare(`SELECT * FROM mtc_routes WHERE route_id = ?`).all(stop.route_id);
  return { available: true as const, routes, stop };
}

export function getMtcTimingsForRoute(routeId: string) {
  if (!isMtcDataAvailable()) {
    return { available: false as const, timings: [], message: mtcUnavailableMessage() };
  }
  const db = getDatabase();
  const timings = db
    .prepare(`SELECT * FROM mtc_timings WHERE route_id = ? ORDER BY departure_time ASC LIMIT 100`)
    .all(routeId);
  return {
    available: true as const,
    timings,
    timetable_status: timings.length ? "AVAILABLE" : "UNAVAILABLE",
  };
}

export function mtcUnavailableMessage() {
  return "MTC information is temporarily unavailable. Please try again.";
}

export function buildGetToCollegeRecommendations(input: {
  latitude?: number;
  longitude?: number;
  studentId?: string;
}) {
  const mtcReady = isMtcDataAvailable();
  const nearest =
    input.latitude != null && input.longitude != null
      ? getNearestMtcStops({ latitude: input.latitude, longitude: input.longitude, radiusKm: 6, limit: 5 })
      : null;

  const collegeRoutes = mtcReady
    ? searchMtcRoutes({ query: "REC", limit: 15 })
    : { available: false as const, routes: [], message: mtcUnavailableMessage() };

  return {
    destination: REC_COLLEGE,
    acims_college_bus: {
      status: "available",
      note: "Use ACIMS live college bus GPS and pickup ETA (unchanged).",
    },
    mtc: mtcReady
      ? {
          status: "available",
          nearest_stops: nearest?.stops ?? [],
          nearest_message: nearest && "message" in nearest ? nearest.message : undefined,
          routes_toward_college: collegeRoutes.available ? collegeRoutes.routes : [],
          source: MTC_SOURCE_LABEL,
          last_updated: getMtcIntegrationStatus().status?.last_successful_sync,
          official_url: MTC_OFFICIAL_URL,
          live_mtc_gps: "NOT_AVAILABLE",
        }
      : {
          status: "unavailable",
          message: mtcUnavailableMessage(),
        },
    generated_at: new Date().toISOString(),
  };
}

export function buildMissedBusMtcOptions(input: { latitude: number; longitude: number }) {
  const nearest = getNearestMtcStops({ latitude: input.latitude, longitude: input.longitude, radiusKm: 4, limit: 6 });
  if (!nearest.available) {
    return { available: false, message: nearest.message, options: [] };
  }
  const db = getDatabase();
  const options = [];
  for (const stop of nearest.stops ?? []) {
    const routes =
      stop.route_id
        ? (db.prepare(`SELECT route_number, route_name, last_updated, source FROM mtc_routes WHERE route_id = ?`).all(
            stop.route_id,
          ) as any[])
        : [];
    const timings = stop.route_id
      ? (db.prepare(
          `SELECT departure_time, service_day, last_updated FROM mtc_timings WHERE route_id = ? ORDER BY departure_time LIMIT 3`,
        ).all(stop.route_id) as any[])
      : [];
    options.push({
      category: "MTC Bus" as const,
      stopName: stop.stage_name,
      distanceMeters: stop.distance_meters,
      walkingMinutes: stop.walking_minutes,
      agency: "Metropolitan Transport Corporation (Chennai)",
      routes: routes.map((r) => r.route_number),
      scheduledNextDeparture: timings[0]?.departure_time ?? null,
      status: "Scheduled" as const,
      source: MTC_SOURCE_LABEL,
      last_updated: stop.last_updated,
      data_age_note: timings.length ? undefined : "Official timetable not loaded for this route in ACIMS yet.",
    });
  }
  return { available: true, options, source: MTC_SOURCE_LABEL };
}
