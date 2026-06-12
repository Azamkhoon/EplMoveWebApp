import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { QuoteController, MarketplaceController } from "./quote.controller";
import { QuoteService } from "./quote.service";
import { CarrierClient } from "./carrier.client";
import { OutboxRelay } from "./outbox.relay";

@Module({
  controllers: [QuoteController, MarketplaceController],
  providers: [QuoteService, CarrierClient, OutboxRelay, Reflector],
})
export class QuoteModule {}
