-- Cloud SQL counterpart of infra/docker/initdb/02-app-role.sql.
-- Run as the OWNER role (epl) after migrations. Grants the non-superuser
-- epl_app role DML on every service schema so RLS-scoped queries work.
-- Idempotent; re-run whenever migrations add new owner-created tables.
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['auth','tenant','load','quote','shipment','tracking','doc','carrier','notify','genius','billing','audit']
  LOOP
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', s);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO epl_app', s);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO epl_app', s);
    EXECUTE format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO epl_app', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE epl IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO epl_app', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE epl IN SCHEMA %I GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO epl_app', s);
  END LOOP;
END$$;
