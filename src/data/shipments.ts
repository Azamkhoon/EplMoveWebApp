import type {
  ChatMessage,
  GeoPoint,
  Shipment,
  ShipmentDocument,
  ShipmentStatus,
  TrackingEvent,
  TransportMode,
} from "@/types";
import { LOCATIONS } from "./locations";

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function hoursAgo(n: number) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

// Build a great-circle-ish polyline between two points with a slight arc.
function buildRoute(a: GeoPoint, b: GeoPoint, steps = 24): GeoPoint[] {
  const pts: GeoPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = a.lat + (b.lat - a.lat) * t;
    const lng = a.lng + (b.lng - a.lng) * t;
    const arc = Math.sin(Math.PI * t) * (Math.abs(b.lng - a.lng) > 30 ? 6 : 1.5);
    pts.push({ lat: lat + arc, lng });
  }
  return pts;
}

function pointAt(route: GeoPoint[], progress: number): GeoPoint {
  const idx = Math.min(
    route.length - 1,
    Math.floor((progress / 100) * (route.length - 1))
  );
  return route[idx];
}

let docCounter = 0;
function doc(
  type: ShipmentDocument["type"],
  status: ShipmentDocument["status"]
): ShipmentDocument {
  docCounter += 1;
  return {
    id: `DOC-${1000 + docCounter}`,
    name: `${type.replace(/\s+/g, "_")}.pdf`,
    type,
    sizeKb: 80 + Math.round(Math.random() * 900),
    uploadedAt: hoursAgo(6 + docCounter * 3),
    uploadedBy: status === "missing" ? "—" : "Operations Team",
    status,
  };
}

const DOC_SETS: Record<ShipmentStatus, ShipmentDocument[]> = {
  draft: [
    doc("Commercial Invoice", "pending"),
    doc("Packing List", "missing"),
  ],
  posted: [
    doc("Commercial Invoice", "verified"),
    doc("Packing List", "verified"),
    doc("Insurance Certificate", "pending"),
  ],
  in_transit: [
    doc("Bill of Lading", "verified"),
    doc("Commercial Invoice", "verified"),
    doc("Packing List", "verified"),
    doc("Customs Declaration", "pending"),
  ],
  delayed: [
    doc("Bill of Lading", "verified"),
    doc("Commercial Invoice", "verified"),
    doc("Customs Declaration", "pending"),
  ],
  delivered: [
    doc("Bill of Lading", "verified"),
    doc("Commercial Invoice", "verified"),
    doc("Packing List", "verified"),
    doc("Customs Declaration", "verified"),
    doc("Proof of Delivery", "verified"),
  ],
};

function buildEvents(
  status: ShipmentStatus,
  progress: number,
  originCity: string,
  destCity: string
): TrackingEvent[] {
  const stages = [
    { status: "Booking confirmed", desc: "Shipment booked and confirmed with carrier", loc: originCity, at: 100 },
    { status: "Picked up", desc: "Cargo collected from shipper facility", loc: originCity, at: 95 },
    { status: "Departed origin", desc: "Departed origin terminal", loc: originCity, at: 80 },
    { status: "In transit", desc: "Shipment moving toward destination", loc: "In transit", at: 55 },
    { status: "Customs clearance", desc: "Undergoing customs inspection", loc: destCity, at: 25 },
    { status: "Arrived destination", desc: "Arrived at destination terminal", loc: destCity, at: 10 },
    { status: "Out for delivery", desc: "Out for final-mile delivery", loc: destCity, at: 4 },
    { status: "Delivered", desc: "Delivered and signed for", loc: destCity, at: 0 },
  ];

  return stages
    .slice()
    .reverse()
    .map((s, i) => {
      const completed = progress <= s.at || status === "delivered";
      return {
        id: `EVT-${i}`,
        status: s.status,
        description: s.desc,
        location: s.loc,
        timestamp: completed ? hoursAgo((stages.length - i) * 14) : daysFromNow(i),
        completed,
      } as TrackingEvent;
    })
    .reverse();
}

