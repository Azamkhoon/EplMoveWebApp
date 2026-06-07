import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { TenantModule } from "./modules/tenant/tenant.module";

@Module({
  imports: [HealthModule, TenantModule],
})
export class AppModule {}
