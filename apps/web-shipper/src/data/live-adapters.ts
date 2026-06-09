// Adapters: map live SDK domain shapes onto the richer view shapes the existing
// (originally mock-driven) UI renders. This lets us flip pages to live data
// without rewriting their presentation. Fields the backend doesn't (yet) carry
// are filled with sensible neutral defaults.
import type { Shipment as LiveShipment, Quote as LiveQuote } from "@epl/sdk";
import type { Shipment as ViewShipment, ShipmentStatus, TransportMode } from "@/types";

/** Normalize the live transport mode into the view's mode union. */
function viewMode(mode: string): TransportMode {
  // Live modes: Ocean | Air | Road | Rail | Multimodal. The view also knows FTL/LTL.
  if (mode === "Ocean" || mode === "Air" || mode === "Rail" || mode === "Road" || mode === "Multimodal") {
    return mode as TransportMode;
  }
  return "Ocean";
}

function viewStatus(status: string): ShipmentStatus {
  // Live: booked | in_transit | delayed | delivered | cancelled — all valid view statuses now.
  return status as ShipmentStatus;
}

/** Live Shipment → the view Shipment shape used by Shipments / ShipmentDetail. */
export function toViewShipment(s: LiveShipment): ViewShipment {
  const value = s.price?.amount ?? 0;
  return {
    id: s.id,
    reference: s.reference,
    status: viewStatus(s.status),
    mode: viewMode(s.mode),
    commodity: "—",
    origin: { ...s.origin, code: s.origin.code },
    destination: { ...s.destination, code: s.destination.code },
    carrier: s.carrierName,
    createdAt: s.bookedAt,
    pickupDate: s.bookedAt,
    etaDate: s.etaDate ?? s.bookedAt,
    weightKg: 0,
    volumeM3: 0,
    pieces: 0,
    valueUsd: value,
    costUsd: value,
    progress: s.progress ?? 0,
    currentLocation: undefined,
    documents: [],
    events: (s.milestones ?? []).map((m, i) => ({
      id: `${s.id}-m${i}`,
      status: m.status,
      description: m.description,
      location: m.location,
      timestamp: m.occurredAt ?? s.bookedAt,
      completed: m.completed,
    })),
    messages: [],
    route: [
      { lat: s.origin.lat, lng: s.origin.lng },
      { lat: s.destination.lat, lng: s.destination.lng },
    ],
  };
}

export interface ViewBid {
  id: string;
  carrier: string;
  rating?: number;
  price: number;
  currency: string;
  transitDays: number;
  status: string;
}

/** Live Quote → a flat view model for the Quotation page. */
export function toViewQuote(q: LiveQuote) {
  return {
    id: q.id,
    reference: q.reference,
    status: q.status,
    mode: q.mode,
    bids: (q.bids ?? [])
      .map<ViewBid>((b) => ({
        id: b.id,
        carrier: b.carrier?.name ?? "Carrier",
        rating: b.carrier?.rating,
        price: b.price.amount,
        currency: b.price.currency,
        transitDays: b.transitDays,
        status: b.status,
      }))
      .sort((a, b) => a.price - b.price),
  };
}
