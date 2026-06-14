import { useState } from "react";
import { Search, Building2, Ban, CheckCircle2, ChevronRight } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { TENANTS, type Tenant } from "@/data/mock";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>(TENANTS);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<"all" | "shipper" | "carrier">("all");
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<Tenant | null>(null);

  const visible = tenants.filter((t) => {
    if (filter !== "all" && t.kind !== filter) return false;
    if (search) return t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase());
    return true;
  });

  function toggleStatus(t: Tenant) {
    const next = t.status === "active" ? "suspended" : "active";
    setTenants((p) => p.map((x) => x.id === t.id ? { ...x, status: next } : x));
    if (selected?.id === t.id) setSelected((p) => p ? { ...p, status: next } : p);
    setConfirmSuspend(null);
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-4">
      {/* Left pane */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl border border-slate-200 bg-white lg:w-96">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              placeholder="Search tenants…" value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
          {(["all","shipper","carrier"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                filter === f ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100")}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {visible.map((t) => (
            <button key={t.id} onClick={() => setSelected(t)}
              className={cn("w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors",
                selected?.id === t.id && "bg-brand-50 border-l-2 border-brand-500")}>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100"><Building2 size={14} className="text-slate-500" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-slate-800">{t.name}</span>
                    <Badge label={t.status} tone={t.status === "active" ? "emerald" : "red"} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400 capitalize">{t.kind} · {t.memberCount} members</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">{visible.length} tenants</div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <ChevronRight size={40} className="opacity-20" />
            <p className="text-sm">Select a tenant</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100"><Building2 size={28} className="text-slate-400" /></div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge label={selected.kind} tone={selected.kind === "shipper" ? "blue" : "teal"} />
                    <Badge label={selected.status} tone={selected.status === "active" ? "emerald" : "red"} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                  <p className="font-mono text-sm text-slate-400">{selected.slug}</p>
                </div>
              </div>
              <Button
                variant={selected.status === "active" ? "danger" : "secondary"}
                size="sm"
                onClick={() => setConfirmSuspend(selected)}>
                {selected.status === "active" ? <><Ban size={13} /> Suspend</> : <><CheckCircle2 size={13} /> Reinstate</>}
              </Button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
              <Stat label="Members"     value={String(selected.memberCount)} />
              <Stat label="Loads"       value={String(selected.loadCount)} />
              <Stat label="Shipments"   value={String(selected.shipmentCount)} />
              <Stat label="Total Billed" value={formatCurrency(selected.invoiceTotal)} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Member since</p>
              <p className="text-sm font-semibold text-slate-800">{formatDate(selected.createdAt)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Suspend confirm */}
      <Modal open={!!confirmSuspend} onClose={() => setConfirmSuspend(null)}
        title={confirmSuspend?.status === "active" ? "Suspend Tenant?" : "Reinstate Tenant?"}>
        <p className="text-sm text-slate-600 mb-5">
          {confirmSuspend?.status === "active"
            ? `Suspending ${confirmSuspend?.name} will block all logins and API access for their users.`
            : `Reinstating ${confirmSuspend?.name} will restore all access.`}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmSuspend(null)}>Cancel</Button>
          <Button variant={confirmSuspend?.status === "active" ? "danger" : "primary"}
            onClick={() => confirmSuspend && toggleStatus(confirmSuspend)}>
            {confirmSuspend?.status === "active" ? "Suspend" : "Reinstate"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
