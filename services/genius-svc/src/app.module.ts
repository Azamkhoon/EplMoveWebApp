import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { GeniusModule } from "./modules/genius/genius.module";

@Module({
  imports: [HealthModule, GeniusModule],
})
export class AppModule {}
