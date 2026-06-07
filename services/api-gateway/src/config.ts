import { baseEnvSchema, loadConfig } from "@epl/config";
import { z } from "zod";

const schema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("api-gateway"),
  PORT: z.coerce.number().default(8080),
  JWT_PUBLIC_KEY: z.string().min(1),
  AUTH_SVC_URL: z.string().default("http://localhost:8081"),
  TENANT_SVC_URL: z.string().default("http://localhost:8082"),
  LOAD_SVC_URL: z.string().default("http://localhost:8083"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  REDIS_URL: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema>;
export const config: AppConfig = loadConfig(schema);
