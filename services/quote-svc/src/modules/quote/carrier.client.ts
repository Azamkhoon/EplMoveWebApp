import { Injectable } from "@nestjs/common";
import type { Carrier, CarrierSummary } from "@epl/contracts";
import { config } from "../../config";

@Injectable()
export class CarrierClient {
  private base = config.CARRIER_SVC_URL.replace(/\/$/, "");

  async list(mode?: string): Promise<Carrier[]> {
    const qs = mode && mode !== "Any" ? `?mode=${encodeURIComponent(mode)}` : "";
    const res = await fetch(`${this.base}/internal/carriers${qs}`);
    if (!res.ok) return [];
    return (await res.json()) as Carrier[];
  }

  async summaries(ids: string[]): Promise<Record<string, CarrierSummary>> {
    if (ids.length === 0) return {};
    const res = await fetch(`${this.base}/internal/carriers/summaries?ids=${ids.join(",")}`);
    if (!res.ok) return {};
    return (await res.json()) as Record<string, CarrierSummary>;
  }
}
