import { execSql } from "./index.ts";

const DDL = `
CREATE TABLE IF NOT EXISTS official_pickup_points (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  sequence_number INTEGER NOT NULL,
  geofence_radius_m INTEGER NOT NULL DEFAULT 150,
  expected_offset_minutes INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

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
`;

export async function bootstrapCoreTables() {
  try {
    await execSql(DDL);
    console.log("[ACIMS DB] Core mobility tables verified (shifts, trips, pickup points, events)");
  } catch (err) {
    console.error("[ACIMS DB] bootstrapCoreTables failed:", err);
  }
}
