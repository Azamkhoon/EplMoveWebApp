import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Navigation, Search } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Misc";
import { ShipmentTracking } from "@/components/shipment/ShipmentTracking";
import { StatusTimeline } from "@/components/shipment/StatusTimeline";
import { SHIPMENTS } from "@/data/shipments";
import { api, LIVE } from "@/api/client";
import { toViewShipment } from "@/data/live-adapters";
import { cn, formatDate } from "@/lib/utils";
import type { Shipment } from "@/types";

export function Tracking() {
  const { id } = useParams();
  const [liveShipments, setLiveShipments] = useState<Shipment[] | null>(null);

  useEffect(() => {
    if (!LIVE || !api) return;
    api.listShipments().then((list) => setLiveShipments(list.map(toViewShipment))).catch(() => setLiveShipments([]));
  }, []);

  const all = liveShipments ?? SHIPMENTS;
  // In live mode show all shipments (booked/in_transit/etc.); mock keeps its filter.
  const trackable = LIVE
    ? all
    : all.filter((s) => ["in_transit", "delayed", "posted"].includes(s.status));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(id);

  const filtered = useMemo(() => {
    if (!query) return trackable;
    const q = query.toLowerCase();
    return trackable.filter(
      (s) =>
        s.reference.toLowerCase().includes(q) ||
        s.destination.city.toLowerCase().includes(q) ||
        s.origin.city.toLowerCase().includes(q)
    );
  }, [query, trackable]);

  const selected =
    all.find((s) => s.id === selectedId) ?? trackable[0] ?? all[0];

  if (!selected) {
    return (
      <Card>
        <EmptyState
          icon={<Navigation size={22} />}
          title="Nothing to track yet"
          description="Shipments appear here once you accept a carrier bid in the Marketplace."
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* List */}
      <Card className="lg:col-span-1">
        <div className="border-b border-slate-100 p-4">
          <Input
            icon={<Search size={16} />}
            placeholder="Track by reference or city…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-[640px] divide-y divide-slate-50 overflow-y-auto scrollbar-thin">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={cn(
                "flex w-full flex-col gap-2 px-4 py-3 text-left transition",
                selected.id === s.id
                  ? "bg-brand-50/60 ring-1 ring-inset ring-brand-200"
                  : "hover:bg-slate-50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  {s.reference}
                </span>
                <StatusPill status={s.status} />
              </div>
              <p className="text-xs text-slate-500">
                {s.origin.city} → {s.destination.city}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{s.mode} · {s.carrier}</span>
                <span>ETA {formatDate(s.etaDate)}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              No matching shipments.
            </p>
          )}
        </div>
      </Card>

      {/* Detail */}
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Navigation size={16} className="text-brand-600" />
                {selected.reference}
              </span>
            }
            subtitle={`${selected.origin.city} → ${selected.destination.city} · ${selected.carrier}`}
            action={<StatusPill status={selected.status} />}
          />
          <CardBody>
            <ShipmentTracking shipment={selected} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Milestones" subtitle="Tracking history & upcoming events" />
          <CardBody>
            <StatusTimeline events={selected.events} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
