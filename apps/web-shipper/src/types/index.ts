export type ShipmentStatus =
  | "posted"
  | "draft"
  | "in_transit"
  | "delivered"
  | "delayed";

export type TransportMode = "FTL" | "LTL" | "Ocean" | "Air" | "Rail";

export type DocumentType =
  | "Bill of Lading"
  | "Commercial Invoice"
  | "Packing List"
  | "Customs Declaration"
  | "Proof of Delivery"
  | "Insurance Certificate";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Location extends GeoPoint {
  city: string;
  country: string;
  code?: string; // port / airport / facility code
}

export interface ShipmentDocument {
  id: string;
  name: string;
  type: DocumentType;
  sizeKb: number;
  uploadedAt: string; // ISO
  uploadedBy: string;
  status: "verified" | "pending" | "missing";
}

export interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location: string;
  timestamp: string; // ISO
  completed: boolean;
  point?: GeoPoint;
}

export interface ChatMessage {
  id: string;
  author: string;
  role: "shipper" | "carrier" | "system";
  text: string;
  timestamp: string; // ISO
}

export interface Shipment {
  id: string;
  reference: string;
  status: ShipmentStatus;
  mode: TransportMode;
  commodity: string;
  origin: Location;
  destination: Location;
  carrier: string;
  carrierLogo?: string;
  createdAt: string; // ISO
  pickupDate: string; // ISO
  etaDate: string; // ISO
  weightKg: number;
  volumeM3: number;
  pieces: number;
  valueUsd: number;
  costUsd: number;
  progress: number; // 0-100
  currentLocation?: Location;
  documents: ShipmentDocument[];
  events: TrackingEvent[];
  messages: ChatMessage[];
  route: GeoPoint[];
}

export interface QuoteOption {
  id: string;
  carrier: string;
  mode: TransportMode;
  priceUsd: number;
  transitDays: number;
  co2Kg: number;
  rating: number; // 0-5
  reliability: number; // 0-100
  recommended?: boolean;
}

export interface QuoteRequest {
  origin: string;
  destination: string;
  mode: TransportMode | "Any";
  weightKg: number;
  volumeM3: number;
  readyDate: string;
}

export interface KpiPoint {
  label: string;
  shipments: number;
  delivered: number;
  spend: number;
}

export interface LaneStat {
  lane: string;
  volume: number;
  onTime: number;
}

export interface ModeSpend {
  mode: string;
  spend: number;
  share: number;
}
