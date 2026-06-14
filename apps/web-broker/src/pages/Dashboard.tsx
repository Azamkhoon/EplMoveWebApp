import { AlertTriangle, CheckCircle2, Clock, FileText, TrendingUp, type LucideIcon } from "lucide-react";
import { cn, formatCurrency, formatDate, relativeTime } from "@/lib/utils";
import { DECLARATIONS, SHIPMENTS_PENDING } from "@/data/mock";
import type { Declaration } from "@/types";

const STATUS_COLORS: Record<Declaration["status"], string> = {
  draft:         "bg-slate-100 text-slate-600",
  submitted:     "bg-blue-100 text-blue-700",
  under_review:  "bg-amber-100 text-amber-700",
  docs_requested:"bg-orange-100 text-orange-700",
  approved:      "bg-emerald-100 text-emerald-700",
  released:      "bg-teal-100 text-teal-700",
  rejected:      "bg-red-100 text-red-700",
  closed:        "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<Declaration["status"], string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  docs_requested: "Docs Requested", approved: "Approved", released: "Released",
  rejected: "Rejected", closed: "Closed",
};

const REVENUE_MONTHS = [
  { month: "Jan", value: 48000 }, { month: "Feb", value: 52000 },
  { month: "Mar", value: 61000 }, { month: "Apr", value: 55000 },
  { month: "May", value: 73000 }, { month: "Jun", value: 69000 },
];

const ALERTS = [
  { id: 1, level: "urgent",  text: "DEC-2026-0039 — docs requested deadline in 2 hours",   time: "08:42" },
  { id: 2, level: "warn",    text: "DEC-2026-0041 — Bill of Lading still unverified",        time: "09:15" },
  { id: 3, level: "warn",    text: "SHP-0045 arrives tomorrow — clearance not started",      time: "10:02" },
  { id: 4, level: "info",    text: "DEC-2026-0040 export approved — goods cleared for AE",   time: "11:30" },
];

export function Dashboard() {
  const pending      = DECLARATIONS.filter((d) => ["submitted","under_review","docs_requested"].includes(d.status));
  const docsNeeded   = DECLARATIONS.filter((d) => d.status === "docs_requested");
  const approved     = DECLARATIONS.filter((d) => ["approved","released"].includes(d.status));
  const dueSoon      = DECLARATIONS.filter((d) => d.deadline && new Date(d.deadline) <= new Date("2026-06-16"));
  const maxRev       = Math.max(...REVENUE_MONTHS.map((m) => m.value));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={FileText} iconCls="text-blue-600 bg-blue-50" label="Pending Review" value={pending.length} sub="declarations" />
        <KpiCard icon={AlertTriangle} iconCls="text-orange-600 bg-orange-50" label="Docs Requested" value={docsNeeded.length} sub="awaiting documents" urgent />
        <KpiCard icon={CheckCircle2} iconCls="text-emerald-600 bg-emerald-50" label="Approved / Released" value={approved.length} sub="this month" />
        <KpiCard icon={Clock} iconCls="text-red-600 bg-red-50" label="Deadline Today" value={dueSoon.length} sub="declarations" urgent={dueSoon.length > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active declarations */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">Active Declarations</h2>
            <a href="/declarations" className="text-xs font-medium text-teal-600 hover:underline">View all</a>
          </div>
          <div className="divide-y divide-slate-50">
            {DECLARATIONS.filter((d) => !["closed","released"].includes(d.status)).map((dec) => (
              <div key={dec.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-700">{dec.reference}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", STATUS_COLORS[dec.status])}>
                      {STATUS_LABEL[dec.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {dec.clientName} · {dec.origin} → {dec.destination} · {dec.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-800">{formatCurrency(dec.totalValue, dec.currency)}</p>
                  {dec.deadline && (
                    <p className={cn("text-xs", new Date(dec.deadline) <= new Date("2026-06-14") ? "text-red-600 font-medium" : "text-slate-400")}>
                      Due {formatDate(dec.deadline)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Alerts */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-800">Alerts</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {ALERTS.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", a.level === "urgent" ? "bg-red-500" : a.level === "warn" ? "bg-amber-400" : "bg-teal-400")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-700">{a.text}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{a.time} today</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue mini chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="font-semibold text-slate-800">Revenue</h2>
              <TrendingUp size={14} className="text-teal-500" />
            </div>
            <p className="mb-4 text-2xl font-bold text-slate-900">{formatCurrency(69000, "USD")}</p>
            <div className="flex items-end gap-1.5 h-24">
              {REVENUE_MONTHS.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn("w-full rounded-t-sm", m.month === "Jun" ? "bg-teal-500" : "bg-slate-200")}
                    style={{ height: `${(m.value / maxRev) * 80}px` }}
                  />
                  <span className="text-[9px] text-slate-400">{m.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Incoming shipments */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Incoming Shipments Awaiting Clearance</h2>
          <a href="/shipments" className="text-xs font-medium text-teal-600 hover:underline">View all</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Ref", "Client", "Route", "Mode", "Cargo", "Value", "ETA", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {SHIPMENTS_PENDING.map((s) => (
                <tr key={s.ref} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{s.ref}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{s.client}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{s.origin} → {s.dest}</td>
                  <td className="px-5 py-3"><ModeChip mode={s.mode} /></td>
                  <td className="px-5 py-3 text-xs text-slate-600">{s.cargo}</td>
                  <td className="px-5 py-3 text-xs font-semibold text-slate-800">{formatCurrency(s.value, "USD")}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{formatDate(s.eta)}</td>
                  <td className="px-5 py-3">
                    <button className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700">
                      Start clearance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, iconCls, label, value, sub, urgent }: {
  icon: LucideIcon;
  iconCls: string; label: string; value: number; sub: string; urgent?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-white p-5", urgent && value > 0 ? "border-red-200" : "border-slate-200")}>
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", iconCls)}>
        <Icon size={20} />
      </div>
      <p className={cn("text-3xl font-bold", urgent && value > 0 ? "text-red-600" : "text-slate-900")}>{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-700">{label}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function ModeChip({ mode }: { mode: string }) {
  const cls = mode === "Air" ? "bg-sky-100 text-sky-700" : "bg-blue-100 text-blue-700";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", cls)}>{mode}</span>;
}
