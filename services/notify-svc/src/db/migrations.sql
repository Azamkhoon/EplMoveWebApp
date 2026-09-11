-- notify-svc schema: per-tenant notifications materialized from domain events.
-- RLS by tenant, idempotent consumption (dedupe on event id).
CREATE SCHEMA IF NOT EXISTS notify;

CREATE TABLE IF NOT EXISTS notify.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  kind        text NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  link        text,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notify.notifications ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE notify.notifications ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE notify.notifications ADD COLUMN IF NOT EXISTS shipment_id uuid;
ALTER TABLE notify.notifications ADD COLUMN IF NOT EXISTS reference_id uuid;
UPDATE notify.notifications SET company_id=tenant_id WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS notifications_tenant_idx ON notify.notifications (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notify.processed_events (
  event_id     uuid PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notify.processed_deliveries (
  event_id       uuid NOT NULL,
  tenant_id      uuid NOT NULL,
  recipient_key  text NOT NULL,
  processed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, tenant_id, recipient_key)
);

ALTER TABLE notify.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notify.notifications FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON notify.notifications;
  CREATE POLICY tenant_isolation ON notify.notifications
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
END$$;
