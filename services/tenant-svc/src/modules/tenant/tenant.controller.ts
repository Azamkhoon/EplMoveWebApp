import { Body, Controller, Get, Post, Query, HttpCode } from "@nestjs/common";
import { z } from "zod";
import { TenantService } from "./tenant.service";

const ProvisionInput = z.object({
  userId: z.string().uuid(),
  tenantName: z.string().min(1),
});

/**
 * Internal endpoints — only reachable service-to-service (gateway never exposes
 * /internal/*). Consumed by auth-svc during register/login.
 */
@Controller("internal")
export class TenantInternalController {
  constructor(private readonly tenants: TenantService) {}

  @Post("tenants/provision")
  @HttpCode(200)
  async provision(@Body() body: unknown) {
    const input = ProvisionInput.parse(body);
    return this.tenants.provisionTenant(input.userId, input.tenantName);
  }

  @Get("memberships/resolve")
  async resolve(@Query("userId") userId: string, @Query("tenantSlug") tenantSlug?: string) {
    return this.tenants.resolveMembership(userId, tenantSlug);
  }
}
