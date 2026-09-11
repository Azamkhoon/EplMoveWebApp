import { Activity, Building2, DollarSign, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { TENANTS, SHIPMENTS, INVOICES, SERVICE_HEALTH, AUDIT_LOG } from "@/data/mock";
import { useI18n } from "@/i18n/LanguageContext";

const MONTHLY = [
  { month: "Jan", tenants: 2,  shipments: 8,  revenue: 28000  },
  { month: "Feb", tenants: 3,  shipments: 14, revenue: 54000  },
  { month: "Mar", tenants: 2,  shipments: 19, revenue: 78000  },
  { month: "Apr", tenants: 2,  shipments: 22, revenue: 91000  },
  { month: "May", tenants: 2,  shipments: 28, revenue: 118000 },
  { month: "Jun", tenants: 1,  shipments: 21, revenue: 97000  },
];

export function Overview() {
  const { t } = useI18n();
  const activeTenants  = TENANTS.filter((t) => t.status === "active").length;
  const totalRevenue   = INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const activeShipments= SHIPMENTS.filter((s) => s.status === "in_transit" || s.status === "at_customs").length;
  const degraded       = SERVICE_HEALTH.filter((s) => s.status !== "up").length;

  const maxRev = Math.max(...MONTHLY.map((m) => m.revenue));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Building2} cls="bg-blue-50 text-blue-600" label={t("overview.tenants")} value={String(activeTenants)} sub={`${TENANTS.length} ${t("nav.tenants").toLocaleLowerCase()}`} />
        <KpiCard icon={Package} cls="bg-violet-50 text-violet-600" label={t("overview.shipments")} value={String(activeShipments)} sub={t("overview.inTransit")} />
        <KpiCard icon={DollarSign} cls="bg-emerald-50 text-emerald-600" label={t("overview.revenue")} value={formatCurrency(totalRevenue)} sub={t("overview.thisMonth")} />
        <KpiCard icon={Activity}    cls={degraded > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}
          label={t("overview.health")} value={degraded > 0 ? `${degraded} ${t("status.degraded")}` : t("overview.allOperational")}
          sub={`12 ${t("overview.servicesOnline")}`} urgent={degraded > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">{t("overview.revenue")}</h2>
              <p className="text-xs text-slate-400">{t("analytics.revenue")}</p>
            </div>
            <TrendingUp size={16} className="text-brand-500" />
          </div>
          <div className="flex h-36 items-end gap-2">
            {MONTHLY.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative w-full group">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap z-10">
                    {formatCurrency(m.revenue)}
                  </div>
                  <div className={cn("w-full rounded-t-sm", m.month === "Jun" ? "bg-brand-500" : "bg-slate-200")}
                    style={{ height: `${(m.revenue / maxRev) * 110}px` }} />
                </div>
                <span className="text-[10px] text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Service health summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">{t("page.health.title")}</h2>
          <div className="space-y-2">
            {SERVICE_HEALTH.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full",
                    s.status === "up" ? "bg-emerald-400" : s.status === "degraded" ? "bg-amber-400" : "bg-red-500")} />
                  <span className="truncate text-xs font-medium text-slate-700">{s.name}</span>
                </div>
                <span className={cn("shrink-0 text-xs font-semibold",
                  s.status === "up" ? "text-slate-400" : s.status === "degraded" ? "text-amber-600" : "text-red-600")}>
                  {s.status === "up" ? `${s.latencyMs}ms` : s.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tenant mix + recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tenant table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">{t("nav.tenants")}</h2>
            <a href="/tenants" className="text-xs font-medium text-brand-600 hover:underline">{t("common.view")} {t("common.all").toLocaleLowerCase()}</a>
          </div>
          <div className="divide-y divide-slate-50">
            {TENANTS.slice(0, 6).map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", tenant.status === "active" ? "bg-emerald-400" : "bg-red-400")} />
                    <span className="truncate text-sm font-medium text-slate-800">{tenant.name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400 capitalize">{tenant.kind} · {tenant.memberCount} member{tenant.memberCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-800">{formatCurrency(tenant.invoiceTotal)}</p>
                  <p className="text-[10px] text-slate-400">{tenant.shipmentCount} {t("nav.shipments").toLocaleLowerCase()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit feed */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">{t("overview.activity")}</h2>
            <a href="/audit" className="text-xs font-medium text-brand-600 hover:underline">{t("overview.viewAudit")}</a>
          </div>
          <div className="divide-y divide-slate-50">
            {AUDIT_LOG.slice(0, 6).map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-700">{a.action}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400 truncate">{a.actor} · {a.detail}</p>
                  </div>
                  <p className="shrink-0 text-[10px] text-slate-400">{formatDateTime(a.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert banner if suspended tenants */}
      {TENANTS.some((t) => t.status === "suspended") && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {TENANTS.filter((t) => t.status === "suspended").length} suspended tenant{TENANTS.filter((t) => t.status === "suspended").length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-amber-700">{TENANTS.filter((t) => t.status === "suspended").map((t) => t.name).join(", ")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, cls, label, value, sub, urgent }: {
  icon: LucideIcon; cls: string; label: string; value: string; sub: string; urgent?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-white p-5", urgent ? "border-amber-200" : "border-slate-200")}>
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", cls)}><Icon size={20} /></div>
      <p className={cn("text-2xl font-bold", urgent ? "text-amber-700" : "text-slate-900")}>{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-700">{label}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}
