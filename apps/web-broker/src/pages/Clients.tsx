import { useState } from "react";
import { Search, Plus, ChevronRight, Building2, Shield } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { CLIENTS } from "@/data/mock";
import type { Client, ClientType } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const TYPE_CLS: Record<ClientType, string> = {
  importer:  "bg-blue-100 text-blue-700",
  exporter:  "bg-emerald-100 text-emerald-700",
  consignee: "bg-violet-100 text-violet-700",
  consignor: "bg-amber-100 text-amber-700",
};

const BLANK: Partial<Client> = { type: "importer", country: "" };

export function Clients() {
  const [list, setList]     = useState<Client[]>(CLIENTS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ClientType | "all">("all");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState<Partial<Client>>(BLANK);

  const visible = list.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.taxId.toLowerCase().includes(q) || c.contactEmail.toLowerCase().includes(q);
    }
    return true;
  });

  function patch(f: Partial<Client>) { setForm((p) => ({ ...p, ...f })); }

  function save() {
    const client: Client = {
      id:               `c-${Date.now()}`,
      name:             form.name ?? "",
      type:             form.type ?? "importer",
      taxId:            form.taxId ?? "",
      country:          form.country ?? "",
      address:          form.address ?? "",
      contactName:      form.contactName ?? "",
      contactEmail:     form.contactEmail ?? "",
      contactPhone:     form.contactPhone ?? "",
      eoriNumber:       form.eoriNumber ?? null,
      authorizedAt:     new Date().toISOString().slice(0,10),
      declarationCount: 0,
    };
    setList((p) => [client, ...p]);
    setShowAdd(false);
    setForm(BLANK);
    setSelected(client);
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
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700">
            <Plus size={16} />
          </button>
        </div>

        {/* Type filter */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
          {(["all","importer","exporter","consignee","consignor"] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={cn("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                filter === t ? "bg-teal-600 text-white" : "text-slate-500 hover:bg-slate-100")}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {visible.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)}
              className={cn("w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors",
                selected?.id === c.id && "bg-teal-50 border-l-2 border-teal-500")}>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Building2 size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-slate-800">{c.name}</span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", TYPE_CLS[c.type])}>
                      {c.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">{c.country} · {c.taxId}</p>
                  <p className="text-[10px] text-slate-400">{c.declarationCount} declarations</p>
                </div>
              </div>
            </button>
          ))}
          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
              <Building2 size={32} className="opacity-30" />
              <p className="text-sm">No clients found</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
          {visible.length} client{visible.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <ChevronRight size={40} className="opacity-20" />
            <p className="text-sm">Select a client to view details</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <Building2 size={28} />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", TYPE_CLS[selected.type])}>
                      {selected.type}
                    </span>
                    <span className="text-xs text-slate-400">{selected.country}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                  <p className="text-sm text-slate-500">{selected.taxId}</p>
                </div>
              </div>
              <Button variant="secondary" className="shrink-0">Edit</Button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-3">
              <InfoField label="Contact Name"  value={selected.contactName} />
              <InfoField label="Email"         value={selected.contactEmail} />
              <InfoField label="Phone"         value={selected.contactPhone} />
              <InfoField label="Address"       value={selected.address} />
              <InfoField label="Authorized"    value={selected.authorizedAt ? formatDate(selected.authorizedAt) : "—"} />
              <InfoField label="Declarations"  value={String(selected.declarationCount)} />
            </div>

            {selected.eoriNumber && (
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
                <Shield size={18} className="shrink-0 text-teal-600" />
                <div>
                  <p className="text-xs font-semibold text-teal-800">EORI Number</p>
                  <p className="font-mono text-sm text-teal-700">{selected.eoriNumber}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Client" size="xl">
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["importer","exporter","consignee","consignor"] as ClientType[]).map((t) => (
              <button key={t} onClick={() => patch({ type: t })}
                className={cn("flex-1 rounded-lg border py-2 text-xs font-semibold capitalize transition-colors",
                  form.type === t ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-teal-300")}>
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company Name"><Input value={form.name ?? ""} onChange={(e) => patch({ name: e.target.value })} /></Field>
            <Field label="Country Code"><Input value={form.country ?? ""} onChange={(e) => patch({ country: e.target.value })} maxLength={2} placeholder="US" /></Field>
            <Field label="Tax ID"><Input value={form.taxId ?? ""} onChange={(e) => patch({ taxId: e.target.value })} /></Field>
            <Field label="EORI Number (optional)"><Input value={form.eoriNumber ?? ""} onChange={(e) => patch({ eoriNumber: e.target.value || null })} /></Field>
            <Field label="Contact Name"><Input value={form.contactName ?? ""} onChange={(e) => patch({ contactName: e.target.value })} /></Field>
            <Field label="Contact Email"><Input type="email" value={form.contactEmail ?? ""} onChange={(e) => patch({ contactEmail: e.target.value })} /></Field>
            <Field label="Contact Phone"><Input value={form.contactPhone ?? ""} onChange={(e) => patch({ contactPhone: e.target.value })} /></Field>
            <Field label="Address"><Input value={form.address ?? ""} onChange={(e) => patch({ address: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name || !form.taxId}>Add Client</Button>
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
