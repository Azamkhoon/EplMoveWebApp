import { Injectable } from "@nestjs/common";
import { config } from "../../config";

export interface ResolvedMembership {
  tenantId: string;
  tenantSlug: string;
  role: string;
  perms: string[];
}

/**
 * Thin HTTP client to tenant-svc. At login we resolve which tenant(s) a user
 * belongs to and the role/permissions for the active tenant.
 */
@Injectable()
export class TenantClient {
  private base = config.TENANT_SVC_URL.replace(/\/$/, "");

  /** Provision a tenant + admin membership for a brand-new user (register). */
  async provisionTenant(input: {
    userId: string;
    tenantName: string;
    kind?: "shipper" | "carrier";
  }): Promise<ResolvedMembership> {
    const res = await fetch(`${this.base}/internal/tenants/provision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`tenant provision failed: ${res.status}`);
    return (await res.json()) as ResolvedMembership;
  }

  /** Resolve the active membership for a user (optionally by tenant slug). */
  async resolveMembership(input: {
    userId: string;
    tenantSlug?: string;
  }): Promise<ResolvedMembership | null> {
    const qs = new URLSearchParams({ userId: input.userId });
    if (input.tenantSlug) qs.set("tenantSlug", input.tenantSlug);
    const res = await fetch(`${this.base}/internal/memberships/resolve?${qs}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`membership resolve failed: ${res.status}`);
    return (await res.json()) as ResolvedMembership;
  }
}
