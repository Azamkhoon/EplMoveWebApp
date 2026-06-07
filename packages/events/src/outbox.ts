import type { PoolClient } from "pg";
import type { Events } from "@epl/contracts";
import type { EventBus, PublishOptions } from "./bus";

/**
 * Transactional outbox. Services write the event into an `outbox` table in the
 * SAME transaction as the domain change (so no event is lost if the broker is
 * down), then a relay publishes pending rows and marks them sent.
 * See docs/architecture/05-events.md.
 *
 * Expected table (created per-service migration):
 *   outbox(id uuid pk, topic text, ordering_key text null,
 *          event jsonb, published_at timestamptz null, created_at timestamptz)
 */

export interface OutboxRow {
  topic: string;
  orderingKey?: string;
  event: Events.EventEnvelope;
}

/** Insert an event into the outbox within an existing transaction client. */
export async function enqueueOutbox(
  client: PoolClient,
  schema: string,
  row: OutboxRow,
): Promise<void> {
  await client.query(
    `INSERT INTO "${schema}".outbox (id, topic, ordering_key, event, created_at)
     VALUES ($1, $2, $3, $4, now())`,
    [row.event.id, row.topic, row.orderingKey ?? null, JSON.stringify(row.event)],
  );
}

/**
 * Relay: publish unsent outbox rows to the bus, mark them published.
 * Run on an interval (or LISTEN/NOTIFY) inside each service.
 * Returns the number of events published.
 */
export async function relayOutbox(
  client: PoolClient,
  schema: string,
  bus: EventBus,
  batchSize = 100,
): Promise<number> {
  const { rows } = await client.query<{
    id: string;
    topic: string;
    ordering_key: string | null;
    event: Events.EventEnvelope;
  }>(
    `SELECT id, topic, ordering_key, event
       FROM "${schema}".outbox
      WHERE published_at IS NULL
      ORDER BY created_at
      LIMIT $1
      FOR UPDATE SKIP LOCKED`,
    [batchSize],
  );

  let published = 0;
  for (const r of rows) {
    const opts: PublishOptions | undefined = r.ordering_key
      ? { orderingKey: r.ordering_key }
      : undefined;
    await bus.publish(r.topic, r.event, opts);
    await client.query(
      `UPDATE "${schema}".outbox SET published_at = now() WHERE id = $1`,
      [r.id],
    );
    published += 1;
  }
  return published;
}
