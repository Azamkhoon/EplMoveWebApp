import { Module } from "@nestjs/common";
import {
  TenantDirectoryController,
  TenantInternalController,
  TenantPlatformController,
} from "./tenant.controller";
import { TenantService } from "./tenant.service";

@Module({
  controllers: [TenantInternalController, TenantDirectoryController, TenantPlatformController],
  providers: [TenantService],
})
export class TenantModule {}
