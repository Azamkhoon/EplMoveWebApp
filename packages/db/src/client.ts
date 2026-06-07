import { Pool, type PoolClient } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  schema?: string; // search_path for the owning service
  ssl?: boolean;
  max?: number;
}

export type Database = NodePgDatabase<Record<string, never>>;

/**
 * Creates a shared pg Pool + Drizzle client for a service. One per process.
 * `schema` sets the default search_path so a service only sees its own schema.
 */
export function createDb(config: DbConfig) {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    max: config.max ?? 10,
  });

  if (config.schema) {
    pool.on("connect", (client) => {
      void client.query(`SET search_path TO "${config.schema}", public`);
    });
  }

  const db = drizzle(pool);
  return { pool, db };
}

/**
 * Run `fn` inside a transaction with the tenant RLS variable set, so Postgres
 * Row-Level Security policies (tenant_id = current_setting('app.tenant_id'))
 * apply. This is the database-layer backstop for multi-tenancy.
 */
export async function withTenantTx<T>(
  pool: Pool,
  tenantId: string,
  fn: (db: Database, client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // SET LOCAL is scoped to the transaction; safe against connection reuse.
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const txDb = drizzle(client);
    const result = await fn(txDb, client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export { sql };
