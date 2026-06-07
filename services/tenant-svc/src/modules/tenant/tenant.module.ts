import { Module } from "@nestjs/common";
import { TenantInternalController } from "./tenant.controller";
import { TenantService } from "./tenant.service";

@Module({
  controllers: [TenantInternalController],
  providers: [TenantService],
})
export class TenantModule {}
