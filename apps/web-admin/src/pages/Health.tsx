import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, type LucideIcon } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { SERVICE_HEALTH, type ServiceHealth } from "@/data/mock";
import { useI18n } from "@/i18n/LanguageContext";

export function Health() {
  const { t } = useI18n();
  const [services, setServices] = useState<ServiceHealth[]>(SERVICE_HEALTH);
  const [refreshing, setRefreshing] = useState(false);

  const up       = services.filter((s) => s.status === "up").length;
  const degraded = services.filter((s) => s.status === "degraded").length;
  const down     = services.filter((s) => s.status === "down").length;

  function refresh() {
    setRefreshing(true);
    setTimeout(() => {
      // Simulate a check clearing the degraded status
      setServices((p) => p.map((s) => s.status === "degraded" ? { ...s, latencyMs: 18, status: "up" as const } : s));
      setRefreshing(false);
    }, 1200);
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard icon={CheckCircle2} cls="bg-emerald-50 text-emerald-600 border-emerald-200" label={t("status.operational")}  value={up} />
        <SummaryCard icon={AlertTriangle}cls="bg-amber-50 text-amber-600 border-amber-200"       label={t("status.degraded")} value={degraded} />
        <SummaryCard icon={XCircle}      cls="bg-red-50 text-red-600 border-red-200"             label={t("status.down")}     value={down} />
      </div>

      {/* Banner if degraded */}
      {degraded > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{t("page.health.title")}: {t("status.degraded")}</p>
            <p className="text-xs text-amber-700">
              {services.filter((s) => s.status === "degraded").map((s) => s.name).join(", ")} — elevated latency. Investigate before next deploy.
            </p>
          </div>
          <button onClick={refresh} disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? t("common.loading") : t("health.lastChecked")}
          </button>
        </div>
      )}

      {/* Service grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div key={s.name} className={cn("rounded-xl border bg-white p-5",
            s.status === "up" ? "border-slate-200" : s.status === "degraded" ? "border-amber-200" : "border-red-200")}>
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-semibold text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400">:{s.port}</p>
              </div>
              <StatusPill status={s.status} />
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <Metric label={t("health.latency")} value={`${s.latencyMs}ms`} warn={s.latencyMs > 100} />
              <Metric label={t("health.uptime")}  value={`${s.uptimePct}%`}  warn={s.uptimePct < 99} />
              <Metric label={t("health.lastChecked")} value={formatDateTime(s.lastChecked).split(",")[1]?.trim() ?? "—"} />
            </div>

            {/* Uptime bar */}
            <div className="h-1.5 w-full rounded-full bg-slate-100">
              <div className={cn("h-1.5 rounded-full transition-all",
                s.uptimePct >= 99.9 ? "bg-emerald-400" : s.uptimePct >= 99 ? "bg-amber-400" : "bg-red-400")}
                style={{ width: `${s.uptimePct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ServiceHealth["status"] }) {
  const { t } = useI18n();
  const cfg = {
    up:       { cls: "bg-emerald-100 text-emerald-700", label: t("status.operational"), icon: <CheckCircle2 size={11} /> },
    degraded: { cls: "bg-amber-100 text-amber-700",     label: t("status.degraded"), icon: <AlertTriangle size={11} /> },
    down:     { cls: "bg-red-100 text-red-700",         label: t("status.down"), icon: <XCircle size={11} /> },
  }[status];
  return (
    <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", cfg.cls)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className={cn("text-sm font-bold", warn ? "text-amber-600" : "text-slate-800")}>{value}</p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  );
}

function SummaryCard({ icon: Icon, cls, label, value }: {
  icon: LucideIcon; cls: string; label: string; value: number;
}) {
  return (
    <div className={cn("flex items-center gap-4 rounded-xl border bg-white p-5", cls.split(" ")[2])}>
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", cls.split(" ").slice(0,2).join(" "))}><Icon size={24} /></div>
      <div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
}
