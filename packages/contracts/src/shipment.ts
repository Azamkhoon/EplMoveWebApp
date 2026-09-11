import { z } from "zod";
import { Location, Money, TransportMode } from "./common";

/** Shipment contracts (owned by shipment-svc). Created when a bid is accepted. */

export const ShipmentStatus = z.enum([
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

export const ShipmentActivity = z.object({
  id: z.string().uuid(),
  shipmentId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  actorUserId: z.string().uuid().nullable(),
  actorRole: z.string().nullable(),
  referenceId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type ShipmentActivity = z.infer<typeof ShipmentActivity>;

export const ShipmentMessage = z.object({
  id: z.string().uuid(),
  shipmentId: z.string().uuid(),
  senderUserId: z.string().uuid(),
  senderTenantId: z.string().uuid(),
  senderRole: z.string(),
  senderName: z.string(),
  body: z.string(),
  createdAt: z.string().datetime(),
});
export type ShipmentMessage = z.infer<typeof ShipmentMessage>;

export const SendShipmentMessageInput = z.object({
  body: z.string().trim().min(1).max(4000),
});
export type SendShipmentMessageInput = z.infer<typeof SendShipmentMessageInput>;

export const Shipment = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  shipperTenantId: z.string().uuid(),
  reference: z.string(),
  loadId: z.string().uuid(),
  quoteId: z.string().uuid(),
  carrierId: z.string().uuid(),
  carrierTenantId: z.string().uuid(),
  carrierName: z.string(),
  brokerTenantId: z.string().uuid().nullable(),
  brokerName: z.string().nullable(),
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
  activity: z.array(ShipmentActivity).optional(),
});
export type Shipment = z.infer<typeof Shipment>;

export const AssignBrokerInput = z.object({
  brokerTenantId: z.string().uuid(),
  brokerName: z.string().min(1),
});
export type AssignBrokerInput = z.infer<typeof AssignBrokerInput>;

export const UpdateShipmentStatusInput = z.object({
  status: ShipmentStatus,
  comment: z.string().max(2000).optional(),
});
export type UpdateShipmentStatusInput = z.infer<typeof UpdateShipmentStatusInput>;
