import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Events, type NotificationKind } from "@epl/contracts";
import { PubSubEventBus } from "@epl/events";
import { createLogger } from "@epl/observability";
import { config } from "../../config";
import { NotifyService } from "./notify.service";
import { TenantClient } from "./tenant.client";

const logger = createLogger("notify-svc:consumer");

interface Delivery {
  tenantId: string;
  userId?: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  shipmentId?: string | null;
  referenceId?: string | null;
}

@Injectable()
export class EventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly bus = new PubSubEventBus(config.PUBSUB_PROJECT_ID);

  constructor(
    private readonly notify: NotifyService,
    private readonly tenants: TenantClient,
  ) {}

  private async deliveries(event: Events.EventEnvelope): Promise<Delivery[]> {
    switch (event.type) {
      case Events.LoadEventType.Posted: {
        const { load } = event.payload as Events.LoadPostedPayload;
        const carriers = await this.tenants.list("carrier");
        return carriers.map((carrier) => ({
          tenantId: carrier.id,
          kind: "load_available",
          title: `New load available: ${load.pickup.city} → ${load.delivery.city}`,
          body: `${load.reference} · ${load.commodity} · ${Math.round(load.weightKg).toLocaleString()} kg`,
          link: "/marketplace",
          referenceId: load.id,
        }));
      }
      case Events.QuoteEventType.BidSubmitted: {
        const payload = event.payload as { bid: { id: string; quoteId: string; price: { amount: number } } };
        return [{
          tenantId: event.tenantId,
          kind: "bid_received",
          title: "New carrier offer received",
          body: `A carrier submitted a $${payload.bid.price.amount.toLocaleString()} offer.`,
          link: "/marketplace",
          referenceId: payload.bid.id,
        }];
      }
      case Events.QuoteEventType.BidAccepted: {
        const payload = event.payload as Events.BidAcceptedPayload;
        return [
          {
            tenantId: event.tenantId,
            kind: "booking_confirmed",
            title: "Carrier selected",
            body: `${payload.bid.carrier?.name ?? "Carrier"} was selected for ${payload.reference}.`,
            link: "/shipments",
            referenceId: payload.bid.id,
          },
          {
            tenantId: payload.bid.carrierId,
            kind: "bid_accepted",
            title: "Your offer has been accepted",
            body: `Your offer for ${payload.reference} was accepted.`,
            link: "/shipments",
            referenceId: payload.bid.id,
          },
        ];
      }
      case Events.QuoteEventType.BidRejected: {
        const payload = event.payload as { bid: { id: string; carrierId: string }; reference: string };
        return [{
          tenantId: payload.bid.carrierId,
          kind: "bid_rejected",
          title: "Your offer was not selected",
          body: `Your offer for ${payload.reference} was rejected.`,
          link: "/my-bids",
          referenceId: payload.bid.id,
        }];
      }
      case Events.ShipmentEventType.Created: {
        const { shipment } = event.payload as Events.ShipmentCreatedPayload;
        return [{
          tenantId: shipment.carrierTenantId,
          kind: "shipment_created",
          title: "Booking confirmed",
          body: `Shipment ${shipment.reference} is now booked.`,
          link: "/shipments",
          shipmentId: shipment.id,
          referenceId: shipment.quoteId,
        }];
      }
      case Events.ShipmentEventType.Delivered: {
        const payload = event.payload as { shipment: { id: string; reference: string; carrierTenantId: string; brokerTenantId?: string | null } };
        const recipients = [event.tenantId, payload.shipment.carrierTenantId, payload.shipment.brokerTenantId]
          .filter((id): id is string => Boolean(id));
        return recipients.map((tenantId) => ({
          tenantId,
          kind: "shipment_delivered",
          title: "Shipment delivered",
          body: `Shipment ${payload.shipment.reference} has been delivered.`,
          link: "/shipments",
          shipmentId: payload.shipment.id,
        }));
      }
      case Events.ShipmentEventType.MessageSent: {
        const payload = event.payload as {
          message: { id: string; shipmentId: string; senderTenantId: string; senderName: string; body: string };
          reference: string;
          participantTenantIds: string[];
        };
        return payload.participantTenantIds
          .filter((tenantId) => tenantId !== payload.message.senderTenantId)
          .map((tenantId) => ({
            tenantId,
            kind: "message_received" as const,
            title: `New message on ${payload.reference}`,
            body: `${payload.message.senderName}: ${payload.message.body}`,
            link: `/shipments/${payload.message.shipmentId}`,
            shipmentId: payload.message.shipmentId,
            referenceId: payload.message.id,
          }));
      }
      case Events.ShipmentEventType.BrokerAssigned: {
        const payload = event.payload as {
          shipmentId: string;
          brokerTenantId: string;
          brokerName: string;
        };
        return [{
          tenantId: payload.brokerTenantId,
          kind: "broker_assigned",
          title: "New customs shipment assigned",
          body: `${payload.brokerName} was assigned to a shipment requiring customs support.`,
          link: "/shipments",
          shipmentId: payload.shipmentId,
        }];
      }
      case Events.DocEventType.Requested: {
        const { request, targetTenantId } = event.payload as Events.DocumentRequestedPayload;
        return [{
          tenantId: targetTenantId,
          kind: "document_requested",
          title: `Customs Broker requested ${request.documentType}`,
          body: request.comment ?? request.description ?? request.title,
          link: `/shipments/${request.shipmentId}`,
          shipmentId: request.shipmentId,
          referenceId: request.id,
        }];
      }
      case Events.DocEventType.Uploaded: {
        const payload = event.payload as Events.DocUploadedPayload & {
          requestId?: string;
          targetTenantId?: string;
        };
        if (!payload.targetTenantId) return [];
        return [{
          tenantId: payload.targetTenantId,
          kind: "document_uploaded",
          title: "Requested document has been uploaded",
          body: payload.document.name,
          link: "/documents",
          shipmentId: payload.document.shipmentId ?? null,
          referenceId: payload.requestId ?? payload.document.id,
        }];
      }
      case Events.DocEventType.RequestReviewed: {
        const { request, targetTenantId } = event.payload as Events.DocumentRequestReviewedPayload;
        const kind: NotificationKind =
          request.status === "APPROVED"
            ? "document_approved"
            : request.status === "REVISION_REQUIRED"
              ? "document_revision_required"
              : "document_rejected";
        return [{
          tenantId: targetTenantId,
          kind,
          title:
            request.status === "APPROVED"
              ? `${request.documentType} approved`
              : `${request.documentType} requires attention`,
          body: request.comment ?? `Status changed to ${request.status}.`,
          link: `/shipments/${request.shipmentId}`,
          shipmentId: request.shipmentId,
          referenceId: request.id,
        }];
      }
      case Events.DocEventType.Verified: {
        const { document } = event.payload as Events.DocUploadedPayload;
        return [{
          tenantId: event.tenantId,
          kind: "document_verified",
          title: "Document verified",
          body: `${document.name} was verified.`,
          link: "/documents",
          shipmentId: document.shipmentId ?? null,
          referenceId: document.id,
        }];
      }
      case Events.BillingEventType.InvoiceIssued: {
        const { invoice } = event.payload as Events.InvoiceIssuedPayload;
        return [{
          tenantId: event.tenantId,
          kind: "invoice_issued",
          title: "Invoice issued",
          body: `Invoice ${invoice.number} for ${invoice.reference} — $${invoice.amount.amount} due.`,
          link: "/invoices",
          referenceId: invoice.id,
        }];
      }
      default:
        return [];
    }
  }

  async onModuleInit() {
    const topics = [
      Events.Topics.load,
      Events.Topics.quote,
      Events.Topics.shipment,
      Events.Topics.doc,
      Events.Topics.billing,
    ];
    for (const topic of topics) {
      await this.bus.subscribe(topic, `notify-svc.${topic}`, async (event) => {
        for (const delivery of await this.deliveries(event)) {
          const created = await this.notify.createFromEvent(
            event.id,
            delivery,
            delivery.userId ?? `${delivery.kind}:${delivery.referenceId ?? "company"}`,
          );
          if (created) logger.info({ id: created.id, kind: created.kind }, "notification created");
        }
      });
    }
    logger.info("subscribed to load/quote/shipment/doc/billing events");
  }

  async onModuleDestroy() {
    await this.bus.close().catch(() => undefined);
  }
}
