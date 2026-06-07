import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { CarrierModule } from "./modules/carrier/carrier.module";

@Module({
  imports: [HealthModule, CarrierModule],
})
export class AppModule {}
