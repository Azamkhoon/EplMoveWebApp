import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PubSubEventBus } from "@epl/events";
import { Events } from "@epl/contracts";
import { createLogger } from "@epl/observability";
import { config } from "../../config";
import { BillingService } from "./billing.service";

const logger = createLogger("billing-svc:consumer");

/**
 * Subscribes to bid.accepted and raises the freight invoice. Idempotent
 * (dedupe on event id + unique quote_id) so at-least-once delivery is safe.
 */
@Injectable()
export class BidAcceptedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly bus = new PubSubEventBus(config.PUBSUB_PROJECT_ID);

  constructor(private readonly billing: BillingService) {}

  async onModuleInit() {
    await this.bus.subscribe(
      Events.Topics.quote,
      "billing-svc.bid-accepted",
      async (event) => {
        if (event.type !== Events.QuoteEventType.BidAccepted) return;
        const payload = event.payload as Events.BidAcceptedPayload;
        const { bid } = payload;

        const invoice = await this.billing.createFromBid(
          event.id,
          {
            tenantId: event.tenantId,
            loadId: payload.loadId,
            quoteId: payload.quoteId,
            reference: payload.reference,
            carrierName: bid.carrier?.name ?? "Carrier",
            amount: bid.price.amount,
            currency: bid.price.currency,
            correlationId: event.correlationId,
          },
          this.bus,
        );

        if (invoice) {
          logger.info({ invoiceId: invoice.id, number: invoice.number }, "invoice issued from bid");
        }
      },
    );
    logger.info("subscribed to bid.accepted");
  }

  async onModuleDestroy() {
    await this.bus.close().catch(() => undefined);
  }
}
