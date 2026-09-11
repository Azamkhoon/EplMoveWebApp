import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PubSubEventBus } from "@epl/events";
import { Events } from "@epl/contracts";
import { createLogger } from "@epl/observability";
import { config } from "../../config";
import { ShipmentService } from "./shipment.service";
import { LoadClient } from "./load.client";

const logger = createLogger("shipment-svc:consumer");

/**
 * Subscribes to bid.accepted and creates the shipment. Idempotent (dedupe on
 * event id in shipment.processed_events) so at-least-once delivery is safe.
 * See docs/architecture/05-events.md.
 */
@Injectable()
export class BidAcceptedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly bus = new PubSubEventBus(config.PUBSUB_PROJECT_ID);

  constructor(
    private readonly shipments: ShipmentService,
    private readonly loads: LoadClient,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe(
      Events.Topics.quote,
      "shipment-svc.bid-accepted",
      async (event) => {
        if (event.type !== Events.QuoteEventType.BidAccepted) return;
        const payload = event.payload as Events.BidAcceptedPayload;
        const { bid } = payload;

        // Fetch the load's route/cargo for the shipment.
        const load = await this.loads.getLoad(payload.loadId, event.tenantId);
        const origin = load?.pickup ?? { city: "Origin", country: "", lat: 0, lng: 0 };
        const destination = load?.delivery ?? { city: "Destination", country: "", lat: 0, lng: 0 };

        const created = await this.shipments.createFromBid(
          event.id,
          {
            tenantId: event.tenantId,
            loadId: payload.loadId,
            quoteId: payload.quoteId,
            bidId: bid.id,
            reference: payload.reference,
            carrierId: bid.carrierId,
            carrierName: bid.carrier?.name ?? "Carrier",
            mode: bid.mode,
            origin,
            destination,
            priceAmount: bid.price.amount,
            priceCurrency: bid.price.currency,
            transitDays: bid.transitDays,
            correlationId: event.correlationId,
          },
          this.bus,
        );

        if (created) {
          logger.info({ shipmentId: created.id, reference: created.reference }, "shipment created from bid");
        }
      },
    );
    logger.info("subscribed to bid.accepted");
  }

  async onModuleDestroy() {
    await this.bus.close().catch(() => undefined);
  }
}
