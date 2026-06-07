import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { TrackingModule } from "./modules/tracking/tracking.module";

@Module({
  imports: [HealthModule, TrackingModule],
})
export class AppModule {}
