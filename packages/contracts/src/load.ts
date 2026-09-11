import { z } from "zod";
import { Dimensions, EquipmentKind, Location, Money, RoadServiceLevel, TransportMode } from "./common";

/**
 * Load domain contracts (owned by load-svc).
 * Includes the load status enum and the legal-transition map that the
 * server-side state machine enforces (illegal transition → 409).
 */

export const LoadStatus = z.enum([
  "draft",
  "posted",
  "open_for_bids",
  "bid_received",
  "carrier_selected",
  "booked",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "customs",
  "delayed",
  "delivered",
  "completed",
  "cancelled",
]);
export type LoadStatus = z.infer<typeof LoadStatus>;

/** Legal status transitions. Source of truth for load-svc's state machine. */
export const LOAD_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  draft: ["posted", "cancelled"],
  posted: ["open_for_bids", "bid_received", "carrier_selected", "booked", "draft", "cancelled"],
  open_for_bids: ["bid_received", "carrier_selected", "cancelled"],
  bid_received: ["carrier_selected", "open_for_bids", "cancelled"],
  carrier_selected: ["booked", "cancelled"],
  booked: ["pickup_scheduled", "picked_up", "in_transit", "cancelled"],
  pickup_scheduled: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "customs", "cancelled"],
  in_transit: ["customs", "delivered", "delayed"],
  customs: ["in_transit", "delivered", "delayed"],
  delayed: ["in_transit", "customs", "delivered"],
  delivered: ["completed"],
  completed: [],
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
  cargoDescription: z.string().max(4000).optional(),
  pickup: Location,
  delivery: Location,
  weightKg: z.number().positive(),
  volumeM3: z.number().positive(),
  pieces: z.number().int().positive().optional(),
  dimensions: Dimensions.optional(),
  value: Money.optional(),
  readyDate: z.string().datetime().optional(),
  requiredDeliveryDate: z.string().datetime().optional(),
  incoterm: z.string().optional(),
  truckType: z.string().optional(),
  trailerType: z.string().optional(),
  temperature: z
    .object({ minC: z.number().optional(), maxC: z.number().optional() })
    .optional(),
  customsInfo: z.string().max(4000).optional(),
  dangerousGoods: z.boolean().default(false),
  specialInstructions: z.string().max(4000).optional(),
  requiredDocuments: z.array(z.string()).default([]),
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
