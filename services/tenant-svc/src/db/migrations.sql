-- tenant-svc schema: tenants, memberships, RBAC roles & permissions. Idempotent.
CREATE SCHEMA IF NOT EXISTS tenant;

CREATE TABLE IF NOT EXISTS tenant.tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL,
  kind        text NOT NULL DEFAULT 'shipper',  -- 'shipper' | 'carrier'
  plan        text NOT NULL DEFAULT 'free',
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- Backfill for databases created before `kind` existed.
ALTER TABLE tenant.tenants ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'shipper';
ALTER TABLE tenant.tenants ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE tenant.tenants ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE tenant.tenants ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE tenant.tenants ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE tenant.tenants ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE tenant.tenants ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE tenant.tenants ADD COLUMN IF NOT EXISTS company_verified_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_uidx ON tenant.tenants (slug);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_vat_number_uidx
  ON tenant.tenants (vat_number) WHERE vat_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS tenant.permissions (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key  text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tenant.roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES tenant.tenants(id) ON DELETE CASCADE, -- null = system role
  key         text NOT NULL,
  name        text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS roles_scope_key_uidx
  ON tenant.roles (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), key);

CREATE TABLE IF NOT EXISTS tenant.role_permissions (
  role_id        uuid NOT NULL REFERENCES tenant.roles(id) ON DELETE CASCADE,
  permission_id  uuid NOT NULL REFERENCES tenant.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS tenant.memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant.tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  role_id     uuid NOT NULL REFERENCES tenant.roles(id),
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS memberships_tenant_user_uidx
  ON tenant.memberships (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS memberships_user_idx ON tenant.memberships (user_id);
