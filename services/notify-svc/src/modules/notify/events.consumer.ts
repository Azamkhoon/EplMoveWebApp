import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PubSubEventBus } from "@epl/events";
import { Events, type NotificationKind } from "@epl/contracts";
import { createLogger } from "@epl/observability";
import { config } from "../../config";
import { NotifyService } from "./notify.service";

const logger = createLogger("notify-svc:consumer");

/** Maps a domain event to a user-facing notification, or null to ignore it. */
function toNotification(
  event: Events.EventEnvelope,
): { kind: NotificationKind; title: string; body: string; link: string | null } | null {
  switch (event.type) {
    case Events.QuoteEventType.BidAccepted: {
      const p = event.payload as Events.BidAcceptedPayload;
      return {
        kind: "bid_accepted",
        title: "Bid accepted",
        body: `You accepted ${p.bid.carrier?.name ?? "a carrier"}'s bid for ${p.reference} ($${p.bid.price.amount}).`,
        link: "/shipments",
      };
    }
    case Events.ShipmentEventType.Created: {
      const p = event.payload as Events.ShipmentCreatedPayload;
      return {
        kind: "shipment_created",
        title: "Shipment booked",
        body: `Shipment ${p.shipment.reference} was created with ${p.shipment.carrierName}.`,
        link: "/live-tracking",
      };
    }
    case Events.ShipmentEventType.Delivered: {
      const p = event.payload as Events.ShipmentCreatedPayload;
      return {
        kind: "shipment_delivered",
        title: "Shipment delivered",
        body: `Shipment ${p.shipment?.reference ?? ""} has been delivered.`,
        link: "/shipments",
      };
    }
    case Events.DocEventType.Verified: {
      const p = event.payload as Events.DocUploadedPayload;
      return {
        kind: "document_verified",
        title: "Document verified",
        body: `${p.document?.name ?? "A document"} was verified.`,
        link: "/documents",
      };
    }
    case Events.BillingEventType.InvoiceIssued: {
      const p = event.payload as Events.InvoiceIssuedPayload;
      return {
        kind: "invoice_issued",
        title: "Invoice issued",
        body: `Invoice ${p.invoice.number} for ${p.invoice.reference} — $${p.invoice.amount.amount} due.`,
        link: "/invoices",
      };
    }
    default:
      return null;
  }
}

/**
 * Fans in domain events from several topics and materializes notifications.
 * Idempotent (dedupe on event id) so at-least-once delivery is safe.
 */
@Injectable()
export class EventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly bus = new PubSubEventBus(config.PUBSUB_PROJECT_ID);

  constructor(private readonly notify: NotifyService) {}

  async onModuleInit() {
    const topics = [
      Events.Topics.quote,
      Events.Topics.shipment,
      Events.Topics.doc,
      Events.Topics.billing,
    ];
    for (const topic of topics) {
      await this.bus.subscribe(topic, `notify-svc.${topic}`, async (event) => {
        const mapped = toNotification(event);
        if (!mapped) return;
        const created = await this.notify.createFromEvent(event.id, {
          tenantId: event.tenantId,
          ...mapped,
        });
        if (created) {
          // In dev this is the "delivery" — a real provider (email/SMS/push)
          // plugs in here behind EMAIL_PROVIDER_URL.
          logger.info({ id: created.id, kind: created.kind }, "notification created");
        }
      });
    }
    logger.info("subscribed to quote/shipment/doc/billing events");
  }

  async onModuleDestroy() {
    await this.bus.close().catch(() => undefined);
  }
}
