import { useState } from "react";
import { Plus, Search, ChevronRight, X, FileText } from "lucide-react";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { DECLARATIONS, CLIENTS, HS_CODES } from "@/data/mock";
import type { Declaration, DeclarationStatus, DeclarationType } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_COLORS: Record<DeclarationStatus, string> = {
  draft:          "bg-slate-100 text-slate-600 border-slate-200",
  submitted:      "bg-blue-100 text-blue-700 border-blue-200",
  under_review:   "bg-amber-100 text-amber-700 border-amber-200",
  docs_requested: "bg-orange-100 text-orange-700 border-orange-200",
  approved:       "bg-emerald-100 text-emerald-700 border-emerald-200",
  released:       "bg-teal-100 text-teal-700 border-teal-200",
  rejected:       "bg-red-100 text-red-700 border-red-200",
  closed:         "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_LABEL: Record<DeclarationStatus, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  docs_requested: "Docs Requested", approved: "Approved", released: "Released",
  rejected: "Rejected", closed: "Closed",
};

const TYPE_COLORS: Record<DeclarationType, string> = {
  import: "text-blue-600 bg-blue-50", export: "text-emerald-600 bg-emerald-50",
  transit: "text-violet-600 bg-violet-50", temp_import: "text-amber-600 bg-amber-50",
  temp_export: "text-orange-600 bg-orange-50",
};

const STATUS_FLOW: DeclarationStatus[] = [
  "draft", "submitted", "under_review", "docs_requested", "approved", "released",
];

const TABS: Array<{ key: string; label: string }> = [
  { key: "all",           label: "All"           },
  { key: "draft",         label: "Draft"         },
  { key: "submitted",     label: "Submitted"     },
  { key: "under_review",  label: "Under Review"  },
  { key: "docs_requested",label: "Docs Requested"},
  { key: "approved",      label: "Approved"      },
  { key: "released",      label: "Released"      },
  { key: "rejected",      label: "Rejected"      },
];

const BLANK: Partial<Declaration> = {
  type: "import", status: "draft",
  currency: "USD", declarant: "Sara Mitchell",
};

