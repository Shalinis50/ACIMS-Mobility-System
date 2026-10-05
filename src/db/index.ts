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

function useEmbeddedDb(): boolean {
  return !process.env.DATABASE_URL && !process.env.SQL_HOST;
}

function createPool(): pg.Pool {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
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

export const db = pool ? drizzlePg(pool, { schema }) : drizzlePglite(pgliteClient!, { schema });

export async function execSql(text: string): Promise<void> {
  if (pool) {
    await pool.query(text);
    return;
  }
  if (pgliteClient) {
    await pgliteClient.exec(text);
  }
}

export { pool as createPoolLegacy };
