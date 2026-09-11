import { baseEnvSchema, loadConfig } from "@epl/config";
import { z } from "zod";

const schema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("auth-svc"),
  PORT: z.coerce.number().default(8081),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("epl"),
  DB_PASSWORD: z.string().default("epl"),
  DB_NAME: z.string().default("epl_move"),
  DB_SCHEMA: z.string().default("auth"),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  ACCESS_TOKEN_TTL: z.coerce.number().default(600),
  REFRESH_TOKEN_TTL: z.coerce.number().default(2592000),
  // tenant-svc base URL for resolving memberships/roles at login
  TENANT_SVC_URL: z.string().default("http://localhost:8082"),
  IHAMKOR_API_URL: z.string().url().optional(),
  IHAMKOR_API_TOKEN: z.string().min(1).optional(),
  COMPANY_VERIFICATION_MODE: z.enum(["required", "optional"]).default("required"),
});

export type AppConfig = z.infer<typeof schema>;
export const config: AppConfig = loadConfig(schema);
