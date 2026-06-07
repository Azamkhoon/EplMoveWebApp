# Delivery Roadmap

Phased so that **something works end-to-end early**, then breadth is added. Each phase is independently shippable and reviewable.

## Phase 0 — Foundation (scaffolding only, no business logic)
**Goal:** the monorepo exists, builds, and the SPA still runs unchanged.
- [ ] Initialize pnpm + Turborepo at root (`pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.nvmrc`).
- [ ] Move existing SPA → `apps/web-shipper` (git-mv, preserve history; fix paths).
- [ ] Create `packages/contracts`, `packages/config`, `packages/db`, `packages/auth`, `packages/events`, `packages/observability` as empty typed packages with their public API surface stubbed.
- [ ] Create all `services/*` as NestJS skeletons (boot + `/health`, nothing else) so topology is real.
- [ ] `infra/docker/docker-compose.yml` (Postgres, Redis, Pub/Sub emulator/Redpanda).
- **Exit criteria:** `pnpm install && pnpm build` green; `pnpm dev:shipper` runs the SPA; every service responds on `/health`.

## Phase 1 — Identity & first vertical slice
**Goal:** real auth + multi-tenancy + the Shipper "Post Load" flow end-to-end against a real DB.
- [ ] `auth-svc`: register/login, RS256 JWT, refresh rotation, sessions.
- [ ] `tenant-svc`: tenants, memberships, roles/permissions, seed system roles.
- [ ] `packages/auth`: JWT verify, `@RequirePermissions`, tenant context middleware + RLS wiring.
- [ ] `load-svc`: full CRUD + state machine (post/edit/cancel/duplicate) + `load.*` events + outbox.
- [ ] `api-gateway`: auth verify, routing to auth/tenant/load, error contract, rate limiting.
- [ ] `packages/sdk`: typed client generated from contracts.
- [ ] `apps/web-shipper`: wire **login** + **Post Load wizard** + **Shipments list** to the gateway (replacing the mock store we discussed — now backed by the real API). Behind a `VITE_API_URL` flag so the mock still works offline.
- **Exit criteria:** a user logs in, posts a load in the SPA, it persists in Postgres, emits `load.posted`, and appears in the list — across page reloads and different sessions.

## Phase 2 — Marketplace core
- [ ] `quote-svc`: quote requests, carrier bids, compare, **accept bid** → `bid.accepted`.
- [ ] `shipment-svc`: consume `bid.accepted` → create shipment, milestones, ETA.
- [ ] `carrier-svc`: carrier/fleet profiles, ratings (feeds "compare carrier ratings").
- [ ] SPA: Quotation + Carrier comparison + booking wired to real services.

## Phase 3 — Tracking & documents
- [ ] `tracking-svc`: position ingest, WS stream via gateway, ETA, geofencing.
- [ ] `doc-svc`: GCS upload/download, customs docs, invoices, POD/delivery confirmation.
- [ ] SPA: live Tracking + Documents hub wired up.

## Phase 4 — AI (EPL Genius, productionized)
- [ ] `genius-svc`: chat (real web search/RAG backend behind the existing `askGenius()` seam), freight rate estimation, route optimization, documentation & customs assistance.
- [ ] Wire the SPA's existing Genius widget to `genius-svc`.

## Phase 5 — Other portals & ops
- [ ] `apps/web-carrier`, `web-broker`, `web-admin`, `mobile-driver`.
- [ ] `notify-svc`, `billing-svc` fully online.
- [ ] `infra/terraform`: full GCP provisioning, CI/CD, staging+prod.

---

## What I propose to do *immediately* after you approve these docs
**Phase 0 scaffolding** — it's mechanical, low-risk, and reversible, and it makes the architecture tangible without committing to business logic yet. Specifically:
1. Root workspace files + `tsconfig.base.json` + `.nvmrc`.
2. Move the SPA into `apps/web-shipper` (preserving git history).
3. Stub `packages/*` public APIs and `services/*` health-only skeletons.
4. `docker-compose` for local deps.

I will **not** start Phase 1 service logic until Phase 0 is reviewed and you say go.

## Resolved decisions (approved)
1. **ORM:** **Drizzle** (SQL-first, RLS-friendly). → see `03-data-model.md`.
2. **SPA move:** **Now, in Phase 0** — git-mv into `apps/web-shipper`, preserve history.
3. **Local event broker:** **Pub/Sub emulator** (prod = Pub/Sub). `packages/events` keeps the Kafka-swap seam regardless.
4. **Auth v1:** **Password + email OTP**; OAuth/SSO defined as an interface but providers stubbed for later.
