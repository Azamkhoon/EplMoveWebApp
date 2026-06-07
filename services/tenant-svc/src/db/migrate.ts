import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { createLogger } from "@epl/observability";
import { config } from "../config";
import { PERMISSIONS, SYSTEM_ROLES } from "./seed";

const logger = createLogger("tenant-svc:migrate");

async function migrate() {
  const pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });

  const sqlText = readFileSync(join(__dirname, "migrations.sql"), "utf8");
  await pool.query(sqlText);

  // Seed permissions (idempotent).
  for (const key of PERMISSIONS) {
    await pool.query(
      `INSERT INTO tenant.permissions (key) VALUES ($1) ON CONFLICT (key) DO NOTHING`,
      [key],
    );
  }

  // Seed system roles + their permission grants (idempotent).
  for (const role of SYSTEM_ROLES) {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO tenant.roles (tenant_id, key, name) VALUES (NULL, $1, $2)
       ON CONFLICT (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), key)
       DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [role.key, role.name],
    );
    const roleId = rows[0]!.id;
    for (const perm of role.perms) {
      await pool.query(
        `INSERT INTO tenant.role_permissions (role_id, permission_id)
         SELECT $1, p.id FROM tenant.permissions p WHERE p.key = $2
         ON CONFLICT DO NOTHING`,
        [roleId, perm],
      );
    }
  }

  logger.info("tenant-svc migrations + seed applied");
  await pool.end();
}

migrate().catch((err) => {
  logger.error({ err }, "migration failed");
  process.exit(1);
});
