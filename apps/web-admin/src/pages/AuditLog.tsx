import { useState } from "react";
import { Search, Shield } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { AUDIT_LOG, TENANTS } from "@/data/mock";
import { useI18n } from "@/i18n/LanguageContext";

const ACTION_TONE: Record<string, string> = {
  "login":             "bg-slate-100 text-slate-600",
  "bid.submitted":     "bg-blue-100 text-blue-700",
  "bid.accepted":      "bg-emerald-100 text-emerald-700",
  "load.created":      "bg-violet-100 text-violet-700",
  "invoice.paid":      "bg-teal-100 text-teal-700",
  "document.uploaded": "bg-sky-100 text-sky-700",
  "member.invited":    "bg-amber-100 text-amber-700",
  "tenant.suspended":  "bg-red-100 text-red-700",
};

export function AuditLog() {
  const { t } = useI18n();
  const [search, setSearch]         = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");

  const visible = AUDIT_LOG.filter((a) => {
    if (tenantFilter !== "all" && a.tenantName !== TENANTS.find((t) => t.id === tenantFilter)?.name) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.actor.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || a.detail.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            placeholder={t("audit.search")} value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="input-base w-44 text-xs">
          <option value="all">{t("common.all")} {t("nav.tenants").toLocaleLowerCase()}</option>
          {TENANTS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Event feed */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <Shield size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">{t("nav.audit")}</span>
          <span className="ml-auto text-xs text-slate-400">{visible.length}</span>
        </div>
        <div className="divide-y divide-slate-50">
          {visible.map((a) => (
            <div key={a.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60">
              <div className="shrink-0 pt-0.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap", ACTION_TONE[a.action] ?? "bg-slate-100 text-slate-600")}>
                  {a.action}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800">{a.detail}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {a.actor}
                  {a.tenantName !== "—" && <> · <span className="text-slate-500">{a.tenantName}</span></>}
                  {" "} · IP {a.ip}
                </p>
              </div>
              <p className="shrink-0 text-xs text-slate-400 whitespace-nowrap">{formatDateTime(a.ts)}</p>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">{t("nav.audit")}: 0</div>
          )}
        </div>
      </div>
    </div>
  );
}
