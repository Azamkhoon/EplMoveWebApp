import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Search, Upload } from "lucide-react";
import { ApiError, type Shipment, type ShipmentDocument, type ShipmentStatus } from "@epl/sdk";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Field";
import { useI18n } from "@/i18n/LanguageContext";
import { ShipmentMessages } from "@/components/shipment/ShipmentMessages";

type Tone = "slate" | "amber" | "blue" | "navy" | "green" | "red";

const STATUS_META: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  carrier_selected: { label: "Carrier selected", tone: "slate" },
  booked: { label: "Booked", tone: "slate" },
  pickup_scheduled: { label: "Pickup scheduled", tone: "amber" },
  picked_up: { label: "Picked up", tone: "amber" },
  in_transit: { label: "In transit", tone: "blue" },
  customs: { label: "Customs", tone: "navy" },
  delayed: { label: "Delayed", tone: "red" },
  delivered: { label: "Delivered", tone: "green" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
};

const NEXT_STATUSES: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  carrier_selected: "booked",
  booked: "pickup_scheduled",
  pickup_scheduled: "picked_up",
  picked_up: "in_transit",
  in_transit: "customs",
  customs: "delivered",
  delayed: "in_transit",
};

export function Shipments() {
  const { t } = useI18n();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [docs, setDocs] = useState<ShipmentDocument[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("all");
  const [newStatus, setNewStatus] = useState<ShipmentStatus | "">("");
  const [updating, setUpdating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const transportFile = useRef<HTMLInputElement>(null);

  async function load() {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const next = await api.listShipments();
      setShipments(next);
      setSelected((current) => next.find((item) => item.id === current?.id) ?? next[0] ?? null);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Failed to load shipments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!api || !selected) {
      setDocs([]);
      return;
    }
    api.listDocuments({ shipmentId: selected.id }).then(setDocs).catch(() => setDocs([]));
  }, [selected?.id]);

  const shown = useMemo(
    () =>
      shipments.filter((shipment) => {
        const needle = search.toLowerCase();
        const matchesSearch =
          !needle ||
          shipment.reference.toLowerCase().includes(needle) ||
          shipment.origin.city.toLowerCase().includes(needle) ||
          shipment.destination.city.toLowerCase().includes(needle) ||
          shipment.carrierName.toLowerCase().includes(needle);
        return matchesSearch && (statusFilter === "all" || shipment.status === statusFilter);
      }),
    [shipments, search, statusFilter],
  );

  async function updateStatus() {
    if (!api || !selected || !newStatus) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.updateShipmentStatus(selected.id, { status: newStatus });
      setShipments((current) => current.map((item) => (item.id === next.id ? next : item)));
      setSelected(await api.getShipment(selected.id));
      setUpdating(false);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadTransportDocument(file: File) {
    if (!api || !selected) return;
    setBusy(true); setError(null);
    try {
      await api.uploadDocument({
        shipmentId: selected.id,
        type: "Other",
        name: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentBase64: await fileBase64(file),
      });
      setDocs(await api.listDocuments({ shipmentId: selected.id }));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Document upload failed");
    } finally {
      setBusy(false);
    }
  }

  const nextStatus = selected ? NEXT_STATUSES[selected.status] : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("shipments.search")}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <Select
          className="w-48"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as ShipmentStatus | "all")}
        >
          <option value="all">{t("common.all")}</option>
          {Object.entries(STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </Select>
        <span className="ml-auto text-xs text-slate-400">{shown.length} {t("shipments.count")}</span>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

      <div className="flex min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="w-80 shrink-0 divide-y divide-slate-50 overflow-y-auto border-r border-slate-100">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Loading
            </div>
          ) : shown.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-400">No accepted shipments yet.</p>
          ) : (
            shown.map((shipment) => {
              const meta = STATUS_META[shipment.status];
              return (
                <button
                  key={shipment.id}
                  onClick={() => setSelected(shipment)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 ${selected?.id === shipment.id ? "bg-brand-50" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">{shipment.reference}</span>
                      {shipment.status === "delayed" && <AlertTriangle size={12} className="text-red-400" />}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {shipment.origin.city} → {shipment.destination.city}
                    </p>
                  </div>
                  <Badge tone={meta.tone} className="shrink-0 text-[10px]">{meta.label}</Badge>
                </button>
              );
            })
          )}
        </div>

        {selected ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{selected.reference}</h2>
                  <Badge tone={STATUS_META[selected.status].tone}>{STATUS_META[selected.status].label}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{selected.origin.city} → {selected.destination.city}</p>
              </div>
              {nextStatus && (
                <Button
                  size="sm"
                  onClick={() => {
                    setNewStatus(nextStatus);
                    setUpdating(true);
                  }}
                >
                  {t("shipments.update")}
                </Button>
              )}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs md:grid-cols-4">
              <DetailCell label={t("shipments.mode")} value={selected.mode} />
              <DetailCell label="Carrier" value={selected.carrierName} />
              <DetailCell label="Rate" value={`${selected.price.currency} ${selected.price.amount.toLocaleString()}`} />
              <DetailCell label={t("market.transit")} value={`${selected.transitDays} days`} />
              <DetailCell label={t("shipments.origin")} value={`${selected.origin.city}, ${selected.origin.country}`} />
              <DetailCell label={t("shipments.destination")} value={`${selected.destination.city}, ${selected.destination.country}`} />
              <DetailCell label="ETA" value={selected.etaDate ? new Date(selected.etaDate).toLocaleDateString() : "—"} />
              <DetailCell label="Broker" value={selected.brokerName ?? "Not assigned"} />
            </div>

            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t("shipments.timeline")}</p>
            <ol className="relative space-y-3 border-l border-slate-200 pl-5">
              {(selected.activity?.length ? selected.activity : selected.milestones ?? []).map((event) => {
                const title = "title" in event ? event.title : event.status;
                const date = "createdAt" in event ? event.createdAt : event.occurredAt;
                const done = "completed" in event ? event.completed : true;
                return (
                  <li key={event.id} className="relative">
                    <span className={`absolute -left-[22px] flex h-4 w-4 items-center justify-center rounded-full border-2 ${done ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"}`}>
                      {done && <CheckCircle2 size={10} className="text-white" />}
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-sm font-medium ${done ? "text-slate-800" : "text-slate-400"}`}>{title}</span>
                      {date && <span className="text-xs text-slate-400">{new Date(date).toLocaleString()}</span>}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t("shipments.documents")}</p><Button size="sm" variant="outline" disabled={busy} onClick={() => transportFile.current?.click()}><Upload size={12} /> Upload transport document</Button><input ref={transportFile} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadTransportDocument(file); event.currentTarget.value = ""; }} /></div>
              {docs.length === 0 ? (
                <p className="text-sm text-slate-400">No shared documents yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                      <FileText size={12} className="text-slate-400" /> {doc.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <ShipmentMessages shipmentId={selected.id} />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Select a shipment.</div>
        )}
      </div>

      <Modal
        open={updating}
        onClose={() => setUpdating(false)}
        title={`${t("shipments.update")} · ${selected?.reference ?? ""}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setUpdating(false)}>{t("common.cancel")}</Button>
            <Button disabled={busy || !newStatus} onClick={() => void updateStatus()}>{t("common.confirm")}</Button>
          </>
        }
      >
        <Field label={t("shipments.newStatus")}>
          <Select value={newStatus} onChange={(event) => setNewStatus(event.target.value as ShipmentStatus)}>
            <option value="">{t("shipments.selectStatus")}</option>
            {Object.entries(STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>{meta.label}</option>
            ))}
          </Select>
        </Field>
      </Modal>
    </div>
  );
}

function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value}</p>
    </div>
  );
}
