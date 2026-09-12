import { useState } from "react";
import { Search, Users as UsersIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { MEMBERS, TENANTS } from "@/data/mock";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/i18n/LanguageContext";

const ROLE_TONE: Record<string, "blue" | "teal" | "violet" | "slate"> = {
  shipper_admin:   "blue",
  shipper_member:  "blue",
  shipper_viewer:  "slate",
  carrier_admin:   "teal",
  carrier_member:  "teal",
  platform_admin:  "violet",
};

export function Users() {
  return (
    <section role="status" className="rounded-xl border border-slate-200 bg-white p-8">
      <h1 className="text-lg font-semibold">Users</h1>
      <p className="mt-2 text-slate-600">This feature is not yet connected to live records. Data entry is unavailable until activation is complete.</p>
    </section>
  );
}

export function UsersView() {
  const { t } = useI18n();
  const [search, setSearch]     = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");

  const visible = MEMBERS.filter((m) => {
    if (tenantFilter !== "all" && m.tenantId !== tenantFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.email.toLowerCase().includes(q) || m.tenantName.toLowerCase().includes(q);
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
            placeholder={t("users.search")} value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}
          className="input-base w-52 text-xs">
          <option value="all">{t("common.all")} {t("nav.tenants").toLocaleLowerCase()}</option>
          {TENANTS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t("overview.users"),   value: MEMBERS.length,                                  tone: "slate" },
          { label: `Shipper ${t("nav.users")}`, value: MEMBERS.filter((m) => m.roleKey.startsWith("shipper")).length, tone: "blue"  },
          { label: `Carrier ${t("nav.users")}`, value: MEMBERS.filter((m) => m.roleKey.startsWith("carrier")).length, tone: "teal"  },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
          <UsersIcon size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">{t("common.all")} {t("nav.users")}</span>
          <span className="ml-auto text-xs text-slate-400">{visible.length} {t("nav.users").toLocaleLowerCase()}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {[t("common.email"), t("users.tenant"), t("common.role"), "User ID", t("tenants.joined"), ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 text-sm font-medium text-slate-800">{m.email}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{m.tenantName}</td>
                  <td className="px-5 py-3">
                    <Badge label={m.roleKey.replace(/_/g, " ")} tone={ROLE_TONE[m.roleKey] ?? "slate"} />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{m.userId}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{formatDate(m.createdAt)}</td>
                  <td className="px-5 py-3">
                    <button className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      {t("common.view")}
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{t("nav.users")}: 0</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
