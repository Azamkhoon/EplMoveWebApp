import { PubSub, type Subscription } from "@google-cloud/pubsub";
import type { Events } from "@epl/contracts";
import type { EventBus, EventHandler, PublishOptions } from "./bus";

/**
 * Google Pub/Sub implementation of EventBus. Honors PUBSUB_EMULATOR_HOST for
 * local dev (set by docker-compose). Topics/subscriptions are auto-created if
 * missing so local boot is zero-config. See docs/architecture/05-events.md.
 */
export class PubSubEventBus implements EventBus {
  private readonly client: PubSub;
  private readonly ensuredTopics = new Set<string>();
  private readonly subscriptions: Subscription[] = [];

  constructor(projectId = process.env.PUBSUB_PROJECT_ID ?? "epl-move-local") {
    this.client = new PubSub({ projectId });
  }

  private async ensureTopic(topic: string) {
    if (this.ensuredTopics.has(topic)) return;
    const [exists] = await this.client.topic(topic).exists();
    if (!exists) await this.client.createTopic(topic).catch(() => undefined);
    this.ensuredTopics.add(topic);
  }

  async publish<T>(
    topic: string,
    event: Events.EventEnvelope<T>,
    opts?: PublishOptions,
  ): Promise<void> {
    await this.ensureTopic(topic);
    const t = this.client.topic(topic, {
      messageOrdering: Boolean(opts?.orderingKey),
    });
    await t.publishMessage({
      data: Buffer.from(JSON.stringify(event)),
      orderingKey: opts?.orderingKey,
      attributes: { type: event.type, tenantId: event.tenantId, eventId: event.id },
    });
  }

  async subscribe<T>(
    topic: string,
    subscription: string,
    handler: EventHandler<T>,
  ): Promise<void> {
    await this.ensureTopic(topic);
    const [exists] = await this.client.subscription(subscription).exists();
    if (!exists) {
      await this.client
        .topic(topic)
        .createSubscription(subscription, { enableMessageOrdering: true })
        .catch(() => undefined);
    }
    const sub = this.client.subscription(subscription);
    sub.on("message", async (message) => {
      try {
        const event = JSON.parse(message.data.toString()) as Events.EventEnvelope<T>;
        await handler(event);
        message.ack();
      } catch {
        // nack → redelivery (at-least-once); DLQ handles poison messages.
        message.nack();
      }
    });
    this.subscriptions.push(sub);
  }

  async close(): Promise<void> {
    await Promise.all(this.subscriptions.map((s) => s.close()));
    await this.client.close();
  }
}
