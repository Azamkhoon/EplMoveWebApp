import { Body, Controller, Get, Post, Query, HttpCode, Headers, ForbiddenException } from "@nestjs/common";
import { z } from "zod";
import { TenantService } from "./tenant.service";

const ProvisionInput = z.object({
  userId: z.string().uuid(),
  tenantName: z.string().min(1),
  kind: z.enum(["shipper", "carrier"]).default("shipper"),
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
    return this.tenants.provisionTenant(input.userId, input.tenantName, input.kind);
  }

  @Get("memberships/resolve")
  async resolve(@Query("userId") userId: string, @Query("tenantSlug") tenantSlug?: string) {
    return this.tenants.resolveMembership(userId, tenantSlug);
  }
}

/**
 * Platform admin endpoints — exposed via gateway /admin/* (requires platform:admin perm).
 * Gateway strips the /admin prefix before proxying, so these mount at /platform/*.
 */
@Controller("platform")
export class TenantPlatformController {
  constructor(private readonly tenants: TenantService) {}

  private requireAdmin(permsHeader: string | undefined) {
    const perms = (permsHeader ?? "").split(",");
    if (!perms.includes("platform:admin")) throw new ForbiddenException("platform:admin required");
  }

  @Get("tenants")
  async listTenants(@Headers("x-epl-perms") perms: string) {
    this.requireAdmin(perms);
    return this.tenants.listAllTenants();
  }

  @Get("memberships")
  async listMemberships(
    @Headers("x-epl-perms") perms: string,
    @Query("tenantId") tenantId?: string,
  ) {
    this.requireAdmin(perms);
    return this.tenants.listMemberships(tenantId);
  }
}
