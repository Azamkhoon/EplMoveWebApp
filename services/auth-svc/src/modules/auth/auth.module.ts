import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TenantClient } from "./tenant.client";

@Module({
  controllers: [AuthController],
  providers: [AuthService, TenantClient],
})
export class AuthModule {}
