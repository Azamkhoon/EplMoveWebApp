# Data Model

> Database-per-service (logical). One Cloud SQL **Postgres** instance to start, one **schema/database per service**, splittable to separate instances later. ORM: **Drizzle** (typed, lightweight, SQL-first migrations) — final ORM choice is part of approval (see note at end).

## Multi-tenancy strategy

**Shared-schema, row-level tenant isolation** with a mandatory `tenant_id` on every domain row, enforced three ways:

1. **Application layer** — base repository injects `tenant_id` from request context into every query (`WHERE tenant_id = $ctx`). No query can omit it.
2. **Database layer** — Postgres **Row-Level Security (RLS)** policies as a backstop, keyed on a session variable (`SET app.tenant_id`). Defense in depth: even a buggy query can't cross tenants.
3. **Token layer** — `tenant_id` is a JWT claim; the gateway rejects any mismatch between token tenant and requested resource tenant.

> Rationale: shared-schema RLS gives strong isolation at a fraction of the ops cost of schema-per-tenant or db-per-tenant, and Cloud SQL supports it natively. We can graduate the largest tenants to dedicated instances later without app changes.

## Core entities (Phase-1 services)

### auth-svc
```
users            (id, email[unique-per-tenant], password_hash, status, created_at)
credentials      (user_id, type[password|otp|oauth], secret, ...)
sessions         (id, user_id, refresh_token_hash, ip, ua, expires_at, revoked_at)
```

### tenant-svc
```
tenants          (id, name, slug[unique], plan, status, created_at)
memberships      (id, tenant_id, user_id, role_id, status)         -- a user ↔ tenant link
roles            (id, tenant_id|null, key, name)                    -- null tenant_id = system role
permissions      (id, key)                                          -- e.g. load:create
role_permissions (role_id, permission_id)
```
> A user can belong to **multiple** tenants (e.g. a person who is a shipper at Org A and a broker at Org B). The active tenant is selected at login / via a switcher; the JWT carries the active `tenant_id` + `role` + resolved permission set.

### load-svc
```
loads (
  id              uuid pk,
  tenant_id       uuid  not null,          -- RLS key
  reference       text  not null,          -- EPL-2026-xxxx (per-tenant sequence)
  status          load_status not null,    -- enum below
  mode            transport_mode not null, -- Road|Air|Rail|Ocean|Multimodal
  equipment       text,                    -- equipment type code
  commodity       text  not null,
  pickup          jsonb not null,          -- {city,country,code,lat,lng, address, window}
  delivery        jsonb not null,
  weight_kg       numeric not null,
  volume_m3       numeric not null,
  pieces          int,
  value_usd       numeric,
  ready_date      date,
  incoterm        text,
  notes           text,
  created_by      uuid  not null,          -- user id
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null,
  version         int   not null default 1 -- optimistic locking
)
load_items (id, load_id, tenant_id, description, qty, length_cm, width_cm, height_cm, weight_kg)
```

### Load status state machine (owned by load-svc)
```
draft ──post──▶ posted ──bid_accepted──▶ booked ──▶ in_transit ──▶ delivered
  │               │                         │            │
  └──edit─────────┤                         │            └──▶ delayed (transient, re-enters in_transit)
                  └──cancel──▶ cancelled ◀──┘
duplicate: any → new draft (copy of fields, new id/reference, version=1)
```
Transitions are validated server-side; illegal transitions return `409 InvalidTransition`. Every transition emits a domain event (see `05-events.md`).

## Shared value objects (in `packages/contracts`)
- `Location { city, country, code?, lat, lng, address?, window? }`
- `Money { amount, currency }`
- `Dimensions { lengthCm, widthCm, heightCm, weightKg }`
- Enums: `TransportMode = Road | Air | Rail | Ocean | Multimodal`, `LoadStatus`, `EquipmentKind = container | trailer | wagon`.

> Note: the SPA today uses `mode = FTL|LTL|Ocean|Air|Rail`. The platform standardizes on **Road|Air|Rail|Ocean|Multimodal** (per your spec); FTL/LTL becomes a sub-attribute (`serviceLevel`) of Road. The SPA's adapter layer maps old→new during migration.

## ID & reference strategy
- Primary keys: UUID v7 (time-sortable) generated app-side.
- Human references (`EPL-2026-0481`): per-tenant monotonic sequence in load-svc.

## ORM decision (needs your nod)
- **Drizzle** (recommended): SQL-first, typed, tiny runtime, plays well with RLS and raw migrations.
- Alternative: **Prisma** (richer DX, but heavier, and RLS/session-var integration is more awkward).
I'll default to **Drizzle** unless you prefer Prisma.
