import { Injectable } from "@nestjs/common";
import type { Load, LoadStatus } from "@epl/contracts";
import { config } from "../../config";

@Injectable()
export class LoadClient {
  private readonly base = config.LOAD_SVC_URL.replace(/\/$/, "");

  async get(loadId: string, tenantId: string): Promise<Load | null> {
    const qs = new URLSearchParams({ tenantId });
    const res = await fetch(`${this.base}/internal/loads/${loadId}?${qs}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`load lookup failed: ${res.status}`);
    return (await res.json()) as Load;
  }

  async transition(loadId: string, tenantId: string, to: LoadStatus): Promise<void> {
    const res = await fetch(`${this.base}/internal/loads/${loadId}/transition`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId, to }),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`load transition failed: ${res.status}`);
    }
  }
}
