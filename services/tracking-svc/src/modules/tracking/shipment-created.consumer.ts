import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PubSubEventBus } from "@epl/events";
import { Events } from "@epl/contracts";
import { createLogger } from "@epl/observability";
import { config } from "../../config";
import { TrackingService } from "./tracking.service";

const logger = createLogger("tracking-svc:consumer");

/** Opens a tracking channel when a shipment is created (idempotent). */
@Injectable()
export class ShipmentCreatedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly bus = new PubSubEventBus(config.PUBSUB_PROJECT_ID);

  constructor(private readonly tracking: TrackingService) {}

  async onModuleInit() {
    await this.bus.subscribe(Events.Topics.shipment, "tracking-svc.shipment-created", async (event) => {
      if (event.type !== Events.ShipmentEventType.Created) return;
      const { shipment } = event.payload as Events.ShipmentCreatedPayload;
      const opened = await this.tracking.initFromShipment(event.id, {
        shipmentId: shipment.id,
        tenantId: event.tenantId,
        origin: shipment.origin,
        destination: shipment.destination,
        mode: shipment.mode,
        carrierTenantId: shipment.carrierTenantId,
        correlationId: event.correlationId,
      });
      if (opened) logger.info({ shipmentId: shipment.id }, "tracking channel opened");
    });
    await this.bus.subscribe(
      Events.Topics.shipment,
      "tracking-svc.broker-assigned",
      async (event) => {
        if (event.type !== Events.ShipmentEventType.BrokerAssigned) return;
        const payload = event.payload as {
          shipmentId: string;
          shipperTenantId: string;
          brokerTenantId: string;
        };
        await this.tracking.addParticipant(
          payload.shipmentId,
          payload.shipperTenantId,
          payload.brokerTenantId,
        );
      },
    );
    logger.info("subscribed to shipment.created");
  }

  async onModuleDestroy() {
    await this.bus.close().catch(() => undefined);
  }
}
