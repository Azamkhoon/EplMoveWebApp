import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TenantClient } from "./tenant.client";
import { IHamkorService } from "./ihamkor.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, TenantClient, IHamkorService],
})
export class AuthModule {}
