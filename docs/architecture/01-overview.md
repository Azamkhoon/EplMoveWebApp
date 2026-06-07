# EPL Move — Platform Architecture (Overview)

> Status: **DRAFT for approval**. No service logic is written until this is approved.
> Decisions locked: **pnpm + Turborepo monorepo** (existing SPA absorbed as `apps/web-shipper`); **GCP Cloud Run + Pub/Sub**, Cloud SQL Postgres, Memorystore Redis; cloud-agnostic core.

## 1. What we are building

EPL Move is a multi-sided logistics marketplace (think Uber-for-freight) with five portals:

| Portal | Primary actor | Core jobs |
|---|---|---|
| **Shipper** | Cargo owner | Post loads, request quotes, book carriers, track, manage docs |
| **Carrier** | Fleet operator / dispatcher | Search loads, bid, accept assignments, manage fleet & drivers |
| **Broker** | 3PL intermediary | Match shippers↔carriers, manage margin, multi-party deals |
| **Driver** | Individual driver | Mobile: accept job, status updates, GPS, POD capture |
| **Admin** | EPL ops/staff | Tenant mgmt, compliance, disputes, observability, billing |

The current Vite/React SPA becomes **`apps/web-shipper`** — the first of these frontends. It will migrate from mock data to the real API gateway incrementally (the existing mock seam, `VITE_*` env + typed data modules, makes this clean).

## 2. Architecture style

- **Microservices**, one bounded context per service, each independently deployable to Cloud Run.
- **Event-driven** via Google **Pub/Sub** (Kafka-compatible semantics through a thin abstraction in `packages/events`, so we can swap to Confluent/Kafka later without touching service code).
- **API Gateway** (a NestJS BFF) is the single ingress for browser/mobile clients; it handles authN, rate limiting, request routing, and response shaping. Internal service-to-service calls are gRPC where synchronous, Pub/Sub where asynchronous.
- **Database-per-service** (logical isolation; physically one Cloud SQL Postgres instance with a schema/database per service to start, splittable later).
- **Multi-tenancy** is first-class (see `04-security.md`): every row, event, and token is tenant-scoped.

## 3. Non-negotiables (from the brief)

1. TypeScript everywhere.
2. AuthN + RBAC + multi-tenancy in every service from day one.
3. Clean module structure: `module / controller / service / repository / dto / events`.
4. Production-grade: validation, error contracts, observability, idempotency, no toy stubs.
5. Event-driven: state changes emit domain events; cross-service workflows are choreographed/orchestrated via those events.

## 4. The services (bounded contexts)

| Service | Responsibility | Owns data |
|---|---|---|
| `api-gateway` | BFF: auth verification, routing, aggregation, WebSocket fan-out | none (stateless) |
| `auth-svc` | Identity, login, JWT/refresh, sessions, password/OTP, SSO hooks | users, credentials, sessions |
| `tenant-svc` | Organizations, membership, RBAC roles & permissions, plans | tenants, memberships, roles |
| `load-svc` | Load lifecycle: post/edit/cancel/duplicate, status machine | loads, load_items |
| `quote-svc` | Quote requests, carrier rates, bid compare, accept bid | quotes, bids |
| `shipment-svc` | Booked shipments, assignment, milestones, ETA | shipments, milestones |
| `tracking-svc` | Real-time GPS ingest, position stream, geofencing, ETA calc | positions (time-series), geofences |
| `doc-svc` | Document upload/download (GCS), customs docs, invoices, POD | documents, invoice metadata |
| `carrier-svc` | Carrier/fleet/driver profiles, ratings, compliance | carriers, vehicles, drivers |
| `notify-svc` | Email/SMS/push/in-app notifications, templating | notifications, preferences |
| `genius-svc` | EPL Genius AI: chat, rate estimation, route optimization, doc/customs assist | conversations, embeddings |
| `billing-svc` | Invoicing, payments, payouts, marketplace fees | invoices, transactions |

> Phase 1 of the backend will stand up `api-gateway`, `auth-svc`, `tenant-svc`, and `load-svc` — the minimum to make the Shipper "Post Load" flow real end-to-end. The rest are scaffolded as empty service skeletons so the contract and topology are visible.

## 5. Request paths

**Synchronous (client → platform):**
```
Browser/Mobile → HTTPS → api-gateway (Cloud Run)
  → verify JWT (auth public keys, cached)
  → resolve tenant + RBAC
  → route to domain service (gRPC / internal HTTP)
  → shape response
```

**Asynchronous (domain events):**
```
load-svc  --LoadPosted-->  Pub/Sub topic: load.events
                              ├── quote-svc   (open it for bidding)
                              ├── notify-svc  (alert matching carriers)
                              └── genius-svc  (pre-compute rate estimate)
```

## 6. Documents in this set

- `01-overview.md` — this file
- `02-monorepo-layout.md` — exact folder tree, workspaces, tooling
- `03-data-model.md` — entities, ownership, multi-tenant keys
- `04-security.md` — auth, RBAC, multi-tenancy, secrets
- `05-events.md` — event catalog, topics, schemas, delivery guarantees
- `06-gcp-topology.md` — Cloud Run / Pub/Sub / Cloud SQL / CI-CD
- `07-roadmap.md` — phased delivery plan (what we build, in what order)
