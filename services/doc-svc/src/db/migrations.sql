-- doc-svc schema: documents (BoL, invoices, customs, POD, …) with RLS. Idempotent.
CREATE SCHEMA IF NOT EXISTS doc;

CREATE TABLE IF NOT EXISTS doc.documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  shipment_id   uuid,
  load_id       uuid,
  type          text NOT NULL,
  name          text NOT NULL,
  size_bytes    bigint NOT NULL DEFAULT 0,
  content_type  text NOT NULL DEFAULT 'application/pdf',
  status        text NOT NULL DEFAULT 'pending',
  storage_key   text NOT NULL,
  amount        numeric,
  currency      text,
  uploaded_by   uuid NOT NULL,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_tenant_idx ON doc.documents (tenant_id);
CREATE INDEX IF NOT EXISTS documents_shipment_idx ON doc.documents (shipment_id);
CREATE INDEX IF NOT EXISTS documents_type_idx ON doc.documents (tenant_id, type);

CREATE TABLE IF NOT EXISTS doc.outbox (
  id uuid PRIMARY KEY, topic text NOT NULL, ordering_key text,
  event jsonb NOT NULL, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doc_outbox_unpub_idx ON doc.outbox (created_at) WHERE published_at IS NULL;

ALTER TABLE doc.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc.documents FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='doc' AND tablename='documents' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON doc.documents
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END$$;
