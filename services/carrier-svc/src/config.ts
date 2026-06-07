import { baseEnvSchema, loadConfig } from "@epl/config";
import { z } from "zod";

const schema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("carrier-svc"),
  PORT: z.coerce.number().default(8084),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("epl"),
  DB_PASSWORD: z.string().default("epl"),
  DB_NAME: z.string().default("epl_move"),
  DB_SCHEMA: z.string().default("carrier"),
});

export type AppConfig = z.infer<typeof schema>;
export const config: AppConfig = loadConfig(schema);
