-- load-svc schema with Row-Level Security for multi-tenant isolation.
-- Idempotent. See docs/architecture/03-data-model.md & 04-security.md.
CREATE SCHEMA IF NOT EXISTS load;

-- Platform-wide human reference sequence (EPL-LOAD-000001). UUID remains the
-- immutable primary key; this sequence is the user-facing canonical reference.
CREATE SEQUENCE IF NOT EXISTS load.reference_number_seq START WITH 1;

-- Per-tenant human reference sequence (EPL-YYYY-NNNN).
CREATE TABLE IF NOT EXISTS load.reference_seq (
  tenant_id  uuid PRIMARY KEY,
  last_value int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS load.loads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  reference    text NOT NULL,
  status       text NOT NULL,
  mode         text NOT NULL,
  service_level text,
  equipment_kind text,
  equipment_code text,
  commodity    text NOT NULL,
  pickup       jsonb NOT NULL,
  delivery     jsonb NOT NULL,
  weight_kg    numeric NOT NULL,
  volume_m3    numeric NOT NULL,
  pieces       int,
  value        jsonb,
  ready_date   timestamptz,
  incoterm     text,
  notes        text,
  items        jsonb,
  created_by   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  version      int NOT NULL DEFAULT 1
);
ALTER TABLE load.loads ADD COLUMN IF NOT EXISTS cargo_description text;
ALTER TABLE load.loads ADD COLUMN IF NOT EXISTS dimensions jsonb;
ALTER TABLE load.loads ADD COLUMN IF NOT EXISTS required_delivery_date timestamptz;
ALTER TABLE load.loads ADD COLUMN IF NOT EXISTS truck_type text;
ALTER TABLE load.loads ADD COLUMN IF NOT EXISTS trailer_type text;
ALTER TABLE load.loads ADD COLUMN IF NOT EXISTS temperature jsonb;
ALTER TABLE load.loads ADD COLUMN IF NOT EXISTS customs_info text;
ALTER TABLE load.loads ADD COLUMN IF NOT EXISTS dangerous_goods boolean NOT NULL DEFAULT false;
ALTER TABLE load.loads ADD COLUMN IF NOT EXISTS special_instructions text;
ALTER TABLE load.loads ADD COLUMN IF NOT EXISTS required_documents jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS loads_tenant_idx ON load.loads (tenant_id);
CREATE INDEX IF NOT EXISTS loads_tenant_status_idx ON load.loads (tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS loads_tenant_ref_uidx ON load.loads (tenant_id, reference);
CREATE INDEX IF NOT EXISTS loads_reference_idx ON load.loads (reference);
CREATE UNIQUE INDEX IF NOT EXISTS loads_global_reference_uidx
  ON load.loads (reference) WHERE reference ~ '^EPL-LOAD-[0-9]{6,}$';
DO $$
DECLARE max_number bigint;
BEGIN
  SELECT COALESCE(MAX(substring(reference FROM '[0-9]+$')::bigint), 0)
    INTO max_number
    FROM load.loads
   WHERE reference ~ '^EPL-LOAD-[0-9]{6,}$';
  IF max_number > 0 THEN
    PERFORM setval(
      'load.reference_number_seq',
      GREATEST(max_number, (SELECT last_value FROM load.reference_number_seq)),
      true
    );
  END IF;
END$$;

-- Transactional outbox (events published by the relay).
CREATE TABLE IF NOT EXISTS load.outbox (
  id            uuid PRIMARY KEY,
  topic         text NOT NULL,
  ordering_key  text,
  event         jsonb NOT NULL,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON load.outbox (created_at) WHERE published_at IS NULL;

-- ── Row-Level Security: the DB-layer backstop for tenant isolation ──
ALTER TABLE load.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE load.loads FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON load.loads;
  CREATE POLICY tenant_isolation ON load.loads
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
END$$;
