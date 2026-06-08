-- Non-superuser application role. Services MUST connect as this role (not the
-- bootstrap superuser) or Postgres RLS is bypassed (superusers ignore RLS even
-- with FORCE ROW LEVEL SECURITY). See docs/architecture/04-security.md.
--
-- In production (Cloud SQL) the equivalent role is provisioned by Terraform.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'epl_app') THEN
    CREATE ROLE epl_app LOGIN PASSWORD 'epl_app' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END$$;

GRANT CONNECT ON DATABASE epl_move TO epl_app;

-- Grant usage + DML on all service schemas, plus DEFAULT PRIVILEGES so tables
-- created later by each service's migrations are also accessible.
-- NOTE: migrations run as the OWNER (epl), services run as epl_app. The
-- ALTER DEFAULT PRIVILEGES below only auto-grants on objects epl_app itself
-- creates — NOT on tables created by the owner during migrations. So this
-- script must be re-run (or grants re-applied) after migrations add new tables.
-- The grant step is idempotent and the canonical place is `pnpm db:grant`.
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['auth','tenant','load','quote','shipment','tracking','doc','carrier','notify','genius','billing','audit']
  LOOP
    -- Create the schema if a service hasn't migrated yet, so grants don't fail.
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', s);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO epl_app', s);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO epl_app', s);
    EXECUTE format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO epl_app', s);
    -- Cover objects the owner (epl) creates during migrations going forward.
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE epl IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO epl_app', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE epl IN SCHEMA %I GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO epl_app', s);
  END LOOP;
END$$;
