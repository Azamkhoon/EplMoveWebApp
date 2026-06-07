import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpErrorFilter } from "@epl/auth";
import { createLogger } from "@epl/observability";
import { config } from "./config";

const logger = createLogger(config.SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new HttpErrorFilter());
  await app.listen(config.PORT);
  logger.info(
    { port: config.PORT, llm: config.GENIUS_LLM_URL ? "configured" : "kb-only" },
    `${config.SERVICE_NAME} listening`,
  );
}

bootstrap().catch((err) => {
  logger.error({ err }, "failed to bootstrap");
  process.exit(1);
});
