import { TrendingUp, Building2, Package, DollarSign } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { TENANTS, INVOICES } from "@/data/mock";
import { useI18n } from "@/i18n/LanguageContext";

const MONTHLY: { month: string; tenants: number; shipments: number; revenue: number; mrr: number; }[] = [];

const totalTenants     = TENANTS.length;
const activeTenants    = TENANTS.filter((t) => t.status === "active").length;
const totalShipments   = TENANTS.reduce((s, t) => s + t.shipmentCount, 0);
const totalRevenue     = INVOICES.reduce((s, i) => s + i.amount, 0);
const avgRevenuePerTenant = Math.round(totalRevenue / Math.max(1, totalTenants));

const maxRev = Math.max(1, ...MONTHLY.map((m) => m.revenue));
const maxShip = Math.max(1, ...MONTHLY.map((m) => m.shipments));

export function Analytics() {
  return (
    <section role="status" className="rounded-xl border border-slate-200 bg-white p-8">
      <h1 className="text-lg font-semibold">Analytics</h1>
      <p className="mt-2 text-slate-600">This feature is not yet connected to live records. Data entry is unavailable until activation is complete.</p>
    </section>
  );
}

export function AnalyticsView() {
  const { t: tr } = useI18n();
  const tenantsByKind = {
    shipper: TENANTS.filter((t) => t.kind === "shipper").length,
    carrier: TENANTS.filter((t) => t.kind === "carrier").length,
  };
  const topTenants = [...TENANTS].sort((a, b) => b.invoiceTotal - a.invoiceTotal).slice(0, 5);
  const maxInvoice = Math.max(1, ...topTenants.map((t) => t.invoiceTotal));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Building2} cls="bg-blue-50 text-blue-600" label={tr("overview.tenants")} value={String(totalTenants)} sub={`${activeTenants} ${tr("common.active").toLocaleLowerCase()}`} />
        <KpiCard icon={Package} cls="bg-violet-50 text-violet-600" label={tr("overview.shipments")} value={String(totalShipments)} sub={tr("common.all")} />
        <KpiCard icon={DollarSign} cls="bg-emerald-50 text-emerald-600" label={tr("overview.revenue")} value={formatCurrency(totalRevenue)} sub={tr("nav.invoices")} />
        <KpiCard icon={TrendingUp} cls="bg-brand-50 text-brand-600" label={`${tr("overview.revenue")} / ${tr("nav.tenants")}`} value={formatCurrency(avgRevenuePerTenant)} sub={tr("overview.revenue")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue over time */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">{tr("analytics.revenue")}</h2>
          <div className="flex h-32 items-end gap-2">
            {MONTHLY.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div className={cn("w-full rounded-t-sm", m.month === "Jun" ? "bg-brand-500" : "bg-slate-200")}
                  style={{ height: `${(m.revenue / maxRev) * 110}px` }} />
                <span className="text-[10px] text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-400">
            <span>{formatCurrency((MONTHLY[0]?.revenue ?? 0))} Jan</span>
            <span className="font-semibold text-brand-600">{formatCurrency((MONTHLY[5]?.revenue ?? 0))} Jun</span>
          </div>
        </div>

        {/* Shipments over time */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">{tr("analytics.shipments")}</h2>
          <div className="flex h-32 items-end gap-2">
            {MONTHLY.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div className={cn("w-full rounded-t-sm", m.month === "Jun" ? "bg-violet-500" : "bg-slate-200")}
                  style={{ height: `${(m.shipments / maxShip) * 110}px` }} />
                <span className="text-[10px] text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-400">
            <span>{(MONTHLY[0]?.shipments ?? 0)} Jan</span>
            <span className="font-semibold text-violet-600">{(MONTHLY[4]?.shipments ?? 0)} May (peak)</span>
          </div>
        </div>
      </div>

      {/* Tenant mix + top tenants */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">{tr("analytics.tenantMix")}</h2>
          <div className="space-y-3">
            {[
              { label: "Shippers", count: tenantsByKind.shipper, color: "bg-blue-500",   pct: Math.round(tenantsByKind.shipper / Math.max(1, totalTenants) * 100) },
              { label: "Carriers", count: tenantsByKind.carrier, color: "bg-teal-500",   pct: Math.round(tenantsByKind.carrier / Math.max(1, totalTenants) * 100) },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{row.label}</span>
                  <span className="text-slate-500">{row.count} ({row.pct}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className={cn("h-2 rounded-full", row.color)} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xl font-bold text-blue-700">{tenantsByKind.shipper}</p>
              <p className="text-xs text-slate-400">Shippers</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xl font-bold text-teal-700">{tenantsByKind.carrier}</p>
              <p className="text-xs text-slate-400">Carriers</p>
            </div>
          </div>
        </div>

        {/* Top tenants by revenue */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">{tr("analytics.topTenants")}</h2>
          <div className="space-y-3">
            {topTenants.map((t, i) => (
              <div key={t.id} className="flex items-center gap-4">
                <span className="w-4 shrink-0 text-xs font-bold text-slate-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">{t.name}</span>
                    <span className="shrink-0 text-sm font-bold text-slate-900">{formatCurrency(t.invoiceTotal)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div className={cn("h-1.5 rounded-full", t.kind === "shipper" ? "bg-blue-400" : "bg-teal-400")}
                      style={{ width: `${(t.invoiceTotal / maxInvoice) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, cls, label, value, sub }: {
  icon: LucideIcon; cls: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", cls)}><Icon size={20} /></div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-700">{label}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}
