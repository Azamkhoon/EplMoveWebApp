import { Navigation, Flag, MapPin, Clock } from "lucide-react";
import type { Shipment } from "@/types";
import { MapView, type MapMarker, type MapRoute } from "@/components/map/MapView";
import { ProgressBar } from "@/components/ui/Misc";
import { formatDate, haversineKm } from "@/lib/utils";

export function ShipmentTracking({ shipment }: { shipment: Shipment }) {
  const markers: MapMarker[] = [
    {
      point: shipment.origin,
      kind: "origin",
      label: shipment.origin.city,
      sublabel: "Origin",
    },
    {
      point: shipment.destination,
      kind: "destination",
      label: shipment.destination.city,
      sublabel: "Destination",
    },
  ];
  if (shipment.currentLocation) {
    markers.push({
      point: shipment.currentLocation,
      kind: "vehicle",
      label: shipment.reference,
      sublabel: "Current position",
    });
  }
  const routes: MapRoute[] = [
    {
      points: shipment.route,
      progress: shipment.progress / 100,
      color: shipment.status === "delayed" ? "#dc2626" : "#1d4ed8",
    },
  ];

  const totalKm = haversineKm(shipment.origin, shipment.destination);
  const remainingKm = Math.round(totalKm * (1 - shipment.progress / 100));
  const lastEvent = [...shipment.events].reverse().find((e) => e.completed);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={<MapPin size={15} />} label="Origin" value={shipment.origin.city} />
        <Metric icon={<Flag size={15} />} label="Destination" value={shipment.destination.city} />
        <Metric icon={<Navigation size={15} />} label="Distance left" value={shipment.progress >= 100 ? "Arrived" : `${remainingKm.toLocaleString()} km`} />
        <Metric icon={<Clock size={15} />} label="ETA" value={formatDate(shipment.etaDate)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <MapView markers={markers} routes={routes} className="h-[360px] w-full" zoom={4} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            {lastEvent ? lastEvent.status : "Awaiting departure"}
          </p>
          <span className="text-sm font-semibold text-slate-900">
            {shipment.progress}%
          </span>
        </div>
        <ProgressBar
          value={shipment.progress}
          tone={shipment.status === "delayed" ? "red" : "brand"}
        />
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>{shipment.origin.city}</span>
          <span>{shipment.destination.city}</span>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
