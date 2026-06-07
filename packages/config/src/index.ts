import { z } from "zod";

/**
 * Typed env loading & validation. Each service defines its env schema and
 * calls loadConfig(schema) at boot — fail-fast if anything required is missing.
 * Implementation lands in Phase 1; this is the stable public surface.
 */

/** Base env shared by every service. */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVICE_NAME: z.string(),
  PORT: z.coerce.number().int().default(8080),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});
export type BaseEnv = z.infer<typeof baseEnvSchema>;

/**
 * Validate `process.env` against `schema`, exiting the process on failure.
 * @throws never — on invalid config it logs and process.exit(1).
 */
export function loadConfig<S extends z.ZodTypeAny>(
  schema: S,
  source: Record<string, unknown> = process.env,
): z.infer<S> {
  const result = schema.safeParse(source);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error("[config] invalid environment:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}
