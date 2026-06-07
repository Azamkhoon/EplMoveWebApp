/**
 * Database access layer: Drizzle client factory + tenant-aware base repository
 * that auto-injects `tenant_id` into every query and sets the Postgres
 * RLS session variable. See docs/architecture/03-data-model.md.
 * Phase-0: public surface only. Drizzle wiring + RLS lands in Phase 1.
 */

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string; // schema/db for the owning service
  ssl?: boolean;
}

/**
 * Establishes a per-request DB session bound to a tenant:
 * runs `SET LOCAL app.tenant_id = <tenantId>` so RLS policies apply.
 */
export interface TenantScopedDb {
  readonly tenantId: string;
  /** Run work inside a transaction with the tenant RLS variable set. */
  withTenant<T>(fn: () => Promise<T>): Promise<T>;
}

/** Marker for the base repository contract every service repo extends. */
export interface BaseRepository<Entity, Id = string> {
  findById(id: Id): Promise<Entity | null>;
  findMany(filter?: Record<string, unknown>): Promise<Entity[]>;
  create(input: Omit<Entity, "id">): Promise<Entity>;
  update(id: Id, patch: Partial<Entity>): Promise<Entity>;
  delete(id: Id): Promise<void>;
}
