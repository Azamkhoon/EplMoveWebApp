import { useState } from "react";
import { Ship, Plane, Search, Plus, ChevronRight } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { SHIPMENTS_PENDING, CLIENTS } from "@/data/mock";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Shipment = (typeof SHIPMENTS_PENDING)[number] & { id: string; status: "pending" | "in_progress" | "cleared" };

const INIT: Shipment[] = SHIPMENTS_PENDING.map((s, i) => ({
  ...s,
  id: `sp-${i}`,
  status: i === 1 ? "in_progress" : "pending",
}));

const STATUS_CLS = {
  pending:     "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-100 text-amber-700",
  cleared:     "bg-emerald-100 text-emerald-700",
};

export function Shipments() {
  const [items, setItems]     = useState<Shipment[]>(INIT);
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ clientId: "", declarant: "Sara Mitchell" });

  const visible = items.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.ref.toLowerCase().includes(q) || s.client.toLowerCase().includes(q) || s.cargo.toLowerCase().includes(q);
  });

  function assign() {
    if (!selected) return;
    setItems((p) => p.map((s) => s.id === selected.id ? { ...s, status: "in_progress" as const } : s));
    setShowAssign(false);
  }

  function clear(s: Shipment) {
    setItems((p) => p.map((x) => x.id === s.id ? { ...x, status: "cleared" as const } : x));
    setSelected((prev) => prev?.id === s.id ? { ...prev, status: "cleared" } : prev);
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-4">
      {/* Left pane */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl border border-slate-200 bg-white lg:w-96">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              placeholder="Search shipments…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700">
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {visible.map((s) => (
            <button key={s.id} onClick={() => setSelected(s)}
              className={cn("w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors",
                selected?.id === s.id && "bg-teal-50 border-l-2 border-teal-500")}>
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  s.mode === "Air" ? "bg-sky-100 text-sky-600" : "bg-blue-100 text-blue-600")}>
                  {s.mode === "Air" ? <Plane size={14} /> : <Ship size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-700">{s.ref}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_CLS[s.status])}>
                      {s.status.replace("_"," ")}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-600">{s.client}</p>
                  <p className="text-[10px] text-slate-400">{s.origin} → {s.dest} · ETA {formatDate(s.eta)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
          {visible.length} shipment{visible.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <ChevronRight size={40} className="opacity-20" />
            <p className="text-sm">Select a shipment to view details</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  {selected.mode === "Air" ? <Plane size={16} className="text-sky-500" /> : <Ship size={16} className="text-blue-500" />}
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_CLS[selected.status])}>
                    {selected.status.replace("_"," ")}
                  </span>
                </div>
                <h2 className="font-mono text-xl font-bold text-slate-900">{selected.ref}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{selected.client}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {selected.status === "pending" && (
                  <Button onClick={() => setShowAssign(true)} className="bg-teal-600 hover:bg-teal-700">
                    Assign &amp; Start Clearance
                  </Button>
                )}
                {selected.status === "in_progress" && (
                  <Button onClick={() => clear(selected)} className="bg-emerald-600 hover:bg-emerald-700">
                    Mark Cleared
                  </Button>
                )}
              </div>
            </div>

            {/* Details grid */}
            <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-3">
              <InfoField label="Origin"     value={selected.origin} />
              <InfoField label="Destination" value={selected.dest} />
              <InfoField label="Mode"        value={selected.mode} />
              <InfoField label="Carrier"     value={selected.carrier} />
              <InfoField label="Incoterms"   value={selected.incoterms} />
              <InfoField label="ETA"         value={formatDate(selected.eta)} />
            </div>

            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Cargo</h3>
              <p className="text-sm text-slate-700">{selected.cargo}</p>
              <div className="mt-3 border-t border-slate-100 pt-3 flex justify-between">
                <span className="text-xs text-slate-400">Declared Value</span>
                <span className="text-sm font-semibold text-slate-800">{formatCurrency(selected.value, "USD")}</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-800 mb-1">Required Documents</p>
              {selected.mode === "Air" ? (
                <ul className="list-disc list-inside space-y-1 text-xs text-amber-700">
                  <li>Air Waybill (AWB)</li>
                  <li>Commercial Invoice</li>
                  <li>Packing List</li>
                  <li>Import / Export Permit (if applicable)</li>
                </ul>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-xs text-amber-700">
                  <li>Bill of Lading (B/L)</li>
                  <li>Commercial Invoice</li>
                  <li>Packing List</li>
                  <li>Certificate of Origin (Form A)</li>
                  <li>Import / Export Permit (if applicable)</li>
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assign modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Assign Clearance">
        <div className="space-y-4">
          <Field label="Override Client">
            <select value={assignForm.clientId} onChange={(e) => setAssignForm((p) => ({ ...p, clientId: e.target.value }))} className="input-base">
              <option value="">{selected?.client ?? "Existing client"}</option>
              {CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Assign Declarant">
            <select value={assignForm.declarant} onChange={(e) => setAssignForm((p) => ({ ...p, declarant: e.target.value }))} className="input-base">
              <option>Sara Mitchell</option>
              <option>John Farrer</option>
              <option>Karolina Wiśniewska</option>
            </select>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={assign}>Start Clearance</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value}</p>
    </div>
  );
}
