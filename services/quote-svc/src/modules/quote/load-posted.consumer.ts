import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Events } from "@epl/contracts";
import { PubSubEventBus } from "@epl/events";
import { createLogger } from "@epl/observability";
import { config } from "../../config";
import { QuoteService } from "./quote.service";

const logger = createLogger("quote-svc:load-posted");

@Injectable()
export class LoadPostedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly bus = new PubSubEventBus(config.PUBSUB_PROJECT_ID);

  constructor(private readonly quotes: QuoteService) {}

  async onModuleInit() {
    await this.bus.subscribe(Events.Topics.load, "quote-svc.load-posted", async (event) => {
      if (event.type !== Events.LoadEventType.Posted) return;
      const { load } = event.payload as Events.LoadPostedPayload;
      const created = await this.quotes.createFromPostedLoad(event.id, event, load);
      if (created) logger.info({ quoteId: created.id, loadId: load.id }, "load opened for bidding");
    });
  }

  async onModuleDestroy() {
    await this.bus.close().catch(() => undefined);
  }
}
