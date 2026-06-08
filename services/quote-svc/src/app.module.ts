import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ContextMiddleware } from "@epl/auth";
import { HealthModule } from "./health/health.module";
import { QuoteModule } from "./modules/quote/quote.module";

@Module({
  imports: [HealthModule, QuoteModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Establish the per-request identity context BEFORE guards run.
    consumer.apply(ContextMiddleware).forRoutes("*");
  }
}
