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
pnpm --filter @epl/tenant-svc build && pnpm --filter @epl/tenant-svc migrate
pnpm --filter @epl/auth-svc   build && pnpm --filter @epl/auth-svc   migrate
pnpm --filter @epl/load-svc   build && pnpm --filter @epl/load-svc   migrate
```

## 4. Start the services (separate terminals, or `pnpm dev:backend`)
```bash
pnpm --filter @epl/tenant-svc dev   # :8082
pnpm --filter @epl/auth-svc   dev   # :8081
pnpm --filter @epl/load-svc   dev   # :8083
pnpm --filter @epl/api-gateway dev  # :8080  (public ingress)
```

## 5. Verify end-to-end
```bash
bash scripts/verify-phase1.sh
```
Expected: register → access token → post load (gets `EPL-YYYY-NNNN`) → list shows it →
duplicate → cancel → tampered token rejected (401) → password login works.

## 6. Run the SPA against the real backend
```bash
echo 'VITE_API_URL=http://localhost:8080' >> apps/web-shipper/.env.local
pnpm dev:shipper     # http://localhost:5173 — now shows the login gate
```
Leave `VITE_API_URL` unset to keep the SPA in mock mode (no backend needed).
