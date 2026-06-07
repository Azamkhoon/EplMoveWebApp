import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { LoadModule } from "./modules/load/load.module";

@Module({
  imports: [HealthModule, LoadModule],
})
export class AppModule {}
