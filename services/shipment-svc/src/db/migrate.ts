import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { createLogger } from "@epl/observability";
import { config } from "../config";

const logger = createLogger("shipment-svc:migrate");

async function migrate() {
  const pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });
  await pool.query(readFileSync(join(__dirname, "migrations.sql"), "utf8"));
  logger.info("shipment-svc migrations applied");
  await pool.end();
}

migrate().catch((err) => {
  logger.error({ err }, "migration failed");
  process.exit(1);
});
