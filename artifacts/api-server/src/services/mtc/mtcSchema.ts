import type { DatabaseSync } from "node:sqlite";

export const MTC_OFFICIAL_URL = "https://mtcbus.tn.gov.in/";
export const MTC_OFFICIAL_ROUTE_LIST_URL = "https://mtcbus.tn.gov.in/Home/routewiseinfo";
export const MTC_SOURCE_LABEL = "Official MTC Chennai (mtcbus.tn.gov.in)";

export function initializeMtcSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mtc_routes (
      route_id TEXT PRIMARY KEY,
      route_number TEXT NOT NULL,
      origin TEXT,
      destination TEXT,
      route_name TEXT,
      source TEXT NOT NULL,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mtc_stops (
      stop_id TEXT PRIMARY KEY,
      stage_name TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      route_id TEXT,
      sequence INTEGER,
      source TEXT NOT NULL,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mtc_timings (
      id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      stop_id TEXT,
      departure_time TEXT,
      arrival_time TEXT,
      service_day TEXT,
      source TEXT NOT NULL,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mtc_integration_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      connection_status TEXT NOT NULL,
      source_label TEXT NOT NULL,
      source_url TEXT NOT NULL,
      last_successful_sync TEXT,
      routes_count INTEGER DEFAULT 0,
      stages_count INTEGER DEFAULT 0,
      timetable_status TEXT NOT NULL,
      live_tracking_status TEXT NOT NULL,
      last_error TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mtc_sync_error_log (
      id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      operation TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mtc_routes_number ON mtc_routes (route_number);
    CREATE INDEX IF NOT EXISTS idx_mtc_stops_route ON mtc_stops (route_id, sequence);
    CREATE INDEX IF NOT EXISTS idx_mtc_stops_coords ON mtc_stops (latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_mtc_timings_route ON mtc_timings (route_id, departure_time);
  `);

  const row = db.prepare("SELECT id FROM mtc_integration_status WHERE id = 1").get();
  if (!row) {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO mtc_integration_status (
        id, connection_status, source_label, source_url, last_successful_sync,
        routes_count, stages_count, timetable_status, live_tracking_status, last_error, updated_at
      ) VALUES (1, 'PENDING', ?, ?, NULL, 0, 0, 'UNAVAILABLE', 'NOT_INTEGRATED', NULL, ?)`,
    ).run(MTC_SOURCE_LABEL, MTC_OFFICIAL_URL, now);
  }
}
