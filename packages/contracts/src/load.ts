import { z } from "zod";
import { Dimensions, EquipmentKind, Location, Money, RoadServiceLevel, TransportMode } from "./common.js";

/**
 * Load domain contracts (owned by load-svc).
 * Includes the load status enum and the legal-transition map that the
 * server-side state machine enforces (illegal transition → 409).
 */

export const LoadStatus = z.enum([
  "draft",
  "posted",
  "booked",
  "in_transit",
  "delayed",
  "delivered",
  "cancelled",
]);
export type LoadStatus = z.infer<typeof LoadStatus>;

/** Legal status transitions. Source of truth for load-svc's state machine. */
export const LOAD_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  draft: ["posted", "cancelled"],
  posted: ["booked", "draft", "cancelled"],
  booked: ["in_transit", "cancelled"],
  in_transit: ["delivered", "delayed"],
  delayed: ["in_transit", "delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: LoadStatus, to: LoadStatus): boolean {
  return LOAD_TRANSITIONS[from].includes(to);
}

export const LoadItem = z.object({
  description: z.string().min(1),
  qty: z.number().int().positive(),
  dimensions: Dimensions.optional(),
});
export type LoadItem = z.infer<typeof LoadItem>;

/** Shipment information captured when posting a load. */
export const LoadDetails = z.object({
  mode: TransportMode,
  serviceLevel: RoadServiceLevel.optional(), // only meaningful for Road
  equipmentKind: EquipmentKind.optional(),
  equipmentCode: z.string().optional(), // e.g. "40hc", "tautliner", "flatwagon"
  commodity: z.string().min(1),
  pickup: Location,
  delivery: Location,
  weightKg: z.number().positive(),
  volumeM3: z.number().positive(),
  pieces: z.number().int().positive().optional(),
  value: Money.optional(),
  readyDate: z.string().datetime().optional(),
  incoterm: z.string().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(LoadItem).optional(),
});
export type LoadDetails = z.infer<typeof LoadDetails>;

/** Full persisted load (response shape). */
export const Load = LoadDetails.extend({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  reference: z.string(),
  status: LoadStatus,
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
});
export type Load = z.infer<typeof Load>;

// ── Request DTOs ──
export const CreateLoadInput = LoadDetails.extend({
  asDraft: z.boolean().default(false), // post immediately vs save as draft
});
export type CreateLoadInput = z.infer<typeof CreateLoadInput>;

export const UpdateLoadInput = LoadDetails.partial().extend({
  version: z.number().int().positive(), // optimistic lock
});
export type UpdateLoadInput = z.infer<typeof UpdateLoadInput>;
