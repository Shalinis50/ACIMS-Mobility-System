import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema.ts";

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
  var _pgliteClient: PGlite | undefined;
}

export let pool: pg.Pool | null = null;
export let pgliteClient: PGlite | null = null;

function cleanDatabaseUrl(): string | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  const cleaned = process.env.DATABASE_URL.replace(/^["']|["']$/g, "").trim();
  process.env.DATABASE_URL = cleaned;
  return cleaned;
}

function useEmbeddedDb(): boolean {
  const url = cleanDatabaseUrl();
  return !url && !process.env.SQL_HOST;
}

function createPool(): pg.Pool {
  const url = cleanDatabaseUrl();
  if (url) {
    return new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD ?? "",
    database: process.env.SQL_DB_NAME,
    max: 10,
    connectionTimeoutMillis: 15000,
  });
}

export let db: any;

try {
  if (useEmbeddedDb()) {
    const dataDir = path.resolve(process.cwd(), "data/postgres");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    pgliteClient = global._pgliteClient ?? new PGlite(dataDir);
    global._pgliteClient = pgliteClient;
    console.log(`[src/db] Embedded PostgreSQL (PGlite) at ${dataDir}`);
  } else {
    pool = global._postgresPool ?? createPool();
    global._postgresPool = pool;
    pool.on("error", (err) => console.error("Unexpected error on idle SQL pool client:", err));
    console.log("[src/db] Connected to PostgreSQL");
  }

  db = pool ? drizzlePg(pool, { schema }) : drizzlePglite(pgliteClient!, { schema });
} catch (err) {
  console.warn("[AI Studio] Database not connected — using fallback mock:", err);
  try {
    pgliteClient = new PGlite();
    db = drizzlePglite(pgliteClient, { schema });
  } catch {
    const noOp = {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      create: async (d: any) => d?.data ?? {},
      update: async (d: any) => d?.data ?? {},
      delete: async () => ({}),
    };
    db = new Proxy(
      {},
      {
        get: (_, prop) =>
          prop === "query" ? new Proxy({}, { get: () => noOp }) : () => ({ from: () => ({ where: async () => [] }) }),
      },
    );
  }
}

export async function execSql(text: string): Promise<void> {
  try {
    if (pool) {
      await pool.query(text);
      return;
    }
    if (pgliteClient) {
      await pgliteClient.exec(text);
    }
  } catch (err) {
    console.warn("[src/db] execSql warning:", err instanceof Error ? err.message : err);
  }
}

export { pool as createPoolLegacy };
