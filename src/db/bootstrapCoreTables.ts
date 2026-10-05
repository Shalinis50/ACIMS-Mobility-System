import { execSql } from "./index.ts";

const DDL = `
CREATE TABLE IF NOT EXISTS official_pickup_points (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  sequence_number INTEGER NOT NULL,
  geofence_radius_m INTEGER NOT NULL DEFAULT 150,
  expected_offset_minutes INTEGER NOT NULL DEFAULT 0,
  scheduled_time_display TEXT,
  scheduled_time_24 TEXT,
  source TEXT NOT NULL DEFAULT 'ADMIN',
  active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE official_pickup_points ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE official_pickup_points ALTER COLUMN longitude DROP NOT NULL;
ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS scheduled_time_display TEXT;
ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS scheduled_time_24 TEXT;
ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ADMIN';

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  shift_type TEXT,
  start_time TEXT,
  end_time TEXT,
  direction TEXT NOT NULL DEFAULT 'TO_COLLEGE',
  route_id TEXT,
  bus_id TEXT,
  driver_id TEXT,
  operating_days TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI',
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_type TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS bus_id TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS driver_id TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS shift_assignments (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  bus_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  shift_id TEXT,
  bus_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  tracking_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  scheduled_start_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trips_bus_id_idx ON trips (bus_id);
CREATE INDEX IF NOT EXISTS trips_status_idx ON trips (status);

CREATE TABLE IF NOT EXISTS mobility_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bus_id TEXT NOT NULL,
  trip_id TEXT,
  pickup_point_id TEXT,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS trip_notification_events (
  id TEXT PRIMARY KEY,
  trip_id TEXT,
  student_id TEXT NOT NULL,
  pickup_point_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  eta_at_trigger INTEGER,
  delay_minutes INTEGER,
  notification_status TEXT NOT NULL DEFAULT 'SENT',
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS trip_notif_student_idx ON trip_notification_events (student_id);
CREATE INDEX IF NOT EXISTS trip_notif_trip_idx ON trip_notification_events (trip_id);

CREATE TABLE IF NOT EXISTS rec_transport_routes (
  id TEXT PRIMARY KEY,
  route_number TEXT NOT NULL,
  route_name TEXT NOT NULL,
  starting_time_display TEXT,
  starting_time_24 TEXT,
  boarding_page_url TEXT,
  via_notes TEXT,
  campus_arrival_display TEXT,
  campus_arrival_24 TEXT,
  source_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  manually_edited BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS rec_transport_routes_number_idx ON rec_transport_routes (route_number);

CREATE TABLE IF NOT EXISTS rec_transport_stops (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  time_display TEXT,
  time_24 TEXT,
  is_campus BOOLEAN NOT NULL DEFAULT FALSE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS rec_transport_stops_route_idx ON rec_transport_stops (route_id, sequence_number);

CREATE TABLE IF NOT EXISTS rec_transport_sync_status (
  id INTEGER PRIMARY KEY,
  timetable_url TEXT NOT NULL,
  connection_status TEXT NOT NULL DEFAULT 'PENDING',
  last_successful_sync TIMESTAMPTZ,
  routes_count INTEGER NOT NULL DEFAULT 0,
  stops_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const PICKUP_SCHEMA_PATCHES = [
  "ALTER TABLE official_pickup_points ALTER COLUMN latitude DROP NOT NULL",
  "ALTER TABLE official_pickup_points ALTER COLUMN longitude DROP NOT NULL",
  "ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS scheduled_time_display TEXT",
  "ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS scheduled_time_24 TEXT",
  "ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ADMIN'",
  "ALTER TABLE rec_transport_routes ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS starting_time_display TEXT",
  "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS starting_time_24 TEXT",
  "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS campus_arrival_display TEXT",
  "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS campus_arrival_24 TEXT",
  "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ADMIN'",
  "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE buses ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ADMIN'",
  "ALTER TABLE buses ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT FALSE",
];

export async function bootstrapCoreTables() {
  try {
    await execSql(DDL);
    for (const stmt of PICKUP_SCHEMA_PATCHES) {
      try {
        await execSql(stmt);
      } catch {
        /* already applied or unsupported in this statement form */
      }
    }
    console.log("[ACIMS DB] Core mobility tables verified (shifts, trips, pickup points, events)");
  } catch (err) {
    console.error("[ACIMS DB] bootstrapCoreTables failed:", err);
  }
}
