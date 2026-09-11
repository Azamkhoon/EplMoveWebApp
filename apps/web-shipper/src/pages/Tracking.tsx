import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Navigation, Search } from "lucide-react";
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
import { useI18n } from "@/i18n/LanguageContext";

const TRACKABLE_STATUSES = ["in_transit", "delayed", "posted", "booked"] as const;

export function Tracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [liveShipments, setLiveShipments] = useState<Shipment[] | null>(null);
  const [loading, setLoading] = useState(LIVE);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!LIVE || !api) {
      setLoading(false);
      return;
    }
    api
      .listShipments()
      .then((list) => {
        setLiveShipments(list.length > 0 ? list.map((shipment) => toViewShipment(shipment)) : null);
      })
      .catch(() => setLiveShipments(null))
      .finally(() => setLoading(false));
  }, []);

  const all = liveShipments ?? SHIPMENTS;
  const trackable = useMemo(
    () =>
      LIVE
        ? all.filter((s) => TRACKABLE_STATUSES.includes(s.status as (typeof TRACKABLE_STATUSES)[number]))
        : all.filter((s) => ["in_transit", "delayed", "posted"].includes(s.status)),
    [all, LIVE],
  );

  const filtered = useMemo(() => {
    if (!query) return trackable;
    const q = query.toLowerCase();
    return trackable.filter(
      (s) =>
        s.reference.toLowerCase().includes(q) ||
        s.destination.city.toLowerCase().includes(q) ||
        s.origin.city.toLowerCase().includes(q) ||
        s.carrier.toLowerCase().includes(q),
    );
  }, [query, trackable]);

  const selected = useMemo(() => {
    if (id) {
      const match = all.find((s) => s.id === id || s.reference === id);
      if (match) return match;
    }
    return filtered[0] ?? trackable[0] ?? all[0];
  }, [all, filtered, id, trackable]);

  function selectShipment(shipmentId: string) {
    navigate(`/tracking/${shipmentId}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        {t("tracking.loading")}
      </div>
    );
  }

  if (!selected) {
    return (
      <Card>
        <EmptyState
          icon={<Navigation size={22} />}
          title={t("tracking.nothingYet")}
          description={t("tracking.nothingYetHint")}
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <div className="border-b border-slate-100 p-4">
          <Input
            icon={<Search size={16} />}
            placeholder={t("tracking.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="mt-2 text-xs text-slate-400">
            {filtered.length} {t("tracking.activeLoads")}
          </p>
        </div>
        <div className="max-h-[640px] divide-y divide-slate-50 overflow-y-auto scrollbar-thin">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectShipment(s.id)}
              className={cn(
                "flex w-full flex-col gap-2 px-4 py-3 text-left transition",
                selected.id === s.id
                  ? "bg-brand-50/60 ring-1 ring-inset ring-brand-200"
                  : "hover:bg-slate-50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">{s.reference}</span>
                <StatusPill status={s.status} />
              </div>
              <p className="text-xs text-slate-500">
                {s.origin.city} → {s.destination.city}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{s.mode} · {s.carrier}</span>
                <span>{t("shipments.eta")} {formatDate(s.etaDate)}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">{t("tracking.noMatch")}</p>
          )}
        </div>
      </Card>

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
          <CardHeader title={t("tracking.milestones")} subtitle={t("tracking.milestonesSub")} />
          <CardBody>
            <StatusTimeline events={selected.events} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
