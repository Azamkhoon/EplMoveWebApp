import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { createLogger } from "@epl/observability";
import { config } from "../config";

const logger = createLogger("carrier-svc:migrate");

// Demo carriers so the marketplace has bidders out of the box.
const SEED_CARRIERS = [
  { name: "Maersk Line", scac: "MAEU", modes: ["Ocean"], rating: 4.6, reliability: 96 },
  { name: "CMA CGM", scac: "CMDU", modes: ["Ocean"], rating: 4.3, reliability: 93 },
  { name: "Hapag-Lloyd", scac: "HLCU", modes: ["Ocean"], rating: 4.5, reliability: 95 },
  { name: "DB Schenker", scac: "DBSC", modes: ["Road", "Rail"], rating: 4.4, reliability: 94 },
  { name: "DSV", scac: "DSVF", modes: ["Road"], rating: 4.2, reliability: 92 },
  { name: "Lufthansa Cargo", scac: "GEC", modes: ["Air"], rating: 4.7, reliability: 97 },
  { name: "DB Cargo", scac: "DBCG", modes: ["Rail"], rating: 4.1, reliability: 90 },
  { name: "Kuehne+Nagel", scac: "KNCS", modes: ["Road", "Air", "Ocean"], rating: 4.5, reliability: 95 },
];

async function migrate() {
  const pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });
  await pool.query(readFileSync(join(__dirname, "migrations.sql"), "utf8"));

  for (const c of (process.env.SEED_DEMO_DATA === "true" && process.env.NODE_ENV !== "production" ? SEED_CARRIERS : [])) {
    const { rowCount } = await pool.query("SELECT 1 FROM carrier.carriers WHERE name = $1", [c.name]);
    if (rowCount) continue;
    await pool.query(
      `INSERT INTO carrier.carriers (name, scac, modes, rating_sum, ratings_count, reliability)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [c.name, c.scac, c.modes, c.rating * 20, 20, c.reliability], // seed as if 20 ratings
    );
  }

  logger.info("carrier-svc migrations applied");
  await pool.end();
}

migrate().catch((err) => {
  logger.error({ err }, "migration failed");
  process.exit(1);
});
