-- billing-svc schema: invoices, RLS by tenant, idempotent event consumption,
-- transactional outbox for invoice.issued.
CREATE SCHEMA IF NOT EXISTS billing;

CREATE TABLE IF NOT EXISTS billing.invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  number         text NOT NULL,
  status         text NOT NULL DEFAULT 'issued',
  load_id        uuid,
  quote_id       uuid,
  shipment_id    uuid,
  reference      text NOT NULL,
  carrier_name   text NOT NULL,
  amount         numeric NOT NULL,
  currency       text NOT NULL DEFAULT 'USD',
  issued_at      timestamptz,
  due_at         timestamptz,
  paid_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_tenant_idx ON billing.invoices (tenant_id);
-- One invoice per quote (idempotent against duplicate bid.accepted deliveries).
CREATE UNIQUE INDEX IF NOT EXISTS invoices_quote_uidx ON billing.invoices (quote_id);
-- Per-tenant monotonic invoice numbering.
CREATE TABLE IF NOT EXISTS billing.counters (
  tenant_id  uuid NOT NULL,
  year       int  NOT NULL,
  seq        int  NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, year)
);

CREATE TABLE IF NOT EXISTS billing.processed_events (
  event_id     uuid PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing.outbox (
  id            uuid PRIMARY KEY,
  topic         text NOT NULL,
  ordering_key  text,
  event         jsonb NOT NULL,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON billing.outbox (created_at) WHERE published_at IS NULL;

ALTER TABLE billing.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE billing.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.counters FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='billing' AND tablename='invoices' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON billing.invoices
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='billing' AND tablename='counters' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON billing.counters
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END$$;
