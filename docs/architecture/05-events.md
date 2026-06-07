# Event-Driven Design

## Transport
- **Google Pub/Sub** as the event bus. Each logical "topic" = a Pub/Sub topic; each consumer = a push or pull subscription.
- Abstracted behind **`packages/events`** (`EventBus.publish(topic, event)` / `EventBus.subscribe(topic, handler)`), so the underlying broker can be swapped to **Kafka/Confluent** later without touching service code.

## Event envelope (every event, enforced by `packages/contracts`)
```jsonc
{
  "id": "uuidv7",              // unique event id (dedupe key)
  "type": "load.posted",      // <domain>.<eventName>
  "version": 1,               // schema version
  "tenantId": "uuid",         // tenant context (mandatory)
  "actor": { "userId": "uuid", "role": "shipper_admin" },
  "occurredAt": "iso8601",
  "correlationId": "uuid",    // ties events across a workflow
  "causationId": "uuid|null", // the event/command that caused this one
  "payload": { /* type-specific, Zod-validated */ }
}
```

## Delivery guarantees
- **At-least-once** delivery (Pub/Sub default). Consumers are **idempotent** (dedupe on `event.id` via Redis/`processed_events` table).
- **Ordering** where needed via Pub/Sub ordering keys (e.g. key = `loadId` so a load's events process in order).
- **Dead-letter topics** per subscription; poison messages parked after N attempts and alerted.
- **Outbox pattern**: services write domain rows + outbox row in one DB transaction; a relay publishes from the outbox → no lost events if the broker is briefly down.

## Topic & event catalog (initial)

### `load.events`
| Event | Emitted by | Consumed by | Purpose |
|---|---|---|---|
| `load.drafted` | load-svc | — | a draft was saved |
| `load.posted` | load-svc | quote-svc, notify-svc, genius-svc | load is live for bidding |
| `load.updated` | load-svc | quote-svc, shipment-svc | fields changed |
| `load.cancelled` | load-svc | quote-svc, notify-svc | load withdrawn |
| `load.duplicated` | load-svc | — | analytics |

### `quote.events`
| `quote.requested` | quote-svc | carrier-svc, notify-svc | shipper wants rates |
| `bid.submitted` | quote-svc | notify-svc | a carrier bid |
| `bid.accepted` | quote-svc | shipment-svc, notify-svc, billing-svc | booking is made → create shipment |

### `shipment.events`
| `shipment.created` | shipment-svc | tracking-svc, doc-svc, notify-svc | booked shipment exists |
| `shipment.milestone` | shipment-svc | notify-svc, tracking-svc | status milestone reached |
| `shipment.delivered` | shipment-svc | doc-svc(POD), billing-svc, notify-svc | completion |

### `tracking.events`
| `position.updated` | tracking-svc | (gateway → WS) | live GPS to clients |
| `eta.recalculated` | tracking-svc | shipment-svc, notify-svc | ETA changed |
| `geofence.entered` | tracking-svc | shipment-svc | arrival detection |

### `doc.events`
| `doc.uploaded` | doc-svc | shipment-svc, notify-svc | new document |
| `doc.verified` | doc-svc | shipment-svc | compliance pass |

### `notify.events` / `audit.events` / `billing.events`
- `notify.*` internal to notify-svc fan-out.
- `audit.*` consumed by the immutable audit store.
- `billing.invoice.issued`, `billing.payment.captured`, `billing.payout.sent`.

## Example workflow: "Shipper books a carrier"
```
1. POST /quotes/:id/accept (gateway → quote-svc)
2. quote-svc: validate bid, persist, write outbox(bid.accepted)
3. bid.accepted ─▶ shipment-svc: create shipment (shipment.created)
                ─▶ billing-svc:  create draft invoice
                ─▶ notify-svc:   notify shipper + carrier
4. shipment.created ─▶ tracking-svc: open a tracking channel
                    ─▶ doc-svc:      provision doc folder
```
Each step is independently retryable and idempotent; the `correlationId` ties the whole booking together for tracing.
