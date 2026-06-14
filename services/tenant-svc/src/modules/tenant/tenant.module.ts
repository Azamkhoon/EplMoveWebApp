import { Module } from "@nestjs/common";
import { TenantInternalController, TenantPlatformController } from "./tenant.controller";
import { TenantService } from "./tenant.service";

@Module({
  controllers: [TenantInternalController, TenantPlatformController],
  providers: [TenantService],
})
export class TenantModule {}
