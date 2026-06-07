/**
 * Database access layer: Drizzle client factory + tenant-aware transactions
 * that set the Postgres RLS session variable. See docs/architecture/03-data-model.md.
 */

export * from "./client";

/** Marker for the base repository contract every service repo extends. */
export interface BaseRepository<Entity, Id = string> {
  findById(id: Id): Promise<Entity | null>;
  findMany(filter?: Record<string, unknown>): Promise<Entity[]>;
  create(input: Omit<Entity, "id">): Promise<Entity>;
  update(id: Id, patch: Partial<Entity>): Promise<Entity>;
  delete(id: Id): Promise<void>;
}
