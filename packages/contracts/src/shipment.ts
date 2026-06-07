import { z } from "zod";
import { Location, Money, TransportMode } from "./common";

/** Shipment contracts (owned by shipment-svc). Created when a bid is accepted. */

export const ShipmentStatus = z.enum([
  "booked",
  "in_transit",
  "delayed",
  "delivered",
  "cancelled",
]);
export type ShipmentStatus = z.infer<typeof ShipmentStatus>;

export const Milestone = z.object({
  id: z.string().uuid(),
  status: z.string(),
  description: z.string(),
  location: z.string(),
  occurredAt: z.string().datetime().optional(),
  completed: z.boolean(),
});
export type Milestone = z.infer<typeof Milestone>;

export const Shipment = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  reference: z.string(),
  loadId: z.string().uuid(),
  quoteId: z.string().uuid(),
  carrierId: z.string().uuid(),
  carrierName: z.string(),
  status: ShipmentStatus,
  mode: TransportMode,
  origin: Location,
  destination: Location,
  price: Money,
  transitDays: z.number().int().positive(),
  bookedAt: z.string().datetime(),
  etaDate: z.string().datetime().optional(),
  progress: z.number().min(0).max(100).default(0),
  milestones: z.array(Milestone).optional(),
});
export type Shipment = z.infer<typeof Shipment>;
