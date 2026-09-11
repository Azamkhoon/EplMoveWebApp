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
ALTER TABLE doc.documents ADD COLUMN IF NOT EXISTS document_request_id uuid;
ALTER TABLE doc.documents ADD COLUMN IF NOT EXISTS broker_tenant_id uuid;
ALTER TABLE doc.documents ADD COLUMN IF NOT EXISTS carrier_tenant_id uuid;
CREATE INDEX IF NOT EXISTS documents_tenant_idx ON doc.documents (tenant_id);
CREATE INDEX IF NOT EXISTS documents_shipment_idx ON doc.documents (shipment_id);
CREATE INDEX IF NOT EXISTS documents_type_idx ON doc.documents (tenant_id, type);
CREATE INDEX IF NOT EXISTS documents_request_idx ON doc.documents (document_request_id);

CREATE TABLE IF NOT EXISTS doc.document_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id          uuid NOT NULL,
  shipment_reference   text NOT NULL,
  tenant_id            uuid NOT NULL,
  broker_tenant_id     uuid NOT NULL,
  broker_user_id       uuid NOT NULL,
  broker_name          text NOT NULL,
  document_type        text NOT NULL,
  title                text NOT NULL,
  description          text,
  status               text NOT NULL DEFAULT 'REQUESTED',
  required             boolean NOT NULL DEFAULT true,
  due_date             timestamptz,
  comment              text,
  document_id          uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_requests_shipment_idx
  ON doc.document_requests (shipment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_requests_participants_idx
  ON doc.document_requests (tenant_id, broker_tenant_id);

CREATE TABLE IF NOT EXISTS doc.outbox (
  id uuid PRIMARY KEY, topic text NOT NULL, ordering_key text,
  event jsonb NOT NULL, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doc_outbox_unpub_idx ON doc.outbox (created_at) WHERE published_at IS NULL;

ALTER TABLE doc.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc.documents FORCE ROW LEVEL SECURITY;
ALTER TABLE doc.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc.document_requests FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON doc.documents;
  CREATE POLICY tenant_isolation ON doc.documents
    USING (
      tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR broker_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR carrier_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
      tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR broker_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR carrier_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );
  DROP POLICY IF EXISTS tenant_isolation ON doc.document_requests;
  CREATE POLICY tenant_isolation ON doc.document_requests
    USING (
      tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR broker_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
      tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR broker_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );
END$$;
