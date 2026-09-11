import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { QuoteController, MarketplaceController } from "./quote.controller";
import { QuoteService } from "./quote.service";
import { CarrierClient } from "./carrier.client";
import { LoadClient } from "./load.client";
import { OutboxRelay } from "./outbox.relay";
import { LoadPostedConsumer } from "./load-posted.consumer";

@Module({
  controllers: [QuoteController, MarketplaceController],
  providers: [
    QuoteService,
    CarrierClient,
    LoadClient,
    LoadPostedConsumer,
    OutboxRelay,
    Reflector,
  ],
})
export class QuoteModule {}
