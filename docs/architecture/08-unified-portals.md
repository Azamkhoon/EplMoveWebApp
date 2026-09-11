# Unified EPL Move portals

## Runtime map

| Port | Application |
| --- | --- |
| 5173 | Shipper / Customer portal (`apps/web-shipper`) |
| 5174 | Carrier portal (`apps/web-carrier`) |
| 5175 | Customs Broker portal (`apps/web-broker`) |
| 5176 | Platform Admin portal (`apps/web-admin`) |
| 8080 | Public API gateway |

The browser applications never call each other. They use `VITE_API_URL` to call
the gateway, which verifies the shared RS256 JWT and forwards the tenant/user/
role/permission context to the bounded NestJS services.
Each portal uses its own HTTP-only refresh-cookie name, so Shipper, Carrier, and
Broker sessions can stay open concurrently on localhost without overwriting one
another; all cookies still resolve through the same central auth/session store.

PostgreSQL is the durable source of truth. A load has one UUID and a global
human reference (`EPL-LOAD-000001`). The same `load_id` is linked to one quote,
the accepted bid, one normalized booking, and the operational shipment. Shipper,
Carrier, and Broker visibility is enforced with PostgreSQL RLS and service-level
role checks.

## Main API surface

- `POST/GET/PATCH /loads`, `POST /loads/:id/cancel`
- `GET/POST /quotes`, `GET /quotes/:id`
- `POST /quotes/:id/bids/:bidId/accept`
- `POST /quotes/:id/bids/:bidId/reject`
- `GET /marketplace/quotes`, `GET /marketplace/bids`
- `POST /marketplace/quotes/:id/bids`
- `PATCH/DELETE /marketplace/bids/:id`
- `GET /shipments`, `GET /shipments/:id`
- `POST /shipments/:id/broker-assignment`
- `PATCH /shipments/:id/status`
- `GET/POST /shipments/:id/messages`
- `GET/POST /documents`, `GET /documents/:id/download`
- `GET/POST /documents/requests`
- `PATCH /documents/requests/:id/review`
- `GET /notifications`, `POST /notifications/read`
- `GET /directory/tenants?kind=broker`
- WebSocket: `/ws/notifications`; existing shipment tracking WebSocket remains
  available to authorized shipment participants.

## Local environment

Required root variables are documented in `.env.example`. In particular:

- PostgreSQL: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- events: `PUBSUB_EMULATOR_HOST=localhost:8681`, `PUBSUB_PROJECT_ID`
- auth: `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, token TTLs
- API CORS: `CORS_ORIGIN` with explicit portal origins
- local registration: `COMPANY_VERIFICATION_MODE=optional`; production still
  requires configured `IHAMKOR_API_URL` and `IHAMKOR_API_TOKEN`
- every portal: `VITE_API_URL=http://localhost:8080` in its `.env.local`

Port 8681 is intentionally used for the Pub/Sub emulator; port 8085 belongs to
quote-svc.

## Start locally

```bash
pnpm install
pnpm infra:up
pnpm build
pnpm -r --if-present migrate
pnpm dev:backend
pnpm dev:portals
```

Docker is required for the normal local PostgreSQL, Redis, and Pub/Sub stack.
Without Docker, run `pnpm verify:inproc` to execute the real service migrations
and the complete integration flow against PGlite.

## Manual workflow verification

1. Register a Shipper company on 5173, a Carrier company on 5174, and a Broker
   company on 5175. Save each generated company slug if a user has memberships
   in more than one company.
2. On 5173 post Tashkent, Uzbekistan → Riga, Latvia, 20,000 kg textile,
   Standard Tent. It is persisted and automatically opened for bids.
3. On 5174 open Marketplace and bid USD 5,500, eight days, with equipment and
   truck details. Update or withdraw the offer from My Bids if needed.
4. On 5173 open Marketplace; offers refresh automatically. Accept the offer.
   The booking/shipment appears in both Shipper and Carrier portals.
5. On the Shipper shipment detail, assign the registered Broker company.
6. On 5175 open the assigned shipment, choose Request document, select
   Commercial Invoice, and enter the customs-clearance comment.
7. On 5173 open the shipment Documents tab and upload the requested file.
8. On 5175 download/review the file and approve it. The Shipper sees APPROVED.
9. Refresh all portals. Loads, bids, booking, shipment, assignment, request,
   file metadata, messages, activity, and notifications are read from Postgres.

## Automated verification

`pnpm verify:inproc` applies every relevant migration twice (idempotency), then
checks identity, global references, load RLS, carrier bids, accepted booking,
carrier access, broker assignment, document request/upload/approval, shared
tracking, notification isolation, and reload-equivalent persistence reads.
