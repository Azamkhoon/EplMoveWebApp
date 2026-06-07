import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createLogger } from "@epl/observability";

const SERVICE_NAME = "tenant-svc";
const logger = createLogger(SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port);
  logger.info({ port }, `${SERVICE_NAME} listening`);
}

bootstrap().catch((err) => {
  logger.error({ err }, "failed to bootstrap");
  process.exit(1);
});
