import { z } from "zod";
import { Load, LoadStatus } from "../load";
import { Bid } from "../quote";
import { Shipment } from "../shipment";
import { TrackingState } from "../tracking";
import { DocumentRequest, ShipmentDocument } from "../document";
import { Invoice } from "../billing";

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

// ── Quote/bid event types ──
export const QuoteEventType = {
  Requested: "quote.requested",
  BidSubmitted: "bid.submitted",
  BidAccepted: "bid.accepted",
  BidRejected: "bid.rejected",
  BidUpdated: "bid.updated",
  BidWithdrawn: "bid.withdrawn",
} as const;

// ── Shipment event types ──
export const ShipmentEventType = {
  Created: "shipment.created",
  Milestone: "shipment.milestone",
  Delivered: "shipment.delivered",
  MessageSent: "shipment.message.sent",
  BrokerAssigned: "shipment.broker.assigned",
} as const;

// ── Tracking event types ──
export const TrackingEventType = {
  PositionUpdated: "position.updated",
  EtaRecalculated: "eta.recalculated",
  GeofenceEntered: "geofence.entered",
} as const;

// ── Document event types ──
export const DocEventType = {
  Uploaded: "doc.uploaded",
  Verified: "doc.verified",
  Requested: "doc.requested",
  RequestReviewed: "doc.request.reviewed",
} as const;

// ── Billing event types ──
export const BillingEventType = {
  InvoiceIssued: "invoice.issued",
  InvoicePaid: "invoice.paid",
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

// ── Payload schemas (quote/shipment domain) ──
export const BidAcceptedPayload = z.object({
  quoteId: z.string().uuid(),
  loadId: z.string().uuid(),
  reference: z.string(),
  bid: Bid,
});
export type BidAcceptedPayload = z.infer<typeof BidAcceptedPayload>;

export const ShipmentCreatedPayload = z.object({ shipment: Shipment });
export type ShipmentCreatedPayload = z.infer<typeof ShipmentCreatedPayload>;

// ── Payload schemas (tracking/doc domain) ──
export const PositionUpdatedPayload = z.object({ state: TrackingState });
export type PositionUpdatedPayload = z.infer<typeof PositionUpdatedPayload>;

export const GeofenceEnteredPayload = z.object({
  shipmentId: z.string().uuid(),
  kind: z.enum(["origin", "destination"]),
});
export type GeofenceEnteredPayload = z.infer<typeof GeofenceEnteredPayload>;

export const DocUploadedPayload = z.object({
  document: ShipmentDocument,
  requestId: z.string().uuid().optional(),
  targetTenantId: z.string().uuid().optional(),
});
export type DocUploadedPayload = z.infer<typeof DocUploadedPayload>;

export const DocumentRequestedPayload = z.object({
  request: DocumentRequest,
  targetTenantId: z.string().uuid(),
});
export type DocumentRequestedPayload = z.infer<typeof DocumentRequestedPayload>;

export const DocumentRequestReviewedPayload = z.object({
  request: DocumentRequest,
  targetTenantId: z.string().uuid(),
});
export type DocumentRequestReviewedPayload = z.infer<typeof DocumentRequestReviewedPayload>;

// ── Payload schemas (billing domain) ──
export const InvoiceIssuedPayload = z.object({ invoice: Invoice });
export type InvoiceIssuedPayload = z.infer<typeof InvoiceIssuedPayload>;
