import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { AppModule } from "./app.module";
import { HttpErrorFilter } from "@epl/auth";
import { createLogger } from "@epl/observability";
import { config } from "./config";

const logger = createLogger(config.SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(json({ limit: "25mb" })); // base64 document payloads (dev)
  app.useGlobalFilters(new HttpErrorFilter());
  await app.listen(config.PORT);
  logger.info({ port: config.PORT, storage: config.STORAGE_DRIVER }, `${config.SERVICE_NAME} listening`);
}

bootstrap().catch((err) => {
  logger.error({ err }, "failed to bootstrap");
  process.exit(1);
});
