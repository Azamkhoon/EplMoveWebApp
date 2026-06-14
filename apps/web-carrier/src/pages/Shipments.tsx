import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, FileText, MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Field";

type ShipStatus =
  | "assigned" | "driver_assigned" | "pickup_scheduled" | "picked_up"
  | "in_transit" | "at_border" | "customs" | "delivered" | "completed";

interface Milestone { label: string; date: string | null; done: boolean }
interface Shipment {
  ref: string; customer: string; origin: string; dest: string;
  mode: string; cargo: string; weight: string;
  driver: string; vehicle: string;
  pickup: string; delivery: string;
  status: ShipStatus; delayed: boolean;
  milestones: Milestone[];
  docs: string[];
}

const SHIPMENTS: Shipment[] = [
  {
    ref: "SHP-0041", customer: "Acme Logistics", origin: "Shanghai, CN", dest: "Los Angeles, US",
    mode: "Ocean", cargo: "Electronics", weight: "22t",
    driver: "Marcus Webb", vehicle: "V-001 · TX-4821",
    pickup: "Jun 10, 2026", delivery: "Jun 28, 2026",
    status: "in_transit", delayed: false,
    milestones: [
      { label: "Assigned",         date: "Jun 09", done: true  },
      { label: "Driver assigned",  date: "Jun 09", done: true  },
      { label: "Pickup scheduled", date: "Jun 10", done: true  },
      { label: "Picked up",        date: "Jun 10", done: true  },
      { label: "In transit",       date: "Jun 11", done: true  },
      { label: "At border",        date: null,     done: false },
      { label: "Customs",          date: null,     done: false },
      { label: "Delivered",        date: null,     done: false },
      { label: "Completed",        date: null,     done: false },
    ],
    docs: ["Bill of Lading", "Commercial Invoice"],
  },
  {
    ref: "SHP-0039", customer: "AutoFleet GmbH", origin: "Rotterdam, NL", dest: "Hamburg, DE",
    mode: "Road", cargo: "Auto Parts", weight: "18t",
    driver: "Jin Soo Park", vehicle: "V-002 · CA-9034",
    pickup: "Jun 11, 2026", delivery: "Jun 14, 2026",
    status: "in_transit", delayed: true,
    milestones: [
      { label: "Assigned",         date: "Jun 10", done: true  },
      { label: "Driver assigned",  date: "Jun 10", done: true  },
      { label: "Pickup scheduled", date: "Jun 11", done: true  },
      { label: "Picked up",        date: "Jun 11", done: true  },
      { label: "In transit",       date: "Jun 11", done: true  },
      { label: "Delivered",        date: null,     done: false },
      { label: "Completed",        date: null,     done: false },
    ],
    docs: ["CMR", "Customs Declaration"],
  },
  {
    ref: "SHP-0038", customer: "ChemCorp USA", origin: "Houston, US", dest: "Miami, US",
    mode: "Road", cargo: "Chemicals", weight: "8t",
    driver: "Tariq Al-Rashid", vehicle: "V-005 · TX-6612",
    pickup: "Jun 14, 2026", delivery: "Jun 15, 2026",
    status: "pickup_scheduled", delayed: false,
    milestones: [
      { label: "Assigned",         date: "Jun 12", done: true  },
      { label: "Driver assigned",  date: "Jun 13", done: true  },
      { label: "Pickup scheduled", date: "Jun 14", done: true  },
      { label: "Picked up",        date: null,     done: false },
      { label: "In transit",       date: null,     done: false },
      { label: "Delivered",        date: null,     done: false },
      { label: "Completed",        date: null,     done: false },
    ],
    docs: ["Hazmat Declaration"],
  },
  {
    ref: "SHP-0031", customer: "AusTrade", origin: "Osaka, JP", dest: "Sydney, AU",
    mode: "Ocean", cargo: "Raw Materials", weight: "25t",
    driver: "Amara Diallo", vehicle: "V-001 · TX-4821",
    pickup: "Jun 05, 2026", delivery: "Jun 12, 2026",
    status: "completed", delayed: false,
    milestones: [
      { label: "Assigned", date: "Jun 04", done: true },
      { label: "Driver assigned", date: "Jun 04", done: true },
      { label: "Pickup scheduled", date: "Jun 05", done: true },
      { label: "Picked up", date: "Jun 05", done: true },
      { label: "In transit", date: "Jun 06", done: true },
      { label: "Delivered", date: "Jun 12", done: true },
      { label: "Completed", date: "Jun 12", done: true },
    ],
    docs: ["Bill of Lading", "POD", "Commercial Invoice"],
  },
];

const STATUS_META: Record<ShipStatus, { label: string; tone: "slate" | "amber" | "blue" | "navy" | "green" }> = {
  assigned:         { label: "Assigned",         tone: "slate"  },
  driver_assigned:  { label: "Driver Assigned",  tone: "slate"  },
  pickup_scheduled: { label: "Pickup Scheduled", tone: "amber"  },
  picked_up:        { label: "Picked Up",        tone: "amber"  },
  in_transit:       { label: "In Transit",       tone: "blue"   },
  at_border:        { label: "At Border",        tone: "navy"   },
  customs:          { label: "Customs",          tone: "navy"   },
  delivered:        { label: "Delivered",        tone: "green"  },
  completed:        { label: "Completed",        tone: "green"  },
};

