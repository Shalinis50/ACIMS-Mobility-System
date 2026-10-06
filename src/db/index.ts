import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import * as schema from './schema.ts';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
  var _pgliteInstance: PGlite | undefined;
  var _drizzleDb: any | undefined;
}

// 1. Embedded persistent PGlite initialization (always guaranteed and local)
const dataDir = path.resolve(process.cwd(), "data/postgres");
function getOrCreatePglite(): PGlite {
  if (global._pgliteInstance) return global._pgliteInstance;
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const pidFile = path.join(dataDir, "postmaster.pid");
    if (fs.existsSync(pidFile)) {
      try { fs.unlinkSync(pidFile); } catch {}
    }
    global._pgliteInstance = new PGlite(dataDir);
    return global._pgliteInstance;
  } catch (err: any) {
    console.warn(`[ACIMS DB] Notice initializing PGlite at ${dataDir}: ${err.message}. Rebuilding clean data store.`);
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
      fs.mkdirSync(dataDir, { recursive: true });
      global._pgliteInstance = new PGlite(dataDir);
      return global._pgliteInstance;
    } catch (fallbackErr: any) {
      console.warn(`[ACIMS DB] Fallback to in-memory PGlite: ${fallbackErr.message}`);
      global._pgliteInstance = new PGlite();
      return global._pgliteInstance;
    }
  }
}

const pgliteClient = getOrCreatePglite();
const pgliteDb = drizzlePglite(pgliteClient, { schema });

// 2. External PostgreSQL configuration (probed safely)
let externalPool: pg.Pool | null = null;
let externalDrizzleDb: any = null;
let externalDbHealthy = false;

const rawDbUrl = process.env.DATABASE_URL?.trim();
const hasHost = Boolean(process.env.SQL_HOST && process.env.SQL_USER);
const isLocalAddress = rawDbUrl
  ? rawDbUrl.includes("localhost") || rawDbUrl.includes("127.0.0.1")
  : false;

// Create pool ONLY if remote database or explicit non-local host is provided
if ((rawDbUrl && !isLocalAddress) || hasHost) {
  try {
    externalPool = rawDbUrl
      ? new Pool({
          connectionString: rawDbUrl,
          ssl: { rejectUnauthorized: false },
          max: 10,
          connectionTimeoutMillis: 2000,
        })
      : new Pool({
          host: process.env.SQL_HOST,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          max: 10,
          connectionTimeoutMillis: 2000,
        });

    externalPool.on("error", (err) => {
      console.warn("[ACIMS DB] External pool connection error:", err.message);
      externalDbHealthy = false;
    });

    externalDrizzleDb = drizzlePg(externalPool, { schema });
  } catch (err: any) {
    console.warn("[ACIMS DB] Could not initialize external pool:", err.message);
    externalPool = null;
  }
}

export function getActiveDb(): any {
  if (externalDbHealthy && externalDrizzleDb) {
    return externalDrizzleDb;
  }
  return pgliteDb;
}

export function getDb() {
  return getActiveDb();
}

/**
 * Resilient proxy to the active database engine (PGlite or verified external PostgreSQL)
 */
export const db: any = new Proxy({} as any, {
  get(_target, prop) {
    const active = getActiveDb();
    const val = active[prop];
    if (typeof val === "function") {
      return val.bind(active);
    }
    return val;
  },
});

export const pool = externalPool;

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (externalDbHealthy && externalPool) {
    try {
      const res = await externalPool.query(sql, params);
      return res.rows as T[];
    } catch (err: any) {
      console.warn("[ACIMS DB] External query failed, falling back to PGlite:", err.message);
      externalDbHealthy = false;
    }
  }

  if (global._pgliteInstance) {
    const res = await global._pgliteInstance.query(sql, params);
    return res.rows as T[];
  }
  return [];
}

/**
 * Ensures all relational schema tables exist and seeds initial transit infrastructure
 */
export async function ensureDatabaseInitialized() {
  try {
    if (externalPool) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("External PostgreSQL connection timeout")), 1500)
        );
        await Promise.race([externalPool.query("SELECT 1"), timeoutPromise]);
        externalDbHealthy = true;
        console.log("[ACIMS DB] Successfully connected to external PostgreSQL.");
      } catch (err: any) {
        console.warn(`[ACIMS DB] External PostgreSQL not reachable (${err.message}). Using persistent PGlite engine.`);
        externalDbHealthy = false;
      }
    } else {
      console.log("[ACIMS DB] Operating with persistent embedded PGlite engine at data/postgres");
    }

    const rawExec = async (sql: string) => {
      if (global._pgliteInstance) {
        await global._pgliteInstance.exec(sql);
      }
      if (externalDbHealthy && externalPool) {
        try {
          await externalPool.query(sql);
        } catch (e: any) {
          console.warn("[ACIMS DB] External DDL notice:", e.message);
        }
      }
    };

    // 1. Create Core Tables
    await rawExec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'STUDENT',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES profiles(id),
        register_number TEXT,
        pickup_stop_id TEXT,
        assigned_bus_id TEXT,
        assigned_route_id TEXT
      );

      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES profiles(id),
        assigned_bus_id TEXT
      );

      CREATE TABLE IF NOT EXISTS buses (
        id TEXT PRIMARY KEY,
        bus_number TEXT NOT NULL,
        registration_number TEXT,
        route_id TEXT,
        driver_id TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bus_routes (
        id TEXT PRIMARY KEY,
        route_name TEXT NOT NULL,
        route_code TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS bus_stops (
        id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL,
        stop_name TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        sequence_number INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS student_pickup_points (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        stop_id TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        is_primary BOOLEAN NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS bus_locations (
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
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tracking_sessions (
        id TEXT PRIMARY KEY,
        bus_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        ended_at TIMESTAMP WITH TIME ZONE,
        last_location_at TIMESTAMP WITH TIME ZONE,
        status TEXT NOT NULL DEFAULT 'ACTIVE'
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        preferences TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS campus_locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS campus_paths (
        id TEXT PRIMARY KEY,
        from_location_id TEXT NOT NULL,
        to_location_id TEXT NOT NULL,
        distance_meters DOUBLE PRECISION NOT NULL,
        path_points TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS safety_reports (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        report_type TEXT NOT NULL,
        description TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        relationship TEXT NOT NULL,
        phone TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS public_transport_stops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        routes_served TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS public_transport_departures (
        id TEXT PRIMARY KEY,
        stop_id TEXT NOT NULL,
        route_number TEXT NOT NULL,
        destination TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        service_days TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI,SAT',
        is_live BOOLEAN NOT NULL DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS boarding_queue (
        id SERIAL PRIMARY KEY,
        student_id TEXT NOT NULL,
        bus_id TEXT NOT NULL,
        boarding_stop TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'WAITING',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS student_preferences (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        saved_pickup_stop_id TEXT,
        preferred_bus_id TEXT,
        saved_destination_name TEXT,
        saved_destination_lat DOUBLE PRECISION,
        saved_destination_lng DOUBLE PRECISION,
        notification_arrivals BOOLEAN DEFAULT true,
        notification_delays BOOLEAN DEFAULT true,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS student_locations (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Ensure transit dataset and buses are seeded
    try {
      const { seedDatabase } = await import("./seed.ts");
      await seedDatabase();
      console.log("[ACIMS DB] Transit database verified and seeded successfully.");
    } catch (seedErr: any) {
      console.warn("[ACIMS DB] Notice during transit dataset seeding:", seedErr.message);
    }
  } catch (err) {
    console.error("Database initialization notice:", err);
  }
}
