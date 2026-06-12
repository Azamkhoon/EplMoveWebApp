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

-- NOTE on NULLIF: once any tx does set_config('app.tenant_id', …, true) on a
-- connection where the GUC was never defined, the connection's SESSION value
-- becomes '' (not NULL) after COMMIT. A bare ::uuid cast then throws
-- "invalid input syntax for type uuid" for every policy evaluation on that
-- pooled connection that doesn't re-set the GUC. NULLIF makes '' behave as NULL.
DO $$
BEGIN
  -- Recreate (not just create-if-missing) so existing DBs pick up the NULLIF fix.
  DROP POLICY IF EXISTS tenant_isolation ON quote.quotes;
  CREATE POLICY tenant_isolation ON quote.quotes
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  DROP POLICY IF EXISTS tenant_isolation ON quote.bids;
  CREATE POLICY tenant_isolation ON quote.bids
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

  -- Marketplace (carrier-side). Permissive policies are OR'd with tenant_isolation,
  -- so they only widen access when app.marketplace='on' (set by quote-svc for
  -- carrier requests; app.tenant_id is pinned to the carrier's tenant there).
  -- Carriers may READ open quotes across all shipper tenants, plus any quote
  -- they have bid on (so "My Bids" can still join awarded/cancelled quotes)…
  DROP POLICY IF EXISTS marketplace_read_open ON quote.quotes;
  CREATE POLICY marketplace_read_open ON quote.quotes
    FOR SELECT
    USING (
      current_setting('app.marketplace', true) = 'on'
      AND (
        status = 'open'
        OR EXISTS (
          SELECT 1 FROM quote.bids b
           WHERE b.quote_id = quotes.id
             AND b.carrier_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
      )
    );
  -- …read bids on those quotes (to see their own + the field)…
  DROP POLICY IF EXISTS marketplace_read_bids ON quote.bids;
  CREATE POLICY marketplace_read_bids ON quote.bids
    FOR SELECT
    USING (current_setting('app.marketplace', true) = 'on');
  -- …INSERT a bid attributed to themselves (carrier_id pinned in app code)…
  DROP POLICY IF EXISTS marketplace_insert_bid ON quote.bids;
  CREATE POLICY marketplace_insert_bid ON quote.bids
    FOR INSERT
    WITH CHECK (current_setting('app.marketplace', true) = 'on');
  -- …and replace (delete) ONLY their own still-submitted bid.
  DROP POLICY IF EXISTS marketplace_replace_own_bid ON quote.bids;
  CREATE POLICY marketplace_replace_own_bid ON quote.bids
    FOR DELETE
    USING (
      current_setting('app.marketplace', true) = 'on'
      AND carrier_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      AND status = 'submitted'
    );
END$$;
