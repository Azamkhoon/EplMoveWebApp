import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ShipmentController } from "./shipment.controller";
import { ShipmentService } from "./shipment.service";
import { LoadClient } from "./load.client";
import { BidAcceptedConsumer } from "./bid-accepted.consumer";
import { OutboxRelay } from "./outbox.relay";

@Module({
  controllers: [ShipmentController],
  providers: [ShipmentService, LoadClient, BidAcceptedConsumer, OutboxRelay, Reflector],
})
export class ShipmentModule {}
