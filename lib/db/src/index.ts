import pg from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema/index.ts";
import fs from "node:fs";
import path from "node:path";

const { Pool } = pg;

declare global {
  var _pgliteClient: PGlite | undefined;
}

export type DbClient = any;

let pool: any = null;
let pgliteClient: PGlite | null = null;
let db: any = null;

// Determine connection strategy
const rawDbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/^["']|["']$/g, "").trim() : undefined;
if (rawDbUrl) {
  process.env.DATABASE_URL = rawDbUrl;
  try {
    pool = new Pool({
      connectionString: rawDbUrl,
      ssl: rawDbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
    });
    db = drizzlePg(pool, { schema });
    console.log("[ACIMS DB] Connected to external PostgreSQL via DATABASE_URL");
  } catch (err) {
    console.error("[ACIMS DB] Failed to initialize PostgreSQL pool:", err);
  }
}

if (!db) {
  // Use persistent embedded PostgreSQL engine
  const dataDir = path.resolve(process.cwd(), "data/postgres");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  pgliteClient = global._pgliteClient ?? new PGlite(dataDir);
  global._pgliteClient = pgliteClient;
  db = drizzlePglite(pgliteClient, { schema });
  console.log(`[ACIMS DB] Persistent PostgreSQL engine initialized at ${dataDir}`);
}

/**
 * Execute raw parameterized SQL directly against PostgreSQL
 */
export async function executeQuery<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  if (pool) {
    const res = await pool.query(text, params);
    return { rows: res.rows };
  }
  if (pgliteClient) {
    const res = await pgliteClient.query(text, params);
    return { rows: res.rows as T[] };
  }
  throw new Error("Database engine is not initialized");
}

/**
 * Initialize all database tables in PostgreSQL if not already present.
 * Ensures strict schema adherence without inserting demo accounts.
 */
export async function initDatabase() {
  const ddl = `
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      student_id TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      batch TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      profile_id TEXT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      bus_id TEXT,
      route_id TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      license_number TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS buses (
      id TEXT PRIMARY KEY,
      bus_number TEXT NOT NULL,
      route_id TEXT NOT NULL,
      driver_id TEXT,
      capacity INTEGER NOT NULL DEFAULT 40,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      status TEXT NOT NULL DEFAULT 'ON ROUTE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      role TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS safety_reports (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      report_type TEXT NOT NULL,
      description TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS safety_alerts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  if (pool) {
    await pool.query(ddl);
  } else if (pgliteClient) {
    await pgliteClient.exec(ddl);
  }

  console.log("[ACIMS DB] Verified PostgreSQL schema: profiles, students, drivers, buses, sessions");
}

export { pool, db, pgliteClient };
export * from "./schema/index.ts";
