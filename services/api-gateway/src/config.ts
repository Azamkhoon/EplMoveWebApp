import { baseEnvSchema, loadConfig } from "@epl/config";
import { z } from "zod";

const schema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("api-gateway"),
  PORT: z.coerce.number().default(8080),
  JWT_PUBLIC_KEY: z.string().min(1),
  AUTH_SVC_URL: z.string().default("http://localhost:8081"),
  TENANT_SVC_URL: z.string().default("http://localhost:8082"),
  LOAD_SVC_URL: z.string().default("http://localhost:8083"),
  CARRIER_SVC_URL: z.string().default("http://localhost:8084"),
  QUOTE_SVC_URL: z.string().default("http://localhost:8085"),
  SHIPMENT_SVC_URL: z.string().default("http://localhost:8086"),
  TRACKING_SVC_URL: z.string().default("http://localhost:8087"),
  DOC_SVC_URL: z.string().default("http://localhost:8088"),
  GENIUS_SVC_URL: z.string().default("http://localhost:8089"),
  BILLING_SVC_URL: z.string().default("http://localhost:8090"),
  NOTIFY_SVC_URL: z.string().default("http://localhost:8091"),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  REDIS_URL: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema>;
export const config: AppConfig = loadConfig(schema);
