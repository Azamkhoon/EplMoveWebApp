import { baseEnvSchema, loadConfig } from "@epl/config";
import { z } from "zod";

const schema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("notify-svc"),
  PORT: z.coerce.number().default(8091),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("epl"),
  DB_PASSWORD: z.string().default("epl"),
  DB_NAME: z.string().default("epl_move"),
  DB_SCHEMA: z.string().default("notify"),
  PUBSUB_PROJECT_ID: z.string().default("epl-move-local"),
  // Delivery channels are pluggable; when unset, notifications are persisted
  // and logged only (the in-app inbox). Email/SMS/push providers slot in here.
  EMAIL_PROVIDER_URL: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema>;
export const config: AppConfig = loadConfig(schema);
