import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TrackingController } from "./tracking.controller";
import { TrackingService } from "./tracking.service";
import { ShipmentCreatedConsumer } from "./shipment-created.consumer";
import { TrackingWsGateway } from "./ws.gateway";
import { OutboxRelay } from "./outbox.relay";

@Module({
  controllers: [TrackingController],
  providers: [TrackingService, ShipmentCreatedConsumer, TrackingWsGateway, OutboxRelay, Reflector],
  exports: [TrackingWsGateway],
})
export class TrackingModule {}
