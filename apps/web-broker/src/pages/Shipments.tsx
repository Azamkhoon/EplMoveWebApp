import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  FileQuestion,
  Loader2,
  Plane,
  Search,
  Ship,
} from "lucide-react";
import { ApiError, type Shipment, type ShipmentStatus } from "@epl/sdk";
import { api } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";
import { ShipmentMessages } from "@/components/shipment/ShipmentMessages";

const STATUS_CLS: Record<ShipmentStatus, string> = {
  carrier_selected: "bg-slate-100 text-slate-600",
  booked: "bg-blue-100 text-blue-700",
  pickup_scheduled: "bg-amber-100 text-amber-700",
  picked_up: "bg-amber-100 text-amber-700",
  in_transit: "bg-sky-100 text-sky-700",
  customs: "bg-violet-100 text-violet-700",
  delayed: "bg-red-100 text-red-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

function label(status: ShipmentStatus) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Shipments() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(preferredId?: string) {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const shipments = await api.listShipments();
      setItems(shipments);
      const id = preferredId ?? selected?.id;
      const choice = shipments.find((shipment) => shipment.id === id) ?? shipments[0] ?? null;
      setSelected(choice ? await api.getShipment(choice.id) : null);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Failed to load assigned shipments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((shipment) =>
      [
        shipment.reference,
        shipment.origin.city,
        shipment.origin.country,
        shipment.destination.city,
        shipment.destination.country,
        shipment.carrierName,
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [items, search]);

  async function selectShipment(shipment: Shipment) {
    if (!api) return;
    setSelected(shipment);
    try {
      setSelected(await api.getShipment(shipment.id));
    } catch {
      // The list row remains useful if the detail refresh fails transiently.
    }
  }

  async function moveToCustoms() {
    if (!api || !selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateShipmentStatus(selected.id, {
        status: "customs",
        comment: "Customs broker started clearance review",
      });
      await load(selected.id);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not update customs status");
    } finally {
      setBusy(false);
    }
  }

  const canStartCustoms = selected && ["picked_up", "in_transit", "delayed"].includes(selected.status);

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
      <div className="flex h-[calc(100vh-10rem)] min-h-[560px] gap-4">
        <div className="flex w-80 shrink-0 flex-col rounded-xl border border-slate-200 bg-white lg:w-96">
          <div className="border-b border-slate-100 px-3 py-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                placeholder={t("shipments.search")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 divide-y divide-slate-50 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Loading
              </div>
            ) : visible.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <Ship size={30} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-medium text-slate-600">No assigned shipments</p>
                <p className="mt-1 text-xs text-slate-400">A shipper must assign your broker company first.</p>
              </div>
            ) : (
              visible.map((shipment) => (
                <button
                  key={shipment.id}
                  onClick={() => void selectShipment(shipment)}
                  className={cn(
                    "w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50",
                    selected?.id === shipment.id && "border-l-2 border-teal-500 bg-teal-50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      shipment.mode === "Air" ? "bg-sky-100 text-sky-600" : "bg-blue-100 text-blue-600",
                    )}>
                      {shipment.mode === "Air" ? <Plane size={14} /> : <Ship size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-700">{shipment.reference}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_CLS[shipment.status])}>
                          {label(shipment.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-600">{shipment.carrierName}</p>
                      <p className="text-[10px] text-slate-400">
                        {shipment.origin.city} → {shipment.destination.city}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
            {visible.length} assigned shipment{visible.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <ChevronRight size={40} className="opacity-20" />
              <p className="text-sm">Select an assigned shipment</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_CLS[selected.status])}>
                    {label(selected.status)}
                  </span>
                  <h2 className="mt-2 font-mono text-xl font-bold text-slate-900">{selected.reference}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Assigned to {selected.brokerName ?? "your brokerage"}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/documents?shipmentId=${selected.id}`)}
                  >
                    <FileQuestion size={15} /> Request document
                  </Button>
                  {canStartCustoms && (
                    <Button disabled={busy} onClick={() => void moveToCustoms()} className="bg-teal-600 hover:bg-teal-700">
                      {busy && <Loader2 size={14} className="animate-spin" />} Start customs
                    </Button>
                  )}
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
                <InfoField label={t("shipments.origin")} value={`${selected.origin.city}, ${selected.origin.country}`} />
                <InfoField label={t("shipments.destination")} value={`${selected.destination.city}, ${selected.destination.country}`} />
                <InfoField label={t("shipments.mode")} value={selected.mode} />
                <InfoField label="Carrier" value={selected.carrierName} />
                <InfoField label="Rate" value={formatCurrency(selected.price.amount, selected.price.currency)} />
                <InfoField label="Transit" value={`${selected.transitDays} days`} />
                <InfoField label="Booked" value={formatDate(selected.bookedAt)} />
                <InfoField label={t("shipments.eta")} value={selected.etaDate ? formatDate(selected.etaDate) : "—"} />
              </div>

              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Shipment activity</h3>
              <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                {(selected.activity ?? []).map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[22px] flex h-4 w-4 items-center justify-center rounded-full bg-teal-500">
                      <CheckCircle2 size={10} className="text-white" />
                    </span>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{event.title}</p>
                        {event.description && <p className="mt-0.5 text-xs text-slate-500">{event.description}</p>}
                      </div>
                      <time className="shrink-0 text-xs text-slate-400">{new Date(event.createdAt).toLocaleString()}</time>
                    </div>
                  </li>
                ))}
                {!selected.activity?.length && <li className="text-sm text-slate-400">No activity recorded yet.</li>}
              </ol>
              <ShipmentMessages shipmentId={selected.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label: fieldLabel, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{fieldLabel}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value}</p>
    </div>
  );
}
