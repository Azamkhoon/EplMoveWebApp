# Monorepo Layout

> Tooling: **pnpm workspaces** + **Turborepo** (task graph & caching). Node 24 (already installed via nvm). TypeScript project references across packages.

## Top-level tree

```
epl-move/                            # this repo (root)
├── apps/
│   ├── web-shipper/                 # the EXISTING Vite/React SPA, moved here
│   ├── web-carrier/                 # (later) carrier portal
│   ├── web-broker/                  # (later)
│   ├── web-admin/                   # (later)
│   └── mobile-driver/               # (later) Expo/React Native
│
├── services/
│   ├── api-gateway/                 # NestJS BFF (ingress)
│   ├── auth-svc/                    # NestJS
│   ├── tenant-svc/                  # NestJS
│   ├── load-svc/                    # NestJS
│   ├── quote-svc/                   # NestJS (skeleton)
│   ├── shipment-svc/                # NestJS (skeleton)
│   ├── tracking-svc/                # NestJS (skeleton)
│   ├── doc-svc/                     # NestJS (skeleton)
│   ├── carrier-svc/                 # NestJS (skeleton)
│   ├── notify-svc/                  # NestJS (skeleton)
│   ├── genius-svc/                  # NestJS (skeleton)
│   └── billing-svc/                 # NestJS (skeleton)
│
├── packages/
│   ├── contracts/                   # Shared DTOs, API types, Zod schemas, event payloads
│   ├── events/                      # Pub/Sub abstraction (publish/subscribe, Kafka-swappable)
│   ├── auth/                        # JWT verify, RBAC guards/decorators, tenant context
│   ├── db/                          # Drizzle/Prisma client factory, base repository, migrations runner
│   ├── observability/              # Logger (pino), tracing (OpenTelemetry), metrics
│   ├── config/                      # Typed env loading & validation (per-service config schema)
│   ├── sdk/                         # Generated TS client for the API gateway (used by web apps)
│   └── ui/                          # (later) shared React component library extracted from web-shipper
│
├── infra/
│   ├── terraform/                   # GCP: Cloud Run, Pub/Sub, Cloud SQL, IAM, Artifact Registry
│   ├── docker/                      # Dockerfiles (multi-stage) + docker-compose for local dev
│   └── ci/                          # Cloud Build / GitHub Actions pipelines
│
├── docs/
│   └── architecture/                # these documents
│
├── package.json                     # root: workspace scripts only
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json               # shared compiler options; each pkg extends this
└── .nvmrc                           # 24
```

## Workspace globs (`pnpm-workspace.yaml`)

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
```

## Service-internal structure (NestJS convention, applied to every service)

```
services/load-svc/
├── src/
│   ├── main.ts                      # bootstrap (HTTP + gRPC + Pub/Sub consumers)
│   ├── app.module.ts
│   ├── config/                      # env schema for THIS service
│   ├── modules/
│   │   └── load/
│   │       ├── load.module.ts
│   │       ├── load.controller.ts   # HTTP/gRPC entrypoints
│   │       ├── load.service.ts      # business logic, state machine
│   │       ├── load.repository.ts   # data access (extends packages/db base repo)
│   │       ├── dto/                  # request/response DTOs (from packages/contracts)
│   │       ├── events/              # publishers + consumers for load.* events
│   │       └── load.state.ts        # status state-machine (posted→booked→...)
│   ├── health/                      # liveness/readiness for Cloud Run
│   └── migrations/                  # SQL migrations for load-svc's schema
├── test/
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Why this shape

- **`packages/contracts` is the source of truth.** DTOs, event payloads, and API types live here as Zod schemas → TS types are inferred. Services validate against them; `packages/sdk` and the web apps import the same types. No drift between front and back.
- **Cross-cutting concerns are packages, not copy-paste.** Auth, db, events, observability, config are written once and imported. This is what keeps RBAC/multi-tenancy *consistent* across 12 services.
- **The SPA moving in is non-destructive**: it keeps its own `package.json`, Vite config, and scripts; Turbo just orchestrates it alongside the services.

## Root scripts (Turbo-driven)

```jsonc
// package.json (root)
{
  "scripts": {
    "dev": "turbo run dev",              // all apps+services in watch
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "dev:shipper": "turbo run dev --filter=web-shipper",
    "dev:backend": "turbo run dev --filter='./services/*'",
    "infra:up": "docker compose -f infra/docker/docker-compose.yml up -d"
  }
}
```
