import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import { PubSubEventBus, relayOutbox } from "@epl/events";
import { createLogger } from "@epl/observability";
import { config } from "../../config";

const logger = createLogger("quote-svc:outbox");

@Injectable()
export class OutboxRelay implements OnModuleInit, OnModuleDestroy {
  private readonly pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });
  private readonly bus = new PubSubEventBus(config.PUBSUB_PROJECT_ID);
  private timer?: NodeJS.Timeout;
  private running = false;

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), config.OUTBOX_RELAY_MS);
    logger.info({ intervalMs: config.OUTBOX_RELAY_MS }, "outbox relay started");
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.bus.close().catch(() => undefined);
    await this.pool.end().catch(() => undefined);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const n = await relayOutbox(client, config.DB_SCHEMA, this.bus);
      await client.query("COMMIT");
      if (n > 0) logger.info({ published: n }, "outbox flushed");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      logger.error({ err }, "outbox relay tick failed");
    } finally {
      client.release();
      this.running = false;
    }
  }
}
