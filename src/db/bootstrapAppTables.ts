import { execSql } from "./index.ts";

const APP_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'STUDENT',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL,
    register_number TEXT,
    pickup_stop_id TEXT,
    assigned_bus_id TEXT,
    assigned_route_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL,
    assigned_bus_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS bus_routes (
    id TEXT PRIMARY KEY,
    route_name TEXT NOT NULL,
    route_code TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
  )`,
  `CREATE TABLE IF NOT EXISTS buses (
    id TEXT PRIMARY KEY,
    bus_number TEXT NOT NULL,
    registration_number TEXT,
    route_id TEXT,
    driver_id TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS bus_stops (
    id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    stop_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    sequence_number INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bus_locations (
    id SERIAL PRIMARY KEY,
    bus_id TEXT NOT NULL,
    driver_id TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    altitude_accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS tracking_sessions (
    id TEXT PRIMARY KEY,
    bus_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_location_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
  )`,
  `CREATE TABLE IF NOT EXISTS safety_reports (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    report_type TEXT NOT NULL,
    description TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS campus_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    description TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS campus_paths (
    id TEXT PRIMARY KEY,
    from_location_id TEXT NOT NULL,
    to_location_id TEXT NOT NULL,
    distance_meters DOUBLE PRECISION NOT NULL,
    path_points TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public_transport_stops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    routes_served TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS public_transport_departures (
    id TEXT PRIMARY KEY,
    stop_id TEXT NOT NULL,
    route_number TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    service_days TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI,SAT',
    is_live BOOLEAN NOT NULL DEFAULT FALSE
  )`,
];

export async function migrateMobilitySchemaColumns() {
  const alters = [
    "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_type TEXT",
    "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_time TEXT",
    "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS bus_id TEXT",
    "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS driver_id TEXT",
    "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS shift_start_snapshot TEXT",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS shift_end_snapshot TEXT",
    "ALTER TABLE shifts ALTER COLUMN start_time DROP NOT NULL",
    "ALTER TABLE shifts ALTER COLUMN route_id DROP NOT NULL",
  ];
  for (const sql of alters) {
    try {
      await execSql(sql);
    } catch {
      // ignore legacy schema differences
    }
  }
}

export async function bootstrapAppTables() {
  try {
    for (const sql of APP_STATEMENTS) {
      await execSql(sql);
    }
    console.log("[ACIMS DB] Core app tables verified (buses, routes, profiles, safety, …)");
  } catch (err) {
    console.error("[ACIMS DB] bootstrapAppTables failed:", err);
    throw err;
  }
}

export async function ensureBaselineFleetData() {
  const { getDbBuses } = await import("./services.ts");
  let buses: Awaited<ReturnType<typeof getDbBuses>> = [];
  try {
    buses = await getDbBuses();
  } catch {
    return;
  }
  if (buses.length > 0) return;

  const { seedDatabase } = await import("./seed.ts");
  await seedDatabase();
  console.log("[ACIMS DB] Seeded baseline fleet/routes (empty database)");
}
