import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Clock,
  Gavel,
  Ship,
  Store,
  Truck,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Misc";
import { api } from "@/api/client";
import type { CarrierBid, MarketplaceQuote } from "@epl/sdk";
import { formatCurrency, relativeTime } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

// ── Mock fleet/dispatch data ──────────────────────────────────────────────────
const MOCK_VEHICLES = [
  { id: "V-001", plate: "TX-4821", type: "Ocean Container", status: "active" as const },
  { id: "V-002", plate: "CA-9034", type: "Truck 40t", status: "active" as const },
  { id: "V-003", plate: "FL-2210", type: "Reefer", status: "maintenance" as const },
  { id: "V-004", plate: "NY-7753", type: "Rail Wagon", status: "idle" as const },
  { id: "V-005", plate: "TX-6612", type: "Air Cargo", status: "active" as const },
];

const MOCK_DRIVERS = [
  { id: "D-001", name: "Marcus Webb", status: "driving" as const, route: "Shanghai → LA" },
  { id: "D-002", name: "Elena Sorokina", status: "available" as const, route: null },
  { id: "D-003", name: "Tariq Al-Rashid", status: "resting" as const, route: "Houston → Miami" },
  { id: "D-004", name: "Jin Soo Park", status: "driving" as const, route: "Rotterdam → Hamburg" },
  { id: "D-005", name: "Amara Diallo", status: "available" as const, route: null },
];

const MOCK_DISPATCH = [
  { ref: "SHP-0041", driver: "Marcus Webb", origin: "Shanghai", dest: "Los Angeles", eta: "Jun 18", status: "in_transit" as const, delayed: false },
  { ref: "SHP-0039", driver: "Jin Soo Park", origin: "Rotterdam", dest: "Hamburg", eta: "Jun 14", status: "in_transit" as const, delayed: true },
  { ref: "SHP-0038", driver: "Tariq Al-Rashid", origin: "Houston", dest: "Miami", eta: "Jun 15", status: "pickup_scheduled" as const, delayed: false },
  { ref: "SHP-0036", driver: "—", origin: "Dubai", dest: "Singapore", eta: "Jun 20", status: "pending_assign" as const, delayed: false },
];

const STATUS_CHIP: Record<string, { label: string; tone: "blue" | "amber" | "green" | "red" | "slate" }> = {
  in_transit:        { label: "In Transit",        tone: "blue"  },
  pickup_scheduled:  { label: "Pickup Scheduled",  tone: "amber" },
  pending_assign:    { label: "Pending Driver",    tone: "slate" },
  delivered:         { label: "Delivered",         tone: "green" },
};

const DRIVER_STATUS: Record<string, { label: string; color: string }> = {
  driving:   { label: "Driving",   color: "bg-blue-500"    },
  available: { label: "Available", color: "bg-emerald-500" },
  resting:   { label: "Resting",   color: "bg-amber-500"   },
  assigned:  { label: "Assigned",  color: "bg-indigo-500"  },
  inactive:  { label: "Inactive",  color: "bg-slate-400"   },
};

