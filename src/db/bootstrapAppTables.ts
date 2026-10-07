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
  `CREATE TABLE IF NOT EXISTS mobi_query_logs (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    intent TEXT NOT NULL,
    tools_called TEXT NOT NULL DEFAULT '[]',
    success BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS student_pickup_points (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE
  )`,
  `CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    preferences TEXT NOT NULL DEFAULT '{}'
  )`,
  `CREATE TABLE IF NOT EXISTS emergency_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS boarding_queue (
    id SERIAL PRIMARY KEY,
    student_id TEXT NOT NULL,
    bus_id TEXT NOT NULL,
    boarding_stop TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'WAITING',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS student_preferences (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    saved_pickup_stop_id TEXT,
    preferred_bus_id TEXT,
    saved_destination_name TEXT,
    saved_destination_lat DOUBLE PRECISION,
    saved_destination_lng DOUBLE PRECISION,
    notification_arrivals BOOLEAN DEFAULT TRUE,
    notification_delays BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS student_locations (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    role TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS safety_alerts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  const { promoteOfficialRecFleet } = await import(
    "../../artifacts/api-server/src/services/recTransport/collegeFleetService.ts"
  );
  try {
    const promoted = await promoteOfficialRecFleet();
    if (promoted.busesUpserted === 0 && promoted.catalogRoutes === 0) {
      const { getAllRoutes } = await import(
        "../../artifacts/api-server/src/services/routesData.ts"
      );
      const { db } = await import("./index.ts");
      const { buses, busRoutes, busStops } = await import("./schema.ts");
      const existingBuses = await db.select().from(buses);
      if (existingBuses.length === 0) {
        const allRoutes = getAllRoutes();
        for (const r of allRoutes) {
          const busId = r.id.replace("route-", "");
          await db
            .insert(busRoutes)
            .values({
              id: r.id,
              routeName: r.name,
              routeCode: r.routeNumber,
              active: true,
            })
            .onConflictDoNothing();
          await db
            .insert(buses)
            .values({
              id: busId,
              busNumber: r.routeNumber,
              routeId: r.id,
              active: true,
            })
            .onConflictDoNothing();
          for (const s of r.stops) {
            await db
              .insert(busStops)
              .values({
                id: `${r.id}-${s.id}`,
                routeId: r.id,
                stopName: s.name,
                latitude: s.latitude,
                longitude: s.longitude,
                sequenceNumber: s.sequence,
              })
              .onConflictDoNothing();
          }
        }
        console.log("[ACIMS DB] Seeded baseline campus fleet & route stops");
      }
    }
  } catch (err) {
    console.warn("[ACIMS DB] Official college fleet promote skipped:", err);
  }
}
