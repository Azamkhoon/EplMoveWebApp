import { useState } from "react";
import { Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SHIPMENTS, TENANTS } from "@/data/mock";
import { Badge } from "@/components/ui/Badge";

const STATUS_TONE: Record<string, "blue" | "amber" | "emerald" | "slate" | "orange"> = {
  booked:      "blue",
  in_transit:  "amber",
  at_customs:  "orange",
  delivered:   "emerald",
  cancelled:   "slate",
};

const MODE_TONE: Record<string, "blue" | "slate"> = {
  Ocean: "blue", Air: "slate", Road: "slate", Rail: "slate",
};

export function Shipments() {
  const [search, setSearch]         = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const visible = SHIPMENTS.filter((s) => {
    if (tenantFilter !== "all" && s.tenantId !== tenantFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.ref.toLowerCase().includes(q) || s.tenantName.toLowerCase().includes(q) ||
        s.carrierName.toLowerCase().includes(q) || s.origin.toLowerCase().includes(q);
    }
    return true;
  });

  const totalValue = visible.reduce((s, x) => s + x.value, 0);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            placeholder="Search ref, tenant, carrier…" value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="input-base w-44 text-xs">
          <option value="all">All tenants</option>
          {TENANTS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-base w-36 text-xs">
          <option value="all">All statuses</option>
          {["booked","in_transit","at_customs","delivered","cancelled"].map((s) => (
            <option key={s} value={s}>{s.replace("_"," ")}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Showing" value={String(visible.length)} sub="shipments" />
        <Stat label="In Transit" value={String(visible.filter((s) => s.status === "in_transit").length)} sub="active" />
        <Stat label="Total Value" value={formatCurrency(totalValue)} sub="cargo value" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {["Ref","Tenant","Route","Mode","Carrier","Value","Status","Date"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{s.ref}</td>
                <td className="px-5 py-3 text-xs text-slate-700">{s.tenantName}</td>
                <td className="px-5 py-3 text-xs text-slate-600">{s.origin.split(",")[0]} → {s.destination.split(",")[0]}</td>
                <td className="px-5 py-3"><Badge label={s.mode} tone={MODE_TONE[s.mode] ?? "slate"} /></td>
                <td className="px-5 py-3 text-xs text-slate-600">{s.carrierName}</td>
                <td className="px-5 py-3 text-xs font-semibold text-slate-800">{formatCurrency(s.value)}</td>
                <td className="px-5 py-3"><Badge label={s.status.replace("_"," ")} tone={STATUS_TONE[s.status] ?? "slate"} /></td>
                <td className="px-5 py-3 text-xs text-slate-400">{formatDate(s.createdAt)}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">No shipments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}
