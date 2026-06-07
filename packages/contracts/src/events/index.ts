import { z } from "zod";
import { Load, LoadStatus } from "../load";

/**
 * Event envelope + catalog. Every event published to Pub/Sub conforms to
 * EventEnvelope; payloads are validated against per-type schemas.
 * See docs/architecture/05-events.md.
 */

export const EventActor = z.object({
  userId: z.string().uuid().nullable(),
  role: z.string().nullable(),
});

export const EventEnvelope = z.object({
  id: z.string().uuid(), // unique event id (dedupe key)
  type: z.string(), // "<domain>.<eventName>"
  version: z.number().int().positive().default(1),
  tenantId: z.string().uuid(),
  actor: EventActor,
  occurredAt: z.string().datetime(),
  correlationId: z.string().uuid(),
  causationId: z.string().uuid().nullable().default(null),
  payload: z.unknown(),
});
export type EventEnvelope<T = unknown> = Omit<
  z.infer<typeof EventEnvelope>,
  "payload"
> & { payload: T };

// ── Topic names ──
export const Topics = {
  load: "load.events",
  quote: "quote.events",
  shipment: "shipment.events",
  tracking: "tracking.events",
  doc: "doc.events",
  notify: "notify.events",
  audit: "audit.events",
  billing: "billing.events",
} as const;
export type Topic = (typeof Topics)[keyof typeof Topics];

// ── Event type constants ──
export const LoadEventType = {
  Drafted: "load.drafted",
  Posted: "load.posted",
  Updated: "load.updated",
  Cancelled: "load.cancelled",
  Duplicated: "load.duplicated",
} as const;

// ── Payload schemas (load domain) ──
export const LoadPostedPayload = z.object({ load: Load });
export type LoadPostedPayload = z.infer<typeof LoadPostedPayload>;

export const LoadStatusChangedPayload = z.object({
  loadId: z.string().uuid(),
  reference: z.string(),
  from: LoadStatus,
  to: LoadStatus,
});
export type LoadStatusChangedPayload = z.infer<typeof LoadStatusChangedPayload>;
