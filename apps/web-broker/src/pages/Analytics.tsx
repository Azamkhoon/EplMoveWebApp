import { TrendingUp, BarChart3, CheckCircle2, Clock, Download, type LucideIcon } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { DECLARATIONS, CLIENTS } from "@/data/mock";
import { useI18n } from "@/i18n/LanguageContext";

const MONTHLY = [
  { month: "Jan", declarations: 14, cleared: 13, revenue: 48000 },
  { month: "Feb", declarations: 17, cleared: 16, revenue: 52000 },
  { month: "Mar", declarations: 22, cleared: 20, revenue: 61000 },
  { month: "Apr", declarations: 18, cleared: 17, revenue: 55000 },
  { month: "May", declarations: 25, cleared: 24, revenue: 73000 },
  { month: "Jun", declarations: 21, cleared: 18, revenue: 69000 },
];

const DEC_BY_TYPE = [
  { label: "Import",      value: 5, color: "bg-blue-500"   },
  { label: "Export",      value: 2, color: "bg-emerald-500" },
  { label: "Transit",     value: 1, color: "bg-violet-500"  },
];

const DECLARANT_PERF = [
  { name: "Sara Mitchell",          processed: 38, cleared: 36, avgDays: 2.1, revenue: 84000 },
  { name: "John Farrer",            processed: 29, cleared: 27, avgDays: 2.8, revenue: 64000 },
  { name: "Karolina Wiśniewska",    processed: 24, cleared: 22, avgDays: 3.2, revenue: 52000 },
];

const CLIENT_REVENUE = CLIENTS.map((c) => ({
  name:     c.name,
  count:    c.declarationCount,
  revenue:  c.declarationCount * 2800,
})).sort((a, b) => b.revenue - a.revenue);

export function Analytics() {
  const { t } = useI18n();
  const totalDeclarations = MONTHLY.reduce((s, m) => s + m.declarations, 0);
  const totalCleared      = MONTHLY.reduce((s, m) => s + m.cleared, 0);
  const totalRevenue      = MONTHLY.reduce((s, m) => s + m.revenue, 0);
  const clearanceRate     = Math.round((totalCleared / totalDeclarations) * 100);

  const maxDecl  = Math.max(...MONTHLY.map((m) => m.declarations));
  const maxRev   = Math.max(...MONTHLY.map((m) => m.revenue));
  const totalType = DEC_BY_TYPE.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={BarChart3} cls="text-blue-600 bg-blue-50" label={t("analytics.declarationsProcessed")} value={String(totalDeclarations)} />
        <KpiCard icon={CheckCircle2} cls="text-emerald-600 bg-emerald-50" label={t("dashboard.clearanceRate")} value={`${clearanceRate}%`} />
        <KpiCard icon={Clock} cls="text-amber-600 bg-amber-50" label={t("analytics.clearanceTime")} value="2.6" />
        <KpiCard icon={TrendingUp} cls="text-teal-600 bg-teal-50" label={t("analytics.monthlyRevenue")} value={formatCurrency(totalRevenue, "USD")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly bar chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">{t("analytics.volume")} &amp; {t("analytics.monthlyRevenue")}</h2>
              <p className="text-xs text-slate-400">Jan–Jun 2026</p>
            </div>
            <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Download size={12} /> {t("common.view")}
            </button>
          </div>
          <div className="flex items-end gap-3 h-40">
            {MONTHLY.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex flex-col items-center gap-0.5 w-full">
                  {/* Revenue bar */}
                  <div className="relative w-full group">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap z-10">
                      {formatCurrency(m.revenue, "USD")}
                    </div>
                    <div className="w-full rounded-t bg-teal-100"
                      style={{ height: `${(m.revenue / maxRev) * 90}px` }} />
                  </div>
                </div>
                {/* Declarations bar overlay */}
                <div className="w-full flex items-end justify-center gap-1">
                  <div className="flex-1 rounded-t bg-blue-400"
                    style={{ height: `${(m.cleared / maxDecl) * 50}px` }} />
                  <div className="flex-1 rounded-t bg-slate-200"
                    style={{ height: `${((m.declarations - m.cleared) / maxDecl) * 50}px` }} />
                </div>
                <span className="text-[10px] text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <LegendItem color="bg-teal-100" label={t("dashboard.revenue")} />
            <LegendItem color="bg-blue-400" label={t("status.cleared")} />
            <LegendItem color="bg-slate-200" label={`${t("status.pending")} / ${t("status.rejected")}`} />
          </div>
        </div>

        {/* Declaration by type donut */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">{t("analytics.byType")}</h2>
          <div className="flex items-center justify-center mb-5">
            <DonutChart segments={DEC_BY_TYPE.map((d) => ({ value: d.value, color: d.color.replace("bg-","") }))} total={totalType} />
          </div>
          <div className="space-y-2">
            {DEC_BY_TYPE.map((d) => (
              <div key={d.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", d.color)} />
                  <span className="text-xs text-slate-600">{d.label}</span>
                </div>
                <span className="text-xs font-semibold text-slate-800">
                  {d.value} ({Math.round(d.value / totalType * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Declarant performance */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">{t("analytics.performance")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Declarant","Processed","Cleared","Success Rate","Avg Days","Revenue Generated"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {DECLARANT_PERF.map((d) => {
                const rate = Math.round(d.cleared / d.processed * 100);
                return (
                  <tr key={d.name} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">{d.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">{d.processed}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">{d.cleared}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-teal-700">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">{d.avgDays} days</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">{formatCurrency(d.revenue, "USD")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client revenue */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">{t("analytics.topClients")}</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {CLIENT_REVENUE.map((c) => {
            const maxRev2 = Math.max(...CLIENT_REVENUE.map((x) => x.revenue));
            return (
              <div key={c.name} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-700 truncate">{c.name}</span>
                    <span className="ml-4 shrink-0 text-sm font-bold text-slate-900">{formatCurrency(c.revenue, "USD")}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-teal-400" style={{ width: `${(c.revenue / maxRev2) * 100}%` }} />
                  </div>
                </div>
                <div className="shrink-0 text-xs text-slate-400">{c.count} decl.</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, cls, label, value }: {
  icon: LucideIcon; cls: string; label: string; value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", cls)}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-2.5 w-4 rounded-sm", color)} />
      <span>{label}</span>
    </div>
  );
}

function DonutChart({ segments, total }: { segments: { value: number; color: string }[]; total: number }) {
  const r = 46; const cx = 60; const cy = 60; const stroke = 20;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {segments.map((s, i) => {
        const dash = (s.value / total) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={`var(--color-${s.color})`}
            style={{ stroke: getColor(s.color) }}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={18} fontWeight="700" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="#94a3b8">TOTAL</text>
    </svg>
  );
}

function getColor(cls: string): string {
  const map: Record<string,string> = {
    "blue-500":    "#3b82f6",
    "emerald-500": "#10b981",
    "violet-500":  "#8b5cf6",
  };
  return map[cls] ?? "#94a3b8";
}