export function Declarations() {
  const [list, setList]       = useState<Declaration[]>(DECLARATIONS);
  const [tab, setTab]         = useState("all");
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState<Declaration | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]       = useState<Partial<Declaration>>(BLANK);

  const visible = list.filter((d) => {
    if (tab !== "all" && d.status !== tab) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.reference.toLowerCase().includes(q) ||
        d.clientName.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.hsCode.toLowerCase().includes(q);
    }
    return true;
  });

  function patch(f: Partial<Declaration>) { setForm((p) => ({ ...p, ...f })); }

  function save() {
    const now = new Date().toISOString();
    const dec: Declaration = {
      id:          `d-${Date.now()}`,
      reference:   `DEC-2026-${String(list.length + 42).padStart(4, "0")}`,
      type:        form.type ?? "import",
      status:      "draft",
      clientId:    form.clientId ?? "",
      clientName:  CLIENTS.find((c) => c.id === form.clientId)?.name ?? "",
      shipmentRef: form.shipmentRef ?? "",
      origin:      form.origin ?? "",
      destination: form.destination ?? "",
      hsCode:      form.hsCode ?? "",
      description: form.description ?? "",
      totalValue:  Number(form.totalValue ?? 0),
      currency:    form.currency ?? "USD",
      dutyAmount:  0,
      vatAmount:   0,
      declarant:   form.declarant ?? "Sara Mitchell",
      createdAt:   now,
      updatedAt:   now,
      deadline:    form.deadline ?? null,
    };
    setList((p) => [dec, ...p]);
    setShowCreate(false);
    setForm(BLANK);
    setSelected(dec);
  }

  function advance(dec: Declaration) {
    const idx = STATUS_FLOW.indexOf(dec.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    const updated = { ...dec, status: next, updatedAt: new Date().toISOString() };
    setList((p) => p.map((d) => d.id === dec.id ? updated : d));
    setSelected(updated);
  }

  const hsMatch = HS_CODES.find((h) => h.code === form.hsCode);

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-4">
      {/* Left pane */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl border border-slate-200 bg-white lg:w-96">
        {/* Search + add */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              placeholder="Search declarations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700">
            <Plus size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-slate-100 px-3 py-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                tab === t.key ? "bg-teal-600 text-white" : "text-slate-500 hover:bg-slate-100")}>
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
              <FileText size={32} className="opacity-30" />
              <p className="text-sm">No declarations found</p>
            </div>
          )}
          {visible.map((dec) => (
            <button key={dec.id} onClick={() => setSelected(dec)}
              className={cn("w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors",
                selected?.id === dec.id && "bg-teal-50 border-l-2 border-teal-500")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", TYPE_COLORS[dec.type])}>
                      {dec.type}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-700">{dec.reference}</span>
                  </div>
                  <p className="truncate text-xs text-slate-600">{dec.clientName}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{dec.origin} → {dec.destination} · {dec.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", STATUS_COLORS[dec.status])}>
                    {STATUS_LABEL[dec.status]}
                  </span>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDate(dec.updatedAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
          {visible.length} declaration{visible.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <ChevronRight size={40} className="opacity-20" />
            <p className="text-sm">Select a declaration to view details</p>
          </div>
        ) : (
          <DeclarationDetail dec={selected} onAdvance={() => advance(selected)} />
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Declaration" size="xl">
        <div className="space-y-5">
          {/* Type selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700">Declaration Type</label>
            <div className="flex flex-wrap gap-2">
              {(["import","export","transit","temp_import","temp_export"] as DeclarationType[]).map((t) => (
                <button key={t} onClick={() => patch({ type: t })}
                  className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                    form.type === t ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-teal-300")}>
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Client">
              <select value={form.clientId ?? ""} onChange={(e) => patch({ clientId: e.target.value })}
                className="input-base">
                <option value="">Select client…</option>
                {CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Shipment Ref">
              <Input value={form.shipmentRef ?? ""} onChange={(e) => patch({ shipmentRef: e.target.value })} placeholder="SHP-XXXX" />
            </Field>
            <Field label="Origin Country">
              <Input value={form.origin ?? ""} onChange={(e) => patch({ origin: e.target.value })} placeholder="e.g. CN" maxLength={2} />
            </Field>
            <Field label="Destination Country">
              <Input value={form.destination ?? ""} onChange={(e) => patch({ destination: e.target.value })} placeholder="e.g. US" maxLength={2} />
            </Field>
            <Field label="HS Code">
              <Input value={form.hsCode ?? ""} onChange={(e) => patch({ hsCode: e.target.value })} placeholder="e.g. 8471.30" />
              {hsMatch && <p className="mt-1 text-[11px] text-teal-600">{hsMatch.description} · Duty {hsMatch.dutyRate}%</p>}
            </Field>
            <Field label="Deadline (optional)">
              <Input type="date" value={form.deadline ?? ""} onChange={(e) => patch({ deadline: e.target.value || null })} />
            </Field>
            <Field label="Total Value (USD)">
              <Input type="number" value={form.totalValue ?? ""} onChange={(e) => patch({ totalValue: Number(e.target.value) })} placeholder="0" />
            </Field>
            <Field label="Declarant">
              <select value={form.declarant ?? ""} onChange={(e) => patch({ declarant: e.target.value })} className="input-base">
                <option>Sara Mitchell</option>
                <option>John Farrer</option>
                <option>Karolina Wiśniewska</option>
              </select>
            </Field>
          </div>

          <Field label="Cargo Description">
            <Textarea value={form.description ?? ""} onChange={(e) => patch({ description: e.target.value })} rows={2} placeholder="Describe the goods…" />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={save}
              disabled={!form.clientId || !form.origin || !form.destination || !form.hsCode}>
              Create Declaration
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DeclarationDetail({ dec, onAdvance }: { dec: Declaration; onAdvance: () => void }) {
  const canAdvance = ["draft","submitted","under_review","docs_requested","approved"].includes(dec.status);
  const hsInfo     = HS_CODES.find((h) => h.code === dec.hsCode);
  const nextLabel: Record<string, string> = {
    draft: "Submit for Review", submitted: "Mark Under Review",
    under_review: "Mark Approved", docs_requested: "Mark Under Review",
    approved: "Release Goods",
  };

  const milestones: Array<{ status: DeclarationStatus; label: string; done: boolean; active: boolean }> = STATUS_FLOW.map((s, i) => {
    const currentIdx = STATUS_FLOW.indexOf(dec.status);
    return { status: s, label: STATUS_LABEL[s], done: i < currentIdx, active: i === currentIdx };
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className={cn("rounded px-2 py-0.5 text-xs font-bold uppercase", TYPE_COLORS[dec.type])}>
              {dec.type.replace("_"," ")}
            </span>
            <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", STATUS_COLORS[dec.status])}>
              {STATUS_LABEL[dec.status]}
            </span>
          </div>
          <h2 className="font-mono text-xl font-bold text-slate-900">{dec.reference}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{dec.clientName} · {dec.declarant}</p>
        </div>
        {canAdvance && (
          <Button onClick={onAdvance} className="shrink-0 bg-teal-600 hover:bg-teal-700">
            {nextLabel[dec.status] ?? "Advance"}
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-1">
        {milestones.map((m, i) => (
          <div key={m.status} className="flex shrink-0 items-center gap-1">
            <div className={cn("flex flex-col items-center")}>
              <div className={cn("h-2.5 w-2.5 rounded-full", m.done ? "bg-teal-500" : m.active ? "bg-teal-600 ring-2 ring-teal-300" : "bg-slate-200")} />
              <span className={cn("mt-1 text-[9px] font-medium", m.active ? "text-teal-700" : m.done ? "text-teal-500" : "text-slate-400")}>
                {m.label}
              </span>
            </div>
            {i < milestones.length - 1 && (
              <div className={cn("mb-3 h-px w-6 flex-shrink-0", m.done ? "bg-teal-400" : "bg-slate-200")} />
            )}
          </div>
        ))}
      </div>

      {/* Info grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-3">
        <InfoField label="Origin" value={dec.origin} />
        <InfoField label="Destination" value={dec.destination} />
        <InfoField label="Shipment Ref" value={dec.shipmentRef} mono />
        <InfoField label="HS Code" value={dec.hsCode} mono />
        <InfoField label="Description" value={dec.description} />
        {dec.deadline && <InfoField label="Deadline" value={formatDate(dec.deadline)} urgent={new Date(dec.deadline) <= new Date("2026-06-14")} />}
      </div>

      {/* Financials */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Duty & Tax Estimate</h3>
        {hsInfo && (
          <p className="mb-3 text-xs text-slate-500">{hsInfo.description} · Duty rate: <strong>{hsInfo.dutyRate}%</strong> · VAT: <strong>{hsInfo.vatRate}%</strong>
            {hsInfo.notes && <span className="ml-2 text-amber-600">⚠ {hsInfo.notes}</span>}
          </p>
        )}
        <div className="grid grid-cols-3 gap-3">
          <FinRow label="Customs Value"    value={formatCurrency(dec.totalValue, dec.currency)} />
          <FinRow label="Customs Duty"     value={formatCurrency(dec.dutyAmount, dec.currency)} />
          <FinRow label="VAT"              value={formatCurrency(dec.vatAmount, dec.currency)} />
        </div>
        <div className="mt-3 border-t border-slate-100 pt-3">
          <FinRow label="Total Liability" value={formatCurrency(dec.dutyAmount + dec.vatAmount, dec.currency)} large />
        </div>
      </div>

      {/* Meta */}
      <div className="flex gap-6 text-xs text-slate-400">
        <span>Created {formatDateTime(dec.createdAt)}</span>
        <span>Updated {formatDateTime(dec.updatedAt)}</span>
      </div>
    </div>
  );
}

function InfoField({ label, value, mono, urgent }: { label: string; value: string; mono?: boolean; urgent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-sm", mono && "font-mono", urgent ? "font-semibold text-red-600" : "text-slate-800")}>{value}</p>
    </div>
  );
}

function FinRow({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-0.5 font-semibold", large ? "text-lg text-teal-700" : "text-sm text-slate-800")}>{value}</p>
    </div>
  );
}
