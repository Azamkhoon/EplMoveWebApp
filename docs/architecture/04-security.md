# Security: Auth, RBAC, Multi-tenancy

## Authentication

- **Token model:** short-lived **access JWT** (10 min) + rotating **refresh token** (httpOnly, secure cookie; 30 days, stored hashed in `sessions`).
- **Signing:** asymmetric **RS256**. `auth-svc` holds the private key (GCP Secret Manager); every other service verifies with the public key (JWKS endpoint, cached). No shared symmetric secret across services.
- **Access JWT claims:**
  ```jsonc
  {
    "sub": "<user_id>",
    "tid": "<active_tenant_id>",
    "role": "shipper_admin",
    "perms": ["load:create","load:read", ...],   // resolved permission set
    "sid": "<session_id>",
    "iat": ..., "exp": ...
  }
  ```
- **Refresh flow:** refresh token rotates on every use; reuse of a rotated token revokes the whole session family (token-theft detection).
- **Login surfaces:** password (argon2id hashing), email OTP, and pluggable OAuth/SSO (SAML/OIDC) for enterprise tenants — interface defined now, providers added later.

## Authorization (RBAC)

- **Permissions** are fine-grained verbs on resources: `load:create`, `load:cancel`, `quote:accept`, `doc:upload`, `tenant:manage`, `billing:read`, etc.
- **Roles** bundle permissions. Seeded system roles per portal:
  - Shipper: `shipper_admin`, `shipper_member`, `shipper_viewer`
  - Carrier: `carrier_admin`, `dispatcher`, `driver`
  - Broker: `broker_admin`, `broker_agent`
  - Platform: `epl_admin`, `epl_support`
- **Enforcement:** a Nest `@RequirePermissions('load:cancel')` guard (in `packages/auth`) checks the JWT `perms`. Resource-level checks (does this load belong to my tenant?) happen in the service via the tenant-scoped repository.
- **Custom roles:** tenant admins can define custom roles (tenant-scoped `roles` rows) — supported by the model from day one.

## Multi-tenancy enforcement (defense in depth)

| Layer | Mechanism | Failure mode it catches |
|---|---|---|
| Edge | Gateway compares `tid` claim to the tenant in the route/resource | Forged/stale tenant in request |
| App | Base repository auto-injects `WHERE tenant_id = ctx.tid` | Developer forgets the filter |
| DB | Postgres **RLS** policy on `tenant_id = current_setting('app.tenant_id')` | Buggy raw query / ORM escape hatch |

The tenant context is established once per request (Nest middleware reads JWT → `AsyncLocalStorage` context) and flows to repositories and the DB session variable. Background/event consumers carry `tenant_id` in the event envelope and set the same context before processing.

## Secrets & config
- **GCP Secret Manager** for all secrets (JWT keys, DB creds, API keys). Injected into Cloud Run as secret-backed env vars. Nothing in source or images.
- `packages/config` validates required env at boot (fail-fast) using a Zod schema per service.

## Transport & data security
- TLS everywhere (Cloud Run is HTTPS by default; internal calls over Google's private network / mTLS for gRPC).
- PII columns (email, phone) encryptable at rest beyond Cloud SQL's default; field-level encryption helper in `packages/db` for the most sensitive fields.
- Audit log: every state-changing action emits an `audit.*` event consumed by a write-only audit store (immutable, tenant-scoped).

## Abuse & resilience
- Gateway: per-IP and per-tenant **rate limiting** (Redis token bucket via Memorystore).
- Idempotency keys on all mutating endpoints (`Idempotency-Key` header → Redis dedupe) so retries/double-clicks don't double-post loads or double-charge.
- Input validation: every DTO is a Zod schema from `packages/contracts`; invalid input → `400` with a structured error contract.

## Standard error contract
```jsonc
{ "error": { "code": "INVALID_TRANSITION", "message": "...", "details": {...}, "traceId": "..." } }
```
