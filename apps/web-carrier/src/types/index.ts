/** Minimal view types shared by the carrier portal UI kit (see web-shipper for the full set). */

export type ShipmentStatus =
  | "posted"
  | "draft"
  | "booked"
  | "in_transit"
  | "delivered"
  | "delayed"
  | "cancelled";

export type TransportMode = "Ocean" | "Air" | "Road" | "Rail" | "Multimodal";
