import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ContextMiddleware } from "@epl/auth";
import { HealthModule } from "./health/health.module";
import { CarrierModule } from "./modules/carrier/carrier.module";

@Module({
  imports: [HealthModule, CarrierModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Establish the per-request identity context BEFORE guards run.
    consumer.apply(ContextMiddleware).forRoutes("*");
  }
}
