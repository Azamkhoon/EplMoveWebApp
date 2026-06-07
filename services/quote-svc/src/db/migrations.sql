-- quote-svc schema: quotes + bids, RLS by shipper tenant. Idempotent.
CREATE SCHEMA IF NOT EXISTS quote;

CREATE TABLE IF NOT EXISTS quote.quotes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  load_id     uuid NOT NULL,
  reference   text NOT NULL,
  status      text NOT NULL DEFAULT 'open',
  mode        text NOT NULL DEFAULT 'Any',
  created_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz
);
CREATE INDEX IF NOT EXISTS quotes_tenant_idx ON quote.quotes (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS quotes_tenant_load_uidx ON quote.quotes (tenant_id, load_id);

CREATE TABLE IF NOT EXISTS quote.bids (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  quote_id     uuid NOT NULL REFERENCES quote.quotes(id) ON DELETE CASCADE,
  carrier_id   uuid NOT NULL,
  mode         text NOT NULL,
  price_amount numeric NOT NULL,
  price_currency text NOT NULL DEFAULT 'USD',
  transit_days int NOT NULL,
  co2_kg       numeric,
  valid_until  timestamptz,
  status       text NOT NULL DEFAULT 'submitted',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bids_quote_idx ON quote.bids (quote_id);
CREATE INDEX IF NOT EXISTS bids_tenant_idx ON quote.bids (tenant_id);

CREATE TABLE IF NOT EXISTS quote.outbox (
  id            uuid PRIMARY KEY,
  topic         text NOT NULL,
  ordering_key  text,
  event         jsonb NOT NULL,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON quote.outbox (created_at) WHERE published_at IS NULL;

-- RLS on quotes + bids (tenant = shipper).
ALTER TABLE quote.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote.quotes FORCE ROW LEVEL SECURITY;
ALTER TABLE quote.bids   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote.bids   FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='quote' AND tablename='quotes' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON quote.quotes
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='quote' AND tablename='bids' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON quote.bids
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END$$;
