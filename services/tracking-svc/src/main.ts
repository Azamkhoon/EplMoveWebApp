import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpErrorFilter } from "@epl/auth";
import { createLogger } from "@epl/observability";
import { config } from "./config";
import { TrackingWsGateway } from "./modules/tracking/ws.gateway";

const logger = createLogger(config.SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new HttpErrorFilter());
  await app.listen(config.PORT);

  // Attach the WebSocket server to the underlying HTTP server.
  const httpServer = app.getHttpServer();
  const ws = app.get(TrackingWsGateway);
  await ws.attach(httpServer, config.JWT_PUBLIC_KEY);

  logger.info({ port: config.PORT }, `${config.SERVICE_NAME} listening`);
}

bootstrap().catch((err) => {
  logger.error({ err }, "failed to bootstrap");
  process.exit(1);
});
