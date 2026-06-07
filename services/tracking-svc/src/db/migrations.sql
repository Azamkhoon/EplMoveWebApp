-- tracking-svc schema: latest tracking state + position history + geofences.
-- RLS by shipper tenant. Idempotent.
CREATE SCHEMA IF NOT EXISTS tracking;

-- Latest known state per shipment (1 row/shipment, upserted on each report).
CREATE TABLE IF NOT EXISTS tracking.states (
  shipment_id   uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  origin        jsonb NOT NULL,
  destination   jsonb NOT NULL,
  total_km      numeric NOT NULL,
  lat           numeric,
  lng           numeric,
  speed_kph     numeric,
  heading_deg   numeric,
  progress      int NOT NULL DEFAULT 0,
  remaining_km  numeric NOT NULL DEFAULT 0,
  eta_date      timestamptz,
  origin_entered  boolean NOT NULL DEFAULT false,
  dest_entered    boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS states_tenant_idx ON tracking.states (tenant_id);

-- Append-only position history (time-series).
CREATE TABLE IF NOT EXISTS tracking.positions (
  id           bigserial PRIMARY KEY,
  shipment_id  uuid NOT NULL,
  tenant_id    uuid NOT NULL,
  lat          numeric NOT NULL,
  lng          numeric NOT NULL,
  speed_kph    numeric,
  heading_deg  numeric,
  reported_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS positions_shipment_idx ON tracking.positions (shipment_id, reported_at DESC);

CREATE TABLE IF NOT EXISTS tracking.processed_events (
  event_id uuid PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracking.outbox (
  id uuid PRIMARY KEY, topic text NOT NULL, ordering_key text,
  event jsonb NOT NULL, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracking_outbox_unpub_idx ON tracking.outbox (created_at) WHERE published_at IS NULL;

ALTER TABLE tracking.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking.states FORCE ROW LEVEL SECURITY;
ALTER TABLE tracking.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking.positions FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='tracking' AND tablename='states' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON tracking.states
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='tracking' AND tablename='positions' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON tracking.positions
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END$$;
