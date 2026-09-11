import { useState } from "react";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { INVOICES, TENANTS } from "@/data/mock";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/i18n/LanguageContext";

const STATUS_TONE = { pending: "blue", paid: "emerald", overdue: "red" } as const;

export function Invoices() {
  const { t } = useI18n();
  const [tab, setTab]               = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [tenantFilter, setTenantFilter] = useState("all");

  const visible = INVOICES.filter((i) => {
    if (tab !== "all" && i.status !== tab) return false;
    if (tenantFilter !== "all" && i.tenantId !== tenantFilter) return false;
    return true;
  });

  const collected = INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const pending   = INVOICES.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const overdue   = INVOICES.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard icon={CheckCircle2} cls="text-emerald-600 bg-emerald-50" label={t("status.paid")} value={formatCurrency(collected)} />
        <KpiCard icon={Clock} cls="text-blue-600 bg-blue-50" label={t("status.pending")} value={formatCurrency(pending)} />
        <KpiCard icon={AlertTriangle} cls="text-red-600 bg-red-50" label={t("status.overdue")} value={formatCurrency(overdue)} urgent={overdue > 0} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex gap-1">
          {(["all","pending","paid","overdue"] as const).map((tabValue) => (
            <button key={tabValue} onClick={() => setTab(tabValue)}
              className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                tab === tabValue ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100")}>
              {tabValue === "all" ? t("common.all") : t(`status.${tabValue}`)}
            </button>
          ))}
        </div>
        <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="input-base w-44 text-xs">
          <option value="all">{t("common.all")} {t("nav.tenants").toLocaleLowerCase()}</option>
          {TENANTS.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {[t("invoices.invoice"),t("invoices.tenant"),t("invoices.amount"),t("common.status"),t("invoices.issued"),t("status.paid")].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{inv.number}</td>
                <td className="px-5 py-3 text-xs text-slate-700">{inv.tenantName}</td>
                <td className="px-5 py-3 text-sm font-semibold text-slate-900">{formatCurrency(inv.amount, inv.currency)}</td>
                <td className="px-5 py-3"><Badge label={t(`status.${inv.status}`)} tone={STATUS_TONE[inv.status]} /></td>
                <td className="px-5 py-3 text-xs text-slate-500">{formatDate(inv.issuedAt)}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{inv.paidAt ? formatDate(inv.paidAt) : "—"}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{t("nav.invoices")}: 0</td></tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">{visible.length} {t("nav.invoices").toLocaleLowerCase()}</div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, cls, label, value, urgent }: {
  icon: LucideIcon; cls: string; label: string; value: string; urgent?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-white p-5", urgent ? "border-red-200" : "border-slate-200")}>
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", cls)}><Icon size={20} /></div>
      <p className={cn("text-xl font-bold", urgent ? "text-red-600" : "text-slate-900")}>{value}</p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}
