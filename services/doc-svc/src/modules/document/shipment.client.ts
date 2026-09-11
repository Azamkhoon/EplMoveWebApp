import { Injectable } from "@nestjs/common";
import { config } from "../../config";

export interface ShipmentAccess {
  shipmentId: string;
  reference: string;
  shipperTenantId: string;
  carrierTenantId: string;
  brokerTenantId: string | null;
  brokerName: string | null;
}

@Injectable()
export class ShipmentClient {
  private readonly base = config.SHIPMENT_SVC_URL.replace(/\/$/, "");

  async access(shipmentId: string, tenantId: string, role: string): Promise<ShipmentAccess | null> {
    const qs = new URLSearchParams({ tenantId, role });
    const res = await fetch(`${this.base}/internal/shipments/${shipmentId}/access?${qs}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`shipment authorization failed: ${res.status}`);
    return (await res.json()) as ShipmentAccess;
  }
}
