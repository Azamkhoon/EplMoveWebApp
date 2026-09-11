import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ShipmentController, ShipmentInternalController } from "./shipment.controller";
import { ShipmentService } from "./shipment.service";
import { LoadClient } from "./load.client";
import { BidAcceptedConsumer } from "./bid-accepted.consumer";
import { OutboxRelay } from "./outbox.relay";
import { DocumentActivityConsumer } from "./document-activity.consumer";

@Module({
  controllers: [ShipmentController, ShipmentInternalController],
  providers: [ShipmentService, LoadClient, BidAcceptedConsumer, DocumentActivityConsumer, OutboxRelay, Reflector],
})
export class ShipmentModule {}
