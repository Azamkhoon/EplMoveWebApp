import { baseEnvSchema, loadConfig } from "@epl/config";
import { z } from "zod";

const schema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("billing-svc"),
  PORT: z.coerce.number().default(8090),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("epl"),
  DB_PASSWORD: z.string().default("epl"),
  DB_NAME: z.string().default("epl_move"),
  DB_SCHEMA: z.string().default("billing"),
  PUBSUB_PROJECT_ID: z.string().default("epl-move-local"),
  PAYMENT_TERMS_DAYS: z.coerce.number().default(30),
});

export type AppConfig = z.infer<typeof schema>;
export const config: AppConfig = loadConfig(schema);