export function Dashboard() {
  const { t } = useI18n();
  const [open, setOpen] = useState<MarketplaceQuote[]>([]);
  const [bids, setBids] = useState<CarrierBid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    Promise.all([api.listOpenQuotes(), api.listMyBids()])
      .then(([q, b]) => { setOpen(q); setBids(b); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const pending  = bids.filter((b) => b.status === "submitted");
  const won      = bids.filter((b) => b.status === "accepted");
  const decided  = bids.filter((b) => b.status === "accepted" || b.status === "rejected");
  const winRate  = decided.length ? Math.round((won.length / decided.length) * 100) : 0;
  const revenue  = won.reduce((s, b) => s + b.price.amount, 0);
  const activeV  = MOCK_VEHICLES.filter((v) => v.status === "active").length;
  const utilPct  = Math.round((activeV / MOCK_VEHICLES.length) * 100);
  const availD   = MOCK_DRIVERS.filter((d) => d.status === "available").length;
  const delayed  = MOCK_DISPATCH.filter((d) => d.delayed).length;

  return (
    <div className="space-y-6">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label={t("dashboard.openLoads")} value={open.length} icon={<Store size={18} />} accent="brand" hint={t("dashboard.marketplaceNow")} />
        <StatCard label={t("dashboard.pendingBids")} value={pending.length} icon={<Gavel size={18} />} accent="amber" hint={t("dashboard.awaitingDecision")} />
        <StatCard label={t("dashboard.loadsWon")} value={won.length} icon={<Trophy size={18} />} accent="emerald" hint={`${winRate}% ${t("dashboard.winRate")}`} />
        <StatCard label={t("dashboard.wonRevenue")} value={revenue} icon={<CircleDollarSign size={18} />} accent="navy"
          format={(n) => formatCurrency(n)} hint={t("dashboard.acceptedBids")} />
      </div>

      {/* ── Fleet + Driver Utilisation ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Fleet util */}
        <Card className="col-span-1">
          <CardHeader title={t("dashboard.fleetUtilisation")} subtitle={`${activeV}/${MOCK_VEHICLES.length} ${t("dashboard.vehiclesActive")}`} />
          <CardBody className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{utilPct}%</span>
              <Truck size={20} className="text-slate-300" />
            </div>
            <ProgressBar value={utilPct} tone={utilPct > 70 ? "emerald" : utilPct > 40 ? "brand" : "amber"} />
            <div className="space-y-1.5 pt-1">
              {MOCK_VEHICLES.map((v) => (
                <div key={v.id} className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    v.status === "active" ? "bg-emerald-500" : v.status === "maintenance" ? "bg-red-400" : "bg-slate-300"
                  )} />
                  <span className="flex-1 truncate text-slate-600">{v.plate} · {v.type}</span>
                  <span className="capitalize text-slate-400">{v.status === "idle" ? t("common.inactive") : t(`common.${v.status}`)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Driver roster */}
        <Card className="col-span-1">
          <CardHeader title={t("dashboard.driverRoster")} subtitle={`${availD} ${t("dashboard.availableNow")}`} />
          <CardBody className="space-y-2">
            {MOCK_DRIVERS.map((d) => {
              const s = DRIVER_STATUS[d.status];
              return (
                <div key={d.id} className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{d.name}</p>
                    {d.route && <p className="truncate text-xs text-slate-400">{d.route}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{t(`status.${d.status}`)}</span>
                </div>
              );
            })}
            <Link to="/drivers" className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              {t("dashboard.manageDrivers")} <ArrowRight size={12} />
            </Link>
          </CardBody>
        </Card>

        {/* Alerts */}
        <Card className="col-span-1">
          <CardHeader title={t("dashboard.alerts")} subtitle={t("dashboard.attention")} />
          <CardBody className="space-y-3">
            {delayed > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-50 px-3 py-2.5 ring-1 ring-red-200">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-700">{delayed} {t("dashboard.delayedShipment")}</p>
                  <p className="text-xs text-red-500">SHP-0039 is behind schedule</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
              <Clock size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-700">1 {t("dashboard.unassignedLoad")}</p>
                <p className="text-xs text-amber-500">SHP-0036 {t("dashboard.needsDriver")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
              <Truck size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">V-003 {t("dashboard.inMaintenance")}</p>
                <p className="text-xs text-slate-400">FL-2210 Reefer — due Jun 16</p>
              </div>
            </div>
            <Link to="/dispatch" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              View dispatch board <ArrowRight size={12} />
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* ── Dispatch feed + Marketplace feed ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={t("common.shipments")}
            subtitle={t("page.dispatch.subtitle")}
            action={<Link to="/dispatch"><Button variant="outline" size="sm">{t("nav.dispatch")} <ArrowRight size={14} /></Button></Link>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 font-medium">Ref</th>
                  <th className="px-4 py-2.5 font-medium">Route</th>
                  <th className="px-4 py-2.5 font-medium">ETA</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {MOCK_DISPATCH.map((s) => {
                  const chip = STATUS_CHIP[s.status] ?? { label: s.status, tone: "slate" as const };
                  return (
                    <tr key={s.ref} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          {s.ref}
                          {s.delayed && <AlertTriangle size={13} className="text-red-400" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.origin} → {s.dest}</td>
                      <td className="px-4 py-3 text-slate-500">{s.eta}</td>
                      <td className="px-4 py-3">
                        <Badge tone={chip.tone}>{chip.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t("dashboard.openMarketplace")}
            subtitle={t("page.marketplace.subtitle")}
            action={<Link to="/marketplace"><Button variant="outline" size="sm">{t("common.all")} <ArrowRight size={14} /></Button></Link>}
          />
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">{t("common.loading")}</div>
          ) : open.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">{t("market.noLoads")}</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {open.slice(0, 6).map((q) => (
                <Link key={q.id} to="/marketplace" className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{q.reference}</p>
                    <p className="text-xs text-slate-400">
                      {q.mode} · {q.bidCount} bid{q.bidCount === 1 ? "" : "s"} · {relativeTime(q.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {q.myBidCount > 0 && <Badge tone="blue">Your bid in</Badge>}
                    <span className="text-sm font-medium text-slate-700">
                      {q.bestPrice != null ? formatCurrency(q.bestPrice) : "no bids"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Bid outcomes ── */}
      <Card>
        <CardHeader
          title={t("nav.bids")}
          subtitle={t("page.bids.subtitle")}
          action={<Link to="/bids"><Button variant="outline" size="sm">{t("common.all")} <ArrowRight size={14} /></Button></Link>}
        />
        {bids.length === 0 && !loading ? (
          <div className="py-10 text-center text-sm text-slate-400">{t("bids.marketHint")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 font-medium">Reference</th>
                  <th className="px-4 py-2.5 font-medium">Mode</th>
                  <th className="px-4 py-2.5 font-medium">Transit</th>
                  <th className="px-4 py-2.5 font-medium text-right">Rate</th>
                  <th className="px-4 py-2.5 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bids.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{b.reference}</td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{b.mode}</span></td>
                    <td className="px-4 py-3 text-slate-500">{b.transitDays}d</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(b.price.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={b.status === "accepted" ? "green" : b.status === "rejected" ? "slate" : "amber"}>
                        {b.status === "accepted" ? "Won" : b.status === "rejected" ? "Lost" : "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
