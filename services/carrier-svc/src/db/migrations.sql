-- carrier-svc schema: carrier profiles + ratings + vehicles. Idempotent.
-- Carriers are a global marketplace directory (not tenant-scoped — any shipper
-- can see/bid-from them), so no RLS here.
CREATE SCHEMA IF NOT EXISTS carrier;

CREATE TABLE IF NOT EXISTS carrier.carriers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid,                       -- the carrier org's own tenant (nullable for seeded demo carriers)
  name           text NOT NULL,
  scac           text,
  modes          text[] NOT NULL DEFAULT '{}',
  rating_sum     numeric NOT NULL DEFAULT 0, -- running sum of stars
  ratings_count  int NOT NULL DEFAULT 0,
  reliability    numeric NOT NULL DEFAULT 95,
  status         text NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carriers_name_idx ON carrier.carriers (name);

CREATE TABLE IF NOT EXISTS carrier.vehicles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id  uuid NOT NULL REFERENCES carrier.carriers(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  plate       text,
  capacity_kg numeric,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicles_carrier_idx ON carrier.vehicles (carrier_id);

CREATE TABLE IF NOT EXISTS carrier.ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id  uuid NOT NULL REFERENCES carrier.carriers(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL,   -- the shipper who rated
  stars       int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ratings_carrier_idx ON carrier.ratings (carrier_id);
