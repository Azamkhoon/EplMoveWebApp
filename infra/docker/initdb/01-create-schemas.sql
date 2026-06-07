-- One logical database/schema per service (database-per-service, single instance).
-- See docs/architecture/03-data-model.md. RLS policies are added by each
-- service's own migrations in Phase 1.

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS tenant;
CREATE SCHEMA IF NOT EXISTS load;
CREATE SCHEMA IF NOT EXISTS quote;
CREATE SCHEMA IF NOT EXISTS shipment;
CREATE SCHEMA IF NOT EXISTS tracking;
CREATE SCHEMA IF NOT EXISTS doc;
CREATE SCHEMA IF NOT EXISTS carrier;
CREATE SCHEMA IF NOT EXISTS notify;
CREATE SCHEMA IF NOT EXISTS genius;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS audit;
