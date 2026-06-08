import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { BidAcceptedConsumer } from "./bid-accepted.consumer";
import { OutboxRelay } from "./outbox.relay";

@Module({
  controllers: [BillingController],
  providers: [BillingService, BidAcceptedConsumer, OutboxRelay],
})
export class BillingModule {}
