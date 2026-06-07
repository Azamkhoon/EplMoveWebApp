# EPL Move

Multi-sided logistics platform (Shipper, Carrier, Broker, Admin, Driver) built as a
**pnpm + Turborepo monorepo** of TypeScript microservices, deployed to **GCP Cloud Run + Pub/Sub**.

> **Architecture is documented in [`docs/architecture/`](docs/architecture/)** — start with
> [`01-overview.md`](docs/architecture/01-overview.md). Decisions are locked and approved; the code
> is being built phase-by-phase per [`07-roadmap.md`](docs/architecture/07-roadmap.md).

## Layout

```
apps/        Frontend clients (web-shipper = the existing SPA; others later)
services/    NestJS microservices (api-gateway, auth-svc, tenant-svc, load-svc, …)
packages/    Shared TS: contracts (source of truth), auth, db, events, config, observability
infra/       docker-compose (local), terraform (GCP), ci
docs/        Architecture & design docs
```

## Prerequisites
- Node 24 (`nvm use` — see `.nvmrc`)
- pnpm 9 (`corepack enable`)
- Docker (for local Postgres / Redis / Pub/Sub emulator)

## Quick start
```bash
corepack enable
pnpm install
cp .env.example .env

# start local deps (Postgres, Redis, Pub/Sub emulator)
pnpm infra:up

# run everything in watch mode
pnpm dev
# or just the shipper SPA:
pnpm dev:shipper
```

## Status
- ✅ **Phase 0** — monorepo foundation: workspace tooling, SPA absorbed as `apps/web-shipper`,
  shared packages stubbed, all 12 services scaffolded (boot + `/health`), local docker-compose.
- ⏳ **Phase 1** — identity + first vertical slice (`auth-svc`, `tenant-svc`, `load-svc`,
  `api-gateway`) and wiring the SPA's Post-Load flow to the real API. *Not started — awaiting go.*

The `web-shipper` SPA still runs entirely on **mock data** until `VITE_API_URL` is set; the backend
build does not affect it.
