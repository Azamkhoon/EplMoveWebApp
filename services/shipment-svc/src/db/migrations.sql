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
ALTER TABLE shipment.shipments ADD COLUMN IF NOT EXISTS broker_tenant_id uuid;
ALTER TABLE shipment.shipments ADD COLUMN IF NOT EXISTS broker_name text;
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

CREATE TABLE IF NOT EXISTS shipment.activities (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id    uuid NOT NULL REFERENCES shipment.shipments(id) ON DELETE CASCADE,
  tenant_id      uuid NOT NULL,
  type           text NOT NULL,
  title          text NOT NULL,
  description    text,
  actor_user_id  uuid,
  actor_role     text,
  reference_id   uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activities_shipment_idx
  ON shipment.activities (shipment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shipment.messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id       uuid NOT NULL REFERENCES shipment.shipments(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL,
  sender_user_id    uuid NOT NULL,
  sender_tenant_id  uuid NOT NULL,
  sender_role       text NOT NULL,
  sender_name       text NOT NULL,
  body              text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_shipment_idx
  ON shipment.messages (shipment_id, created_at);

-- A booking is the commercial award created from one accepted carrier bid.
-- Shipment remains the operational aggregate, while this table preserves the
-- immutable load/quote/bid relationship for audit and future settlement.
CREATE TABLE IF NOT EXISTS shipment.bookings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id        uuid NOT NULL UNIQUE REFERENCES shipment.shipments(id) ON DELETE CASCADE,
  tenant_id          uuid NOT NULL,
  load_id            uuid NOT NULL,
  quote_id           uuid NOT NULL UNIQUE,
  bid_id             uuid NOT NULL UNIQUE,
  carrier_tenant_id  uuid NOT NULL,
  status             text NOT NULL DEFAULT 'CONFIRMED',
  booked_at          timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_participants_idx
  ON shipment.bookings (tenant_id, carrier_tenant_id);

CREATE TABLE IF NOT EXISTS shipment.broker_assignments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id        uuid NOT NULL REFERENCES shipment.shipments(id) ON DELETE CASCADE,
  shipper_tenant_id  uuid NOT NULL,
  broker_tenant_id   uuid NOT NULL,
  broker_name        text NOT NULL,
  assigned_by        uuid NOT NULL,
  active             boolean NOT NULL DEFAULT true,
  assigned_at        timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS broker_assignment_active_uidx
  ON shipment.broker_assignments (shipment_id) WHERE active;
CREATE INDEX IF NOT EXISTS broker_assignments_participants_idx
  ON shipment.broker_assignments (shipper_tenant_id, broker_tenant_id);

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
ALTER TABLE shipment.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment.activities FORCE ROW LEVEL SECURITY;
ALTER TABLE shipment.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE shipment.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment.bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE shipment.broker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment.broker_assignments FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON shipment.shipments;
  CREATE POLICY tenant_isolation ON shipment.shipments
    USING (
      tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR carrier_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR broker_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
      tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR carrier_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR broker_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );
  DROP POLICY IF EXISTS tenant_isolation ON shipment.milestones;
  CREATE POLICY tenant_isolation ON shipment.milestones
    USING (EXISTS (
      SELECT 1 FROM shipment.shipments s
       WHERE s.id = milestones.shipment_id
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM shipment.shipments s
       WHERE s.id = milestones.shipment_id
    ));
  DROP POLICY IF EXISTS tenant_isolation ON shipment.activities;
  CREATE POLICY tenant_isolation ON shipment.activities
    USING (EXISTS (
      SELECT 1 FROM shipment.shipments s
       WHERE s.id = activities.shipment_id
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM shipment.shipments s
       WHERE s.id = activities.shipment_id
    ));
  DROP POLICY IF EXISTS tenant_isolation ON shipment.messages;
  CREATE POLICY tenant_isolation ON shipment.messages
    USING (EXISTS (
      SELECT 1 FROM shipment.shipments s
       WHERE s.id = messages.shipment_id
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM shipment.shipments s
       WHERE s.id = messages.shipment_id
    ));
  DROP POLICY IF EXISTS tenant_isolation ON shipment.bookings;
  CREATE POLICY tenant_isolation ON shipment.bookings
    USING (
      tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR carrier_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
      tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR carrier_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );
  DROP POLICY IF EXISTS tenant_isolation ON shipment.broker_assignments;
  CREATE POLICY tenant_isolation ON shipment.broker_assignments
    USING (
      shipper_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR broker_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
      shipper_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      OR broker_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );
END$$;
