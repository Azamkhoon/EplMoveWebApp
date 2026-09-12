import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Clock,
  Truck,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { MapView, type MapMarker, type MapRoute } from "@/components/map/MapView";
import {
  AVG_TRANSIT_DAYS,
  MODE_SPEND,
  MONTHLY_TREND,
  ON_TIME_RATE,
  TOP_LANES,
  WEEKLY_VOLUME,
} from "@/data/analytics";
import { SHIPMENTS } from "@/data/shipments";
import { api, LIVE } from "@/api/client";
import { toViewShipment } from "@/data/live-adapters";
import { useEffect, useState } from "react";
import { formatCompact, formatCurrency, relativeTime } from "@/lib/utils";
import type { Shipment as ViewShipment } from "@/types";
import { useI18n } from "@/i18n/LanguageContext";

const DONUT_COLORS = ["#1d4ed8", "#3b82f6", "#60a9fa", "#93bbfd", "#bfd6fe"];

export function Dashboard() {
  const { lang, t } = useI18n();

  // Live KPIs/activity/map come from real shipments + invoices; the historical
  // trend charts below stay on sample analytics (no time-series service yet).
  const [liveShipments, setLiveShipments] = useState<ViewShipment[] | null>(null);
  const [liveSpend, setLiveSpend] = useState<number | null>(null);

  useEffect(() => {
    if (!LIVE || !api) return;
    api.listShipments().then((list) => setLiveShipments(list.map((shipment) => toViewShipment(shipment)))).catch(() => setLiveShipments([]));
    api.listInvoices().then((inv) => setLiveSpend(inv.reduce((s, i) => s + i.amount.amount, 0))).catch(() => setLiveSpend(0));
  }, []);

  const shipmentsData = liveShipments ?? SHIPMENTS;

  const active = shipmentsData.filter((s) =>
    ["posted", "booked", "in_transit", "delayed"].includes(s.status)
  );
  const inTransit = shipmentsData.filter((s) =>
    ["in_transit", "delayed"].includes(s.status)
  );
  const delivered = shipmentsData.filter((s) => s.status === "delivered");
  const openQuotes = shipmentsData.filter((s) => ["posted", "booked"].includes(s.status));
  const totalSpend = liveSpend ?? shipmentsData.reduce((sum, s) => sum + s.costUsd, 0);

  // Map markers: vehicles for moving shipments, load pins for posted origins
  const markers: MapMarker[] = [];
  const routes: MapRoute[] = [];
  inTransit.forEach((s) => {
    if (s.currentLocation) {
      markers.push({
        point: s.currentLocation,
        kind: "vehicle",
        label: s.reference,
        sublabel: `${s.origin.city} → ${s.destination.city}`,
      });
    }
    routes.push({
      points: s.route,
      progress: s.progress / 100,
      color: s.status === "delayed" ? "#dc2626" : "#1d4ed8",
    });
  });
  openQuotes.forEach((s) => {
    markers.push({
      point: s.origin,
      kind: "load",
      label: s.reference,
      sublabel: `${t("dashboard.awaitingPickup")} · ${s.origin.city}`,
    });
  });

  const activity = [...shipmentsData]
    .flatMap((s) =>
      s.events
        .filter((e) => e.completed)
        .slice(-1)
        .map((e) => ({
          ref: s.reference,
          id: s.id,
          status: s.status,
          text: e.status,
          location: e.location,
          at: e.timestamp,
        }))
    )
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dashboard.active")}
          value={active.length}
          icon={<Boxes size={18} />}
          accent="brand"
          hint={`${openQuotes.length} ${t("dashboard.awaitingCarrier")}`}
        />
        <StatCard
          label={t("dashboard.inTransit")}
          value={inTransit.length}
          icon={<Truck size={18} />}
          accent="amber"
          hint={`${shipmentsData.filter((s) => s.status === "delayed").length} ${t("dashboard.delayed")}`}
        />
        <StatCard
          label={LIVE ? t("shipments.delivered") : t("dashboard.delivered90")}
          value={delivered.length}
          icon={<Clock size={18} />}
          accent="emerald"
          hint={`${ON_TIME_RATE}% ${t("dashboard.onTime")}`}
        />
        <StatCard
          label={t("dashboard.spend")}
          value={totalSpend}
          format={(n) => formatCurrency(n)}
          icon={<CircleDollarSign size={18} />}
          accent="navy"
          hint={t("dashboard.priorPeriod")}
        />
      </div>

      {/* Map + activity */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={t("dashboard.livePositions")}
            subtitle={`${markers.length} ${t("dashboard.loadsOnMap")} · ${inTransit.length} ${t("dashboard.moving")}`}
            action={
              inTransit.length > 0 ? (
                <Link to="/tracking">
                  <Button variant="outline" size="sm">
                    {t("dashboard.openTracking")}
                  </Button>
                </Link>
              ) : undefined
            }
          />
          <div className="p-2">
            <MapView
              markers={markers}
              routes={routes}
              className="h-[380px] w-full"
              zoom={3}
            />
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title={t("dashboard.recentActivity")}
            action={
              <Link
                to="/shipments"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                {t("dashboard.viewAll")}
              </Link>
            }
          />
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto scrollbar-thin">
            {activity.map((a, i) => (
              <Link
                key={i}
                to={`/shipments/${a.id}`}
                className="flex items-start gap-3 px-5 py-3 transition hover:bg-slate-50"
              >
                <span className="mt-0.5">
                  <StatusPill status={a.status} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {a.text}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {a.ref} · {a.location}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {relativeTime(a.at, lang)}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Trend + mode spend */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={t("dashboard.volumeSpend")}
            subtitle={t("dashboard.last6Months")}
            action={
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-brand-500" /> {t("dashboard.shipments")}
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("dashboard.spendShort")}
                </span>
              </div>
            }
          />
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={MONTHLY_TREND} margin={{ left: -8, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gShip" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `$${formatCompact(v)}`}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px -6px rgba(11,26,46,.15)",
                    fontSize: 13,
                  }}
                  formatter={(v: number, n) =>
                    n === "spend"
                      ? [formatCurrency(v), t("dashboard.spendShort")]
                      : [v, t("dashboard.shipments")]
                  }
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="shipments"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#gShip)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="spend"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("dashboard.spendByMode")} subtitle={t("dashboard.costShare")} />
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={MODE_SPEND}
                  dataKey="spend"
                  nameKey="mode"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="none"
                >
                  {MODE_SPEND.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                  }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => (
                    <span style={{ color: "#475569", fontSize: 12 }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Weekly volume + on-time + lanes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title={t("dashboard.weeklyVolume")} subtitle={t("dashboard.inboundOutbound")} />
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={WEEKLY_VOLUME} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
                <Bar dataKey="outbound" fill="#1d4ed8" radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="inbound" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("dashboard.onTimePerformance")} />
          <CardBody className="flex flex-col items-center justify-center">
            <div className="relative flex h-36 w-36 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#eef2f6" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(ON_TIME_RATE / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-2xl font-bold text-slate-900">{ON_TIME_RATE}%</p>
                <p className="text-xs text-slate-500">{t("dashboard.onTime")}</p>
              </div>
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 py-2">
                <p className="text-lg font-bold text-slate-900">{AVG_TRANSIT_DAYS}d</p>
                <p className="text-xs text-slate-500">{t("dashboard.avgTransit")}</p>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <p className="text-lg font-bold text-slate-900">1.2%</p>
                <p className="text-xs text-slate-500">{t("dashboard.exceptionRate")}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t("dashboard.topLanes")}
            subtitle={t("dashboard.byVolume")}
            action={<ArrowUpRight size={16} className="text-slate-300" />}
          />
          <CardBody className="space-y-3.5">
            {TOP_LANES.map((lane) => (
              <div key={lane.lane}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{lane.lane}</span>
                  <span className="text-slate-400">{lane.volume} {t("dashboard.loads")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressBar
                    value={(lane.volume / TOP_LANES[0].volume) * 100}
                    className="flex-1"
                  />
                  <span
                    className={`w-9 text-right text-xs font-semibold ${
                      lane.onTime >= 95
                        ? "text-emerald-600"
                        : lane.onTime >= 90
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {lane.onTime}%
                  </span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
