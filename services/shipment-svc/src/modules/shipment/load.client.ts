import { Injectable } from "@nestjs/common";
import type { Load } from "@epl/contracts";
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
}
