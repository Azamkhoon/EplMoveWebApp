# Real-data activation status — 2026-09-12

The five Vercel projects host Vite frontends. The four portal projects had no production environment variables at inspection. The repository's local API configuration uses localhost. No production database or backend target was identified, so no stored database rows or uploaded files have been deleted.

## Cleanup implemented

- Removed sample operational records from portal datasets: shipments, quotes, tenants, users, invoices, audit events, declarations, clients, documents, fleet, drivers, dispatch, alerts, and historical analytics.
- Removed automatic/demo authentication, including the hardcoded administrator password shortcut and legacy session-storage bypasses.
- Empty shipment and tracking API responses remain empty.
- Missing API configuration displays a service-activation notice.
- Screens that lack persistence display an unavailable state rather than accepting unsaved real records. This currently includes admin screens; carrier fleet, drivers, dispatch, analytics; broker clients, declarations, financials, analytics.
- Document upload uses the selected file instead of generating a fake invoice PDF.
- Carrier migrations no longer seed demo carriers by default. Optional local seeding requires SEED_DEMO_DATA=true and is disabled under NODE_ENV=production.
- Production portal links use the existing Vercel domains. VITE_* variables participate in Turborepo build environment and cache keys.

Geographic lookups, equipment definitions, translations, permission/role definitions, and other reference data are retained.

## Required before real-user testing

1. Identify the production cloud project, API gateway URL, database, document storage, and administrative identity. Infrastructure definitions target GCP Cloud Run, Cloud SQL, and Pub/Sub (see infra/terraform).
2. Inventory the exact persistent data stores. Take a recoverable snapshot, then clear the authorized operational/account records and uploaded documents, preserving schema and system role/permission definitions. Verify row counts and revoke old sessions. This step has NOT been run.
3. Deploy/configure backend services and migrations, durable document storage, Pub/Sub subscriptions, JWT secrets, and allowed portal CORS origins.
4. Set VITE_API_URL to the reachable HTTPS gateway in each applicable Vercel environment and rebuild all five frontends. Never use localhost for a public deployment.
5. Verify registration and login for each supported role, tenant isolation, refresh/logout, load creation, bidding, booking, shipment visibility, selected-file upload/download, and data persistence after reload. Provision platform administrators through a trusted backend path.
6. Implement and verify persistence for the unavailable screens before enabling them. Existing view components are retained for that work.

Production email OTP delivery is not implemented in auth.service.ts; do not advertise OTP login as ready. The in-process workflow check validates domain logic using an isolated in-memory database; it does not prove hosted service connectivity or production readiness.
