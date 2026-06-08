import { z } from "zod";

/**
 * Notification domain contracts (owned by notify-svc).
 * notify-svc consumes domain events (bid accepted, shipment created/delivered,
 * document verified, invoice issued) and materializes per-user notifications.
 * Delivery channels (email/SMS/push) are pluggable; in dev they're logged.
 */
export const NotificationKind = z.enum([
  "bid_accepted",
  "shipment_created",
  "shipment_delivered",
  "document_verified",
  "invoice_issued",
]);
export type NotificationKind = z.infer<typeof NotificationKind>;

export const Notification = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  kind: NotificationKind,
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof Notification>;

export const MarkReadInput = z.object({
  ids: z.array(z.string().uuid()).optional(), // omit → mark all read
});
export type MarkReadInput = z.infer<typeof MarkReadInput>;
