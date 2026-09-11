import { z } from "zod";

/**
 * Notification domain contracts (owned by notify-svc).
 * notify-svc consumes domain events (bid accepted, shipment created/delivered,
 * document verified, invoice issued) and materializes per-user notifications.
 * Delivery channels (email/SMS/push) are pluggable; in dev they're logged.
 */
export const NotificationKind = z.enum([
  "load_available",
  "bid_received",
  "bid_accepted",
  "bid_rejected",
  "booking_confirmed",
  "shipment_created",
  "broker_assigned",
  "shipment_delivered",
  "message_received",
  "document_requested",
  "document_uploaded",
  "document_approved",
  "document_rejected",
  "document_revision_required",
  "document_verified",
  "invoice_issued",
]);
export type NotificationKind = z.infer<typeof NotificationKind>;

export const Notification = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  companyId: z.string().uuid(),
  kind: NotificationKind,
  title: z.string(),
  body: z.string(),
  shipmentId: z.string().uuid().nullable(),
  referenceId: z.string().uuid().nullable(),
  link: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof Notification>;

export const MarkReadInput = z.object({
  ids: z.array(z.string().uuid()).optional(), // omit → mark all read
});
export type MarkReadInput = z.infer<typeof MarkReadInput>;
