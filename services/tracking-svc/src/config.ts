import { baseEnvSchema, loadConfig } from "@epl/config";
import { z } from "zod";

const schema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("tracking-svc"),
  PORT: z.coerce.number().default(8087),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("epl"),
  DB_PASSWORD: z.string().default("epl"),
  DB_NAME: z.string().default("epl_move"),
  DB_SCHEMA: z.string().default("tracking"),
  PUBSUB_PROJECT_ID: z.string().default("epl-move-local"),
  GEOFENCE_RADIUS_KM: z.coerce.number().default(25),
  JWT_PUBLIC_KEY: z.string().min(1),
});

export type AppConfig = z.infer<typeof schema>;
export const config: AppConfig = loadConfig(schema);