function buildMessages(status: ShipmentStatus, carrier: string): ChatMessage[] {
  if (status === "draft") return [];
  const base: ChatMessage[] = [
    {
      id: "M1",
      author: "EPL Move",
      role: "system",
      text: "Shipment thread created. You can coordinate with the carrier here.",
      timestamp: hoursAgo(48),
    },
    {
      id: "M2",
      author: carrier,
      role: "carrier",
      text: "Hi, we've confirmed your booking. Pickup is scheduled as planned.",
      timestamp: hoursAgo(40),
    },
    {
      id: "M3",
      author: "You",
      role: "shipper",
      text: "Great, thanks. Please share the BoL once cargo is loaded.",
      timestamp: hoursAgo(38),
    },
  ];
  if (status === "in_transit" || status === "delivered" || status === "delayed") {
    base.push({
      id: "M4",
      author: carrier,
      role: "carrier",
      text:
        status === "delayed"
          ? "Heads up — we're seeing congestion at the port, ETA may slip by ~1 day."
          : "Cargo is loaded and en route. Tracking is live now.",
      timestamp: hoursAgo(20),
    });
  }
  if (status === "delivered") {
    base.push({
      id: "M5",
      author: carrier,
      role: "carrier",
      text: "Delivered and signed for. POD has been uploaded to documents.",
      timestamp: hoursAgo(3),
    });
  }
  return base;
}

interface Seed {
  reference: string;
  status: ShipmentStatus;
  mode: TransportMode;
  commodity: string;
  origin: keyof typeof LOCATIONS;
  destination: keyof typeof LOCATIONS;
  carrier: string;
  weightKg: number;
  volumeM3: number;
  pieces: number;
  valueUsd: number;
  costUsd: number;
  progress: number;
  pickupOffset: number;
  etaOffset: number;
}

