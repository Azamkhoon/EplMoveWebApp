import type { Events } from "@epl/contracts";

export interface PublishOptions {
  /** Ordering key (e.g. loadId) — guarantees per-key ordering. */
  orderingKey?: string;
}

export type EventHandler<T = unknown> = (
  event: Events.EventEnvelope<T>,
) => Promise<void>;

/**
 * Broker-agnostic event bus. Production/local = Pub/Sub (PubSubEventBus);
 * swappable to Kafka later without touching service code.
 */
export interface EventBus {
  publish<T>(
    topic: string,
    event: Events.EventEnvelope<T>,
    opts?: PublishOptions,
  ): Promise<void>;

  /** Handlers MUST be idempotent (at-least-once delivery; dedupe on event.id). */
  subscribe<T>(
    topic: string,
    subscription: string,
    handler: EventHandler<T>,
  ): Promise<void>;
}

/** Build a well-formed envelope (fills id/occurredAt/version defaults). */
export function makeEvent<T>(input: {
  type: string;
  tenantId: string;
  payload: T;
  actor?: Events.EventEnvelope["actor"];
  correlationId?: string;
  causationId?: string | null;
  version?: number;
}): Events.EventEnvelope<T> {
  return {
    id: crypto.randomUUID(),
    type: input.type,
    version: input.version ?? 1,
    tenantId: input.tenantId,
    actor: input.actor ?? { userId: null, role: null },
    occurredAt: new Date().toISOString(),
    correlationId: input.correlationId ?? crypto.randomUUID(),
    causationId: input.causationId ?? null,
    payload: input.payload,
  };
}
