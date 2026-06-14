import { BarChart3, CheckCircle2, Clock, Gavel, Truck, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Misc";
import { formatCurrency } from "@/lib/utils";

// All data is mock — a real implementation would query a time-series analytics service.

const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 48200, loads: 6  },
  { month: "Feb", revenue: 52400, loads: 7  },
  { month: "Mar", revenue: 61800, loads: 8  },
  { month: "Apr", revenue: 58000, loads: 7  },
  { month: "May", revenue: 74200, loads: 10 },
  { month: "Jun", revenue: 31700, loads: 4  }, // partial
];

const ROUTE_PERF = [
  { route: "Shanghai → LA",      loads: 12, revenue: 87200, onTime: 92, profit: 68 },
  { route: "Rotterdam → Hamburg",loads: 28, revenue: 42000, onTime: 88, profit: 71 },
  { route: "Dubai → Singapore",  loads: 8,  revenue: 61600, onTime: 95, profit: 64 },
  { route: "Houston → Miami",    loads: 34, revenue: 28900, onTime: 97, profit: 58 },
  { route: "Osaka → Sydney",     loads: 6,  revenue: 55200, onTime: 100, profit: 73 },
];

const DRIVER_PERF = [
  { name: "Marcus Webb",     loads: 142, onTime: 94, revenue: 312000, rating: 4.8 },
  { name: "Tariq Al-Rashid", loads: 210, onTime: 91, revenue: 284000, rating: 4.6 },
  { name: "Jin Soo Park",    loads: 167, onTime: 89, revenue: 267000, rating: 4.5 },
  { name: "Elena Sorokina",  loads: 98,  onTime: 97, revenue: 188000, rating: 4.9 },
  { name: "Amara Diallo",    loads: 55,  onTime: 98, revenue: 102000, rating: 5.0 },
];

const maxRev = Math.max(...MONTHLY_REVENUE.map((m) => m.revenue));
const maxLoads = Math.max(...MONTHLY_REVENUE.map((m) => m.loads));

export function Analytics() {
  const totalRevenue  = MONTHLY_REVENUE.reduce((s, m) => s + m.revenue, 0);
  const totalLoads    = MONTHLY_REVENUE.reduce((s, m) => s + m.loads, 0);
  const avgOnTime     = Math.round(ROUTE_PERF.reduce((s, r) => s + r.onTime, 0) / ROUTE_PERF.length);
  const winRate       = 34; // % from bid data

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="YTD Revenue"     value={formatCurrency(totalRevenue)} trend="+18%" up icon={<TrendingUp size={18} />} color="emerald" />
        <KpiCard label="Loads delivered" value={String(totalLoads)}          trend="+12%" up icon={<Truck size={18} />}       color="blue"    />
        <KpiCard label="On-time rate"    value={`${avgOnTime}%`}             trend="+3%"  up icon={<Clock size={18} />}       color="brand"   />
        <KpiCard label="Bid win rate"    value={`${winRate}%`}               trend="-4%"  up={false} icon={<Gavel size={18} />} color="amber" />
      </div>

      {/* Revenue bar chart + Loads */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Monthly revenue" subtitle="Jan – Jun 2026" />
          <CardBody>
            <div className="flex h-44 items-end gap-2">
              {MONTHLY_REVENUE.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">
                    {formatCurrency(m.revenue / 1000, 0)}k
                  </span>
                  <div
                    className="w-full rounded-t-md bg-brand-500 transition-all"
                    style={{ height: `${(m.revenue / maxRev) * 148}px` }}
                  />
                  <span className="text-[10px] text-slate-400">{m.month}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Loads per month" subtitle="Volume trend" />
          <CardBody>
            <div className="flex h-44 items-end gap-2">
              {MONTHLY_REVENUE.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">{m.loads}</span>
                  <div
                    className="w-full rounded-t-md bg-emerald-400 transition-all"
                    style={{ height: `${(m.loads / maxLoads) * 148}px` }}
                  />
                  <span className="text-[10px] text-slate-400">{m.month}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Route profitability */}
      <Card>
        <CardHeader title="Route profitability" subtitle="By origin-destination pair" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium text-right">Loads</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium">On-time</th>
                <th className="px-4 py-3 font-medium">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ROUTE_PERF.map((r) => (
                <tr key={r.route} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{r.route}</td>
                  <td className="px-4 py-3.5 text-right text-slate-600">{r.loads}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900">{formatCurrency(r.revenue)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={r.onTime}
                        tone={r.onTime >= 95 ? "emerald" : r.onTime >= 88 ? "brand" : "amber"}
                        className="w-20"
                      />
                      <span className="text-xs text-slate-600">{r.onTime}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={r.profit} tone="brand" className="w-20" />
                      <span className="text-xs text-slate-600">{r.profit}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Driver performance */}
      <Card>
        <CardHeader title="Driver performance" subtitle="Ranked by on-time delivery rate" />
        <CardBody className="space-y-4">
          {[...DRIVER_PERF].sort((a, b) => b.onTime - a.onTime).map((d, i) => (
            <div key={d.name} className="flex items-center gap-4">
              <span className="w-5 text-center text-sm font-bold text-slate-400">#{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{d.name}</span>
                  <span className="text-xs text-slate-500">
                    {d.loads} loads · {formatCurrency(d.revenue)} · ★ {d.rating}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressBar
                    value={d.onTime}
                    tone={d.onTime >= 95 ? "emerald" : d.onTime >= 88 ? "brand" : "amber"}
                    className="flex-1"
                  />
                  <span className={`text-xs font-semibold ${d.onTime >= 95 ? "text-emerald-600" : d.onTime >= 88 ? "text-brand-600" : "text-amber-600"}`}>
                    {d.onTime}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Fleet utilisation donut-style */}
      <Card>
        <CardHeader title="Fleet utilisation by vehicle type" />
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { type: "Ocean Container", pct: 80, active: 4, total: 5 },
              { type: "Truck",           pct: 60, active: 3, total: 5 },
              { type: "Reefer",          pct: 33, active: 1, total: 3 },
              { type: "Rail Wagon",      pct: 50, active: 2, total: 4 },
              { type: "Air Cargo",       pct: 75, active: 3, total: 4 },
            ].map((v) => (
              <div key={v.type} className="flex flex-col items-center gap-2 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="#3b82f6" strokeWidth="3"
                      strokeDasharray={`${v.pct} ${100 - v.pct}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-sm font-bold text-slate-900">{v.pct}%</span>
                </div>
                <p className="text-xs font-medium text-slate-700">{v.type}</p>
                <p className="text-xs text-slate-400">{v.active}/{v.total} active</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, trend, up, icon, color }: {
  label: string; value: string; trend: string; up: boolean; icon: React.ReactNode;
  color: "emerald" | "blue" | "brand" | "amber";
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue:    "bg-blue-50 text-blue-600",
    brand:   "bg-brand-50 text-brand-600",
    amber:   "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[color]}`}>{icon}</span>
        <span className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {trend}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