const SEEDS: Seed[] = [
  { reference: "EPL-2026-0481", status: "in_transit", mode: "Ocean", commodity: "Industrial machinery parts", origin: "shanghai", destination: "rotterdam", carrier: "Maersk Line", weightKg: 18400, volumeM3: 58, pieces: 12, valueUsd: 240000, costUsd: 8650, progress: 62, pickupOffset: -14, etaOffset: 9 },
  { reference: "EPL-2026-0479", status: "in_transit", mode: "Air", commodity: "Pharmaceutical cold-chain", origin: "mumbai", destination: "hamburg", carrier: "Lufthansa Cargo", weightKg: 2200, volumeM3: 9, pieces: 40, valueUsd: 520000, costUsd: 14200, progress: 38, pickupOffset: -3, etaOffset: 2 },
  { reference: "EPL-2026-0476", status: "delayed", mode: "Ocean", commodity: "Automotive components", origin: "singapore", destination: "lehavre", carrier: "CMA CGM", weightKg: 21000, volumeM3: 66, pieces: 20, valueUsd: 310000, costUsd: 9100, progress: 71, pickupOffset: -19, etaOffset: 3 },
  { reference: "EPL-2026-0470", status: "in_transit", mode: "FTL", commodity: "Retail consumer goods", origin: "rotterdam", destination: "gdansk", carrier: "DB Schenker", weightKg: 12500, volumeM3: 42, pieces: 28, valueUsd: 88000, costUsd: 2350, progress: 45, pickupOffset: -2, etaOffset: 1 },
  { reference: "EPL-2026-0468", status: "posted", mode: "LTL", commodity: "Electronics accessories", origin: "antwerp", destination: "barcelona", carrier: "Awaiting carrier", weightKg: 3400, volumeM3: 14, pieces: 16, valueUsd: 47000, costUsd: 0, progress: 0, pickupOffset: 3, etaOffset: 8 },
  { reference: "EPL-2026-0467", status: "posted", mode: "Ocean", commodity: "Furniture & fixtures", origin: "felixstowe", destination: "newyork", carrier: "Awaiting carrier", weightKg: 16800, volumeM3: 71, pieces: 34, valueUsd: 132000, costUsd: 0, progress: 0, pickupOffset: 5, etaOffset: 21 },
  { reference: "EPL-2026-0462", status: "draft", mode: "Air", commodity: "Semiconductors", origin: "shanghai", destination: "losangeles", carrier: "—", weightKg: 900, volumeM3: 4, pieces: 8, valueUsd: 410000, costUsd: 0, progress: 0, pickupOffset: 7, etaOffset: 11 },
  { reference: "EPL-2026-0459", status: "draft", mode: "FTL", commodity: "Building materials", origin: "genoa", destination: "hamburg", carrier: "—", weightKg: 22000, volumeM3: 48, pieces: 6, valueUsd: 64000, costUsd: 0, progress: 0, pickupOffset: 9, etaOffset: 14 },
  { reference: "EPL-2026-0455", status: "delivered", mode: "Ocean", commodity: "Textiles & apparel", origin: "mumbai", destination: "antwerp", carrier: "Hapag-Lloyd", weightKg: 14200, volumeM3: 54, pieces: 60, valueUsd: 96000, costUsd: 7400, progress: 100, pickupOffset: -34, etaOffset: -4 },
  { reference: "EPL-2026-0451", status: "delivered", mode: "Air", commodity: "Medical devices", origin: "dubai", destination: "felixstowe", carrier: "Emirates SkyCargo", weightKg: 1600, volumeM3: 7, pieces: 22, valueUsd: 280000, costUsd: 11800, progress: 100, pickupOffset: -12, etaOffset: -6 },
  { reference: "EPL-2026-0447", status: "delivered", mode: "FTL", commodity: "Food & beverage", origin: "barcelona", destination: "genoa", carrier: "DSV", weightKg: 9800, volumeM3: 33, pieces: 24, valueUsd: 41000, costUsd: 1950, progress: 100, pickupOffset: -9, etaOffset: -5 },
  { reference: "EPL-2026-0443", status: "in_transit", mode: "Rail", commodity: "Chemicals (non-hazardous)", origin: "gdansk", destination: "barcelona", carrier: "DB Cargo", weightKg: 26000, volumeM3: 60, pieces: 4, valueUsd: 73000, costUsd: 4300, progress: 28, pickupOffset: -4, etaOffset: 6 },
];

export const SHIPMENTS: Shipment[] = SEEDS.map((s, i) => {
  const origin = LOCATIONS[s.origin];
  const destination = LOCATIONS[s.destination];
  const route = buildRoute(origin, destination);
  const currentPoint =
    s.progress > 0 && s.progress < 100 ? pointAt(route, s.progress) : undefined;
  return {
    id: `SH-${4800 - i}`,
    reference: s.reference,
    status: s.status,
    mode: s.mode,
    commodity: s.commodity,
    origin,
    destination,
    carrier: s.carrier,
    createdAt: daysFromNow(s.pickupOffset - 4),
    pickupDate: daysFromNow(s.pickupOffset),
    etaDate: daysFromNow(s.etaOffset),
    weightKg: s.weightKg,
    volumeM3: s.volumeM3,
    pieces: s.pieces,
    valueUsd: s.valueUsd,
    costUsd: s.costUsd,
    progress: s.progress,
    currentLocation: currentPoint
      ? { ...currentPoint, city: "En route", country: "" }
      : undefined,
    documents: DOC_SETS[s.status].map((d) => ({ ...d, id: `${d.id}-${i}` })),
    events: buildEvents(s.status, s.progress, origin.city, destination.city),
    messages: buildMessages(s.status, s.carrier),
    route,
  };
});

export function getShipment(id: string): Shipment | undefined {
  return SHIPMENTS.find((s) => s.id === id || s.reference === id);
}

export function shipmentsByStatus(status?: ShipmentStatus) {
  if (!status) return SHIPMENTS;
  return SHIPMENTS.filter((s) => s.status === status);
}

export const STATUS_COUNTS = SHIPMENTS.reduce(
  (acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  },
  {} as Record<ShipmentStatus, number>
);