const NEXT_STATUSES: Partial<Record<ShipStatus, ShipStatus>> = {
  assigned:         "driver_assigned",
  driver_assigned:  "pickup_scheduled",
  pickup_scheduled: "picked_up",
  picked_up:        "in_transit",
  in_transit:       "at_border",
  at_border:        "customs",
  customs:          "delivered",
  delivered:        "completed",
};

export function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>(SHIPMENTS);
  const [selected, setSelected]   = useState<Shipment | null>(SHIPMENTS[0]);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipStatus | "all" | "delayed">("all");
  const [updating, setUpdating]   = useState(false);
  const [newStatus, setNewStatus] = useState<ShipStatus | "">("");

  const shown = shipments.filter((s) => {
    const matchSearch = !search || s.ref.includes(search.toUpperCase()) || s.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" ? true : statusFilter === "delayed" ? s.delayed : s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function updateStatus() {
    if (!selected || !newStatus) return;
    setShipments((prev) =>
      prev.map((s) => s.ref === selected.ref
        ? { ...s, status: newStatus, milestones: s.milestones.map((m) => ({ ...m, done: m.done || m.label.toLowerCase().replace(/ /g,"_") === newStatus })) }
        : s,
      ),
    );
    setSelected((s) => s ? { ...s, status: newStatus } : s);
    setUpdating(false);
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reference or customer…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(["all", "in_transit", "pickup_scheduled", "completed", "delayed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                statusFilter === f ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "All" : f === "delayed" ? "Delayed" : STATUS_META[f]?.label ?? f}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">{shown.length} shipment{shown.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {/* List */}
        <div className="w-80 shrink-0 divide-y divide-slate-50 overflow-y-auto border-r border-slate-100">
          {shown.map((s) => {
            const meta = STATUS_META[s.status];
            return (
              <button
                key={s.ref}
                onClick={() => setSelected(s)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 ${selected?.ref === s.ref ? "bg-brand-50" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">{s.ref}</span>
                    {s.delayed && <AlertTriangle size={12} className="text-red-400" />}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{s.customer} · {s.origin.split(",")[0]} → {s.dest.split(",")[0]}</p>
                </div>
                <Badge tone={meta.tone} className="shrink-0 text-[10px]">{meta.label}</Badge>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        {selected && (() => {
          const meta = STATUS_META[selected.status];
          const nextStatus = NEXT_STATUSES[selected.status];
          return (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selected.ref}</h2>
                    {selected.delayed && <Badge tone="red"><AlertTriangle size={11} /> Delayed</Badge>}
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{selected.customer}</p>
                </div>
                {nextStatus && (
                  <Button size="sm" onClick={() => { setNewStatus(nextStatus); setUpdating(true); }}>
                    Update status
                  </Button>
                )}
              </div>

              {/* Info grid */}
              <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs md:grid-cols-4">
                <DetailCell label="Mode"    value={selected.mode}    />
                <DetailCell label="Cargo"   value={`${selected.cargo} · ${selected.weight}`} />
                <DetailCell label="Driver"  value={selected.driver}  />
                <DetailCell label="Vehicle" value={selected.vehicle} />
                <DetailCell label="Pickup"  value={selected.pickup}  />
                <DetailCell label="Delivery" value={selected.delivery} />
                <DetailCell label="Origin"  value={selected.origin}  />
                <DetailCell label="Destination" value={selected.dest} />
              </div>

              {/* Timeline */}
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Shipment timeline</p>
              <ol className="relative space-y-3 border-l border-slate-200 pl-5">
                {selected.milestones.map((m, i) => (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[22px] flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      m.done ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
                    }`}>
                      {m.done && <CheckCircle2 size={10} className="text-white" />}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${m.done ? "text-slate-800" : "text-slate-400"}`}>{m.label}</span>
                      {m.date && <span className="text-xs text-slate-400">{m.date}</span>}
                    </div>
                  </li>
                ))}
              </ol>

              {/* Docs */}
              {selected.docs.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.docs.map((doc) => (
                      <div key={doc} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                        <FileText size={12} className="text-slate-400" /> {doc}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Update status modal */}
      <Modal
        open={updating}
        onClose={() => setUpdating(false)}
        title={`Update status · ${selected?.ref}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setUpdating(false)}>Cancel</Button>
            <Button onClick={updateStatus}>Confirm</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Current: <Badge tone={STATUS_META[selected?.status ?? "assigned"].tone}>{STATUS_META[selected?.status ?? "assigned"].label}</Badge>
          </p>
          <Field label="New status">
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as ShipStatus)}>
              <option value="">— Select status —</option>
              {(Object.keys(STATUS_META) as ShipStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value}</p>
    </div>
  );
}
