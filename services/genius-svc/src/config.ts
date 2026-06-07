import { baseEnvSchema, loadConfig } from "@epl/config";
import { z } from "zod";

const schema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("genius-svc"),
  PORT: z.coerce.number().default(8089),
  // Optional LLM / web-search provider. When set, the chat endpoint delegates
  // to it (RAG over the KB + live search); otherwise it answers from the KB.
  GENIUS_LLM_URL: z.string().optional(),
  GENIUS_LLM_API_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema>;
export const config: AppConfig = loadConfig(schema);
