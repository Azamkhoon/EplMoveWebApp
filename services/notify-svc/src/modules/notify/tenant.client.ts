import { Injectable } from "@nestjs/common";
import { config } from "../../config";

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  kind: "shipper" | "carrier" | "broker";
}

@Injectable()
export class TenantClient {
  private readonly base = config.TENANT_SVC_URL.replace(/\/$/, "");

  async list(kind?: TenantSummary["kind"]): Promise<TenantSummary[]> {
    const qs = kind ? `?kind=${encodeURIComponent(kind)}` : "";
    const res = await fetch(`${this.base}/internal/tenants${qs}`);
    if (!res.ok) return [];
    return (await res.json()) as TenantSummary[];
  }
}
