import type { Shipment, ShipmentStatus } from "@/types";

// Business records are supplied by the API; an empty account stays empty.
export const SHIPMENTS: Shipment[] = [];
export function getShipment(id: string): Shipment | undefined {
  return SHIPMENTS.find((s) => s.id === id || s.reference === id);
}
export function shipmentsByStatus(status?: ShipmentStatus) {
  return status ? SHIPMENTS.filter((s) => s.status === status) : SHIPMENTS;
}
export const STATUS_COUNTS = {} as Record<ShipmentStatus, number>;
