import { baseEnvSchema, loadConfig } from "@epl/config";
import { z } from "zod";

const schema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("doc-svc"),
  PORT: z.coerce.number().default(8088),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("epl"),
  DB_PASSWORD: z.string().default("epl"),
  DB_NAME: z.string().default("epl_move"),
  DB_SCHEMA: z.string().default("doc"),
  PUBSUB_PROJECT_ID: z.string().default("epl-move-local"),
  // Storage: "local" (dev, filesystem) or "gcs" (prod, Cloud Storage).
  STORAGE_DRIVER: z.enum(["local", "gcs"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./.docstore"),
  GCS_BUCKET: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema>;
export const config: AppConfig = loadConfig(schema);
