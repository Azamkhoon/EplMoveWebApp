# GCP Topology & Delivery

> Target: **Cloud Run + Pub/Sub**, serverless-first, cloud-agnostic core. Terraform-managed.

## Runtime topology

```
                         ┌──────────────────────────────┐
   Internet  ──HTTPS──▶  │  External HTTPS Load Balancer │
                         │  + Cloud Armor (WAF, rate)    │
                         └───────────────┬──────────────┘
                                         │
                                ┌────────▼────────┐
                                │  api-gateway     │  (Cloud Run, public)
                                │  (NestJS BFF)    │
                                └───┬────────┬─────┘
                  internal (gRPC/HTTP, IAM-auth'd, no public ingress)
        ┌──────────┬──────────┬────┴─────┬──────────┬─────────────┐
        ▼          ▼          ▼          ▼          ▼             ▼
   auth-svc   tenant-svc   load-svc   quote-svc  shipment-svc   ...   (Cloud Run, internal-only)
        │          │          │          │          │
        └──────────┴────┬─────┴──────────┴──────────┘
                        ▼
              ┌───────────────────┐     ┌──────────────────┐
              │ Cloud SQL (Postgres)│    │ Memorystore (Redis)│
              │  schema per service │    │ rate-limit, cache, │
              │  + RLS              │    │ idempotency, dedupe│
              └───────────────────┘     └──────────────────┘

   Async:  services ⇄ Pub/Sub topics (load.events, quote.events, ...)
   Files:  doc-svc ⇄ Cloud Storage (GCS) buckets (signed URLs)
   Secrets: Secret Manager → injected into Cloud Run
   Images:  Artifact Registry  ◀── Cloud Build (CI)
```

## GCP services used
| Concern | GCP product |
|---|---|
| Compute | **Cloud Run** (one service per microservice; min instances on gateway/auth) |
| Ingress | External HTTPS LB + **Cloud Armor** (WAF, rate limiting, geo rules) |
| Events | **Pub/Sub** (topics + push/pull subs + DLQ) |
| Relational DB | **Cloud SQL for PostgreSQL** (private IP; schema-per-service; RLS) |
| Cache / locks | **Memorystore (Redis)** |
| Object storage | **Cloud Storage** (documents, POD images; signed URLs) |
| Secrets | **Secret Manager** |
| Images | **Artifact Registry** |
| CI/CD | **Cloud Build** (or GitHub Actions → deploy to Cloud Run) |
| Observability | **Cloud Logging/Monitoring/Trace** + OpenTelemetry from `packages/observability` |
| Internal auth | Service-to-service via **Cloud Run IAM** (ID tokens), internal-only ingress |

## Networking & security posture
- Only `api-gateway` is publicly reachable; all domain services are **internal ingress only** and require an authenticated caller (Cloud Run IAM).
- Cloud SQL via **private IP** + Serverless VPC Access connector; no public DB exposure.
- Per-service least-privilege **service accounts** (e.g. `load-svc` can publish to `load.events`, read its DB schema, nothing else).

## Environments
- `dev`, `staging`, `prod` — separate GCP projects, identical Terraform with per-env vars. Promotion via CI.

## CI/CD pipeline (per service, Turbo-aware)
```
push → Cloud Build:
  1. pnpm install (cached)
  2. turbo run lint typecheck test --filter=<changed>   # only affected packages
  3. docker build (multi-stage) → Artifact Registry
  4. terraform plan/apply (infra changes) [gated]
  5. gcloud run deploy <svc> --image ... (canary → 100%)
```
Turborepo's affected-graph means a change to one service rebuilds/redeploys only that service (and its dependents).

## Local development parity
`infra/docker/docker-compose.yml` runs the same dependencies locally:
- Postgres, **Redpanda** (Kafka-API, stands in for Pub/Sub via the `packages/events` adapter's local mode — or the Pub/Sub emulator), Redis, GCS emulator.
- `pnpm dev` runs all services + the shipper SPA against these. One command, full stack on a laptop.

## Cost shape (why Cloud Run was the right call)
- Scales to zero on idle services (most domain services are quiet between events).
- Pay-per-request; no always-on cluster. Gateway/auth keep `min-instances=1` to avoid cold starts on the hot path.
- Graduating to GKE later is possible without code changes (containers are already 12-factor).
