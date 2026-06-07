import type { Events } from "@epl/contracts";

/**
 * Event bus abstraction. Production = Google Pub/Sub; local dev = Pub/Sub
 * emulator. The interface is broker-agnostic so we can swap to Kafka/Confluent
 * later without touching service code. See docs/architecture/05-events.md.
 *
 * Phase-0: interface + envelope helper only. Pub/Sub driver lands in Phase 1.
 */

export interface PublishOptions {
  /** Ordering key (e.g. loadId) — guarantees per-key ordering. */
  orderingKey?: string;
}

export type EventHandler<T = unknown> = (
  event: Events.EventEnvelope<T>,
) => Promise<void>;

export interface EventBus {
  publish<T>(
    topic: string,
    event: Events.EventEnvelope<T>,
    opts?: PublishOptions,
  ): Promise<void>;

  /**
   * Subscribe a handler to a topic. Handlers MUST be idempotent
   * (at-least-once delivery; dedupe on event.id).
   */
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
