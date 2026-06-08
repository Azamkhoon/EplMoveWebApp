-- shipment-svc schema: shipments + milestones, RLS by shipper tenant.
-- processed_events gives idempotent event consumption (dedupe on event id).
CREATE SCHEMA IF NOT EXISTS shipment;

CREATE TABLE IF NOT EXISTS shipment.shipments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  reference     text NOT NULL,
  load_id       uuid NOT NULL,
  quote_id      uuid NOT NULL,
  carrier_id    uuid NOT NULL,
  carrier_name  text NOT NULL,
  status        text NOT NULL DEFAULT 'booked',
  mode          text NOT NULL,
  origin        jsonb NOT NULL,
  destination   jsonb NOT NULL,
  price_amount  numeric NOT NULL,
  price_currency text NOT NULL DEFAULT 'USD',
  transit_days  int NOT NULL,
  booked_at     timestamptz NOT NULL DEFAULT now(),
  eta_date      timestamptz,
  progress      int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS shipments_tenant_idx ON shipment.shipments (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS shipments_quote_uidx ON shipment.shipments (quote_id);

CREATE TABLE IF NOT EXISTS shipment.milestones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id  uuid NOT NULL REFERENCES shipment.shipments(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL,
  status       text NOT NULL,
  description  text NOT NULL,
  location     text NOT NULL,
  occurred_at  timestamptz,
  completed    boolean NOT NULL DEFAULT false,
  seq          int NOT NULL
);
CREATE INDEX IF NOT EXISTS milestones_shipment_idx ON shipment.milestones (shipment_id);

CREATE TABLE IF NOT EXISTS shipment.processed_events (
  event_id     uuid PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Transactional outbox: shipment.created is enqueued in the same tx that
-- inserts the shipment, then relayed to Pub/Sub. See docs/architecture/05-events.md.
CREATE TABLE IF NOT EXISTS shipment.outbox (
  id            uuid PRIMARY KEY,
  topic         text NOT NULL,
  ordering_key  text,
  event         jsonb NOT NULL,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON shipment.outbox (created_at) WHERE published_at IS NULL;

ALTER TABLE shipment.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment.shipments FORCE ROW LEVEL SECURITY;
ALTER TABLE shipment.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment.milestones FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shipment' AND tablename='shipments' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON shipment.shipments
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shipment' AND tablename='milestones' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON shipment.milestones
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END$$;
