import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ContextMiddleware } from "@epl/auth";
import { HealthModule } from "./health/health.module";
import { BillingModule } from "./modules/billing/billing.module";

@Module({
  imports: [HealthModule, BillingModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Establish the per-request identity context BEFORE guards run.
    consumer.apply(ContextMiddleware).forRoutes("*");
  }
}
