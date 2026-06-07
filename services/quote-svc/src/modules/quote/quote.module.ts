import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { QuoteController } from "./quote.controller";
import { QuoteService } from "./quote.service";
import { CarrierClient } from "./carrier.client";
import { OutboxRelay } from "./outbox.relay";

@Module({
  controllers: [QuoteController],
  providers: [QuoteService, CarrierClient, OutboxRelay, Reflector],
})
export class QuoteModule {}
