# EPL Move — GCP Infrastructure (Terraform)

Provisions the production topology from `docs/architecture/06-gcp-topology.md`:
Cloud Run (one service each, gateway public + internal-only services), Cloud SQL
(Postgres, schema-per-service + RLS), Pub/Sub topics + DLQ, Memorystore (Redis),
a VPC + Serverless connector + Private Service Access, Artifact Registry, Secret
Manager, and least-privilege per-service service accounts.

## The RLS rule this encodes

Postgres **superusers bypass RLS** even with `FORCE ROW LEVEL SECURITY`. So:

- Services connect as the **non-superuser `epl_app`** role (`google_sql_user.app`).
  Its password is injected from Secret Manager into every DB-owning Cloud Run
  service as `DB_PASSWORD`.
- **Migrations** run as the owner role **`epl`** (it owns the schemas/tables).
- We never let services use Cloud SQL's built-in superuser-like `postgres` user.

This mirrors the local Docker setup (`infra/docker/initdb/02-app-role.sql`).

## Apply

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # edit project_id, region, image_tag
terraform init
terraform apply
```

## Post-apply bootstrap (once, and after migrations add owner-created tables)

1. Push images to Artifact Registry (the CI workflow does this), referenced by
   `image_tag`.
2. Add the JWT key versions (never committed):
   ```bash
   gcloud secrets versions add epl-prod-jwt-private --data-file=jwt_private.pem
   gcloud secrets versions add epl-prod-jwt-public  --data-file=jwt_public.pem
   ```
3. Run each service's migrations as the **owner** (`epl`) via the Cloud SQL Auth
   Proxy (e.g. a one-shot Cloud Run Job or from CI), then apply the app-role
   grants — the same grant SQL as local, since `ALTER DEFAULT PRIVILEGES` only
   covers *future* owner-created objects:
   ```bash
   psql "$OWNER_DSN" -f bootstrap-grants.sql
   ```

`bootstrap-grants.sql` is the Cloud SQL counterpart of the local
`infra/docker/initdb/02-app-role.sql` grant block.
