# Phase 1 Dev Runbook

Run the identity + load vertical slice locally end-to-end.

## 0. Prereqs
- Node 24 (`nvm use`), pnpm 9 (`corepack enable`), Docker running.
- `pnpm install` at the repo root.

## 1. Environment
Create `.env` at the repo root from the keypair already generated in `scripts/keys/`:

```bash
cp .env.example .env
# inject the dev RS256 keys (single-line PEM with \n)
node -e 'const fs=require("fs");
 const pk=fs.readFileSync("scripts/keys/jwt_private.pem","utf8");
 const pub=fs.readFileSync("scripts/keys/jwt_public.pem","utf8");
 let e=fs.readFileSync(".env","utf8");
 e=e.replace(/^JWT_PRIVATE_KEY=.*$/m,"JWT_PRIVATE_KEY=\""+pk.trim().replace(/\n/g,"\\n")+"\"");
 e=e.replace(/^JWT_PUBLIC_KEY=.*$/m,"JWT_PUBLIC_KEY=\""+pub.trim().replace(/\n/g,"\\n")+"\"");
 fs.writeFileSync(".env",e);'
```

> Each service loads `.env` via `@epl/config` (dotenv is loaded by Nest in dev). The keys are
> dev-only — production reads them from GCP Secret Manager.

## 2. Start infra
```bash
pnpm infra:up        # Postgres, Redis, Pub/Sub emulator
```

## 3. Run migrations (each owning service)
```bash
for s in tenant-svc auth-svc load-svc carrier-svc quote-svc shipment-svc; do
  pnpm --filter @epl/$s build && pnpm --filter @epl/$s migrate
done
```
(carrier-svc seeds 8 demo carriers; tenant-svc seeds roles/permissions.)

## 4. Start the services (separate terminals, or `pnpm dev:backend`)
```bash
pnpm --filter @epl/tenant-svc   dev   # :8082
pnpm --filter @epl/auth-svc     dev   # :8081
pnpm --filter @epl/load-svc     dev   # :8083
pnpm --filter @epl/carrier-svc  dev   # :8084
pnpm --filter @epl/quote-svc    dev   # :8085
pnpm --filter @epl/shipment-svc dev   # :8086  (subscribes to bid.accepted)
pnpm --filter @epl/api-gateway  dev   # :8080  (public ingress)
```

## 5. Verify end-to-end
```bash
bash scripts/verify-phase1.sh   # identity + load CRUD/state machine
bash scripts/verify-phase2.sh   # quote → bids → accept → event → shipment
```
Phase 1: register → post load → list → duplicate → cancel → 401 on tampered token.
Phase 2: post load → request quotes (auto carrier bids) → compare → accept cheapest
→ shipment-svc consumes `bid.accepted` and creates the shipment (polled).

## 6. Run the SPA against the real backend
```bash
echo 'VITE_API_URL=http://localhost:8080' >> apps/web-shipper/.env.local
pnpm dev:shipper     # http://localhost:5173 — now shows the login gate
```
Leave `VITE_API_URL` unset to keep the SPA in mock mode (no backend needed).
