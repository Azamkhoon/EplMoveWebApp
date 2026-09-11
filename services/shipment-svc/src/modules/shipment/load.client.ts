import { Injectable } from "@nestjs/common";
import type { Load, LoadStatus } from "@epl/contracts";
import { config } from "../../config";

@Injectable()
export class LoadClient {
  private base = config.LOAD_SVC_URL.replace(/\/$/, "");

  async getLoad(id: string, tenantId: string): Promise<Load | null> {
    const res = await fetch(
      `${this.base}/internal/loads/${id}?tenantId=${encodeURIComponent(tenantId)}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as Load;
  }

  async transition(id: string, tenantId: string, to: LoadStatus): Promise<void> {
    const res = await fetch(`${this.base}/internal/loads/${id}/transition`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId, to }),
    });
    if (!res.ok) throw new Error(`load transition failed: ${res.status}`);
  }
}
