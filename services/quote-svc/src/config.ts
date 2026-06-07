import { baseEnvSchema, loadConfig } from "@epl/config";
import { z } from "zod";

const schema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("quote-svc"),
  PORT: z.coerce.number().default(8085),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("epl"),
  DB_PASSWORD: z.string().default("epl"),
  DB_NAME: z.string().default("epl_move"),
  DB_SCHEMA: z.string().default("quote"),
  PUBSUB_PROJECT_ID: z.string().default("epl-move-local"),
  OUTBOX_RELAY_MS: z.coerce.number().default(2000),
  CARRIER_SVC_URL: z.string().default("http://localhost:8084"),
  // Auto-generate demo bids when a quote opens (Phase 2 demo aid).
  AUTO_BID: z.coerce.boolean().default(true),
});

export type AppConfig = z.infer<typeof schema>;
export const config: AppConfig = loadConfig(schema);
