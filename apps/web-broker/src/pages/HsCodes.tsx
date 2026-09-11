import { useState } from "react";
import { Search, FileSearch, Info, Star, ShieldCheck, AlertTriangle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HS_CODES } from "@/data/mock";
import type { HsCode } from "@/types";
import { useI18n } from "@/i18n/LanguageContext";

const CHAPTERS = Array.from(new Set(HS_CODES.map((h) => h.chapter))).sort();
// Top Uzbekistan trade items
const FREQ_USED = ["5208.21", "5201.00", "8704.21"];

export function HsCodes() {
  const { t } = useI18n();
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<HsCode | null>(null);
  const [chapter, setChapter]   = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "import" | "export">("all");

  const visible = HS_CODES.filter((h) => {
    if (typeFilter === "export" && h.exportDuty === null) return false;
    if (typeFilter === "import" && h.exportDuty !== null && h.dutyRate === 0 && !h.requiresCert) return false;
    if (chapter !== "all" && h.chapter !== chapter) return false;
    if (search) {
      const q = search.toLowerCase();
      return h.code.includes(q) || h.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Uzbekistan notice */}
      <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
        <Info size={14} className="mt-0.5 shrink-0 text-teal-600" />
        <p className="text-xs text-teal-800">
          HS codes based on the WCO Harmonized System used in Uzbekistan (Presidential Resolution PP-55, Jan 2025).
          Rates reflect MFN tariff. CIS-origin goods (RU/KZ/KG/TJ/BY/AM/MD) may qualify for preferential rates.
          Verify current classifications at <span className="font-semibold">tarif.customs.uz</span>.
        </p>
      </div>

      {/* Frequently used */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Common Uzbekistan Trade Codes</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {HS_CODES.filter((h) => FREQ_USED.includes(h.code)).map((h) => (
            <button key={h.code} onClick={() => setSelected(h)}
              className={cn("rounded-xl border p-4 text-left transition-all hover:border-teal-300 hover:shadow-sm",
                selected?.code === h.code ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white")}>
              <div className="mb-1 flex items-center gap-2">
                <Star size={12} className="text-amber-400" fill="currentColor" />
                <span className="font-mono text-sm font-bold text-slate-800">{h.code}</span>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Ch.{h.chapter}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-slate-600">{h.description}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                <span className={cn("font-semibold", h.dutyRate === 0 ? "text-emerald-600" : "text-slate-600")}>
                  Import {h.dutyRate}%
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">VAT {h.vatRate}%</span>
                {h.cisRate !== null && h.cisRate < h.dutyRate && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="text-emerald-600">CIS {h.cisRate}%</span>
                  </>
                )}
                {h.exportDuty !== null && h.exportDuty > 0 && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="text-red-600 font-semibold">Export {h.exportDuty}%</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Search + browse */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              placeholder={t("hs.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} className="input-base w-32 text-xs">
            <option value="all">{t("common.all")} {t("hs.chapter").toLocaleLowerCase()}</option>
            {CHAPTERS.map((c) => <option key={c} value={c}>Chapter {c}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="input-base w-32 text-xs">
            <option value="all">{t("common.all")}</option>
            <option value="import">{t("duty.importDuty")}</option>
            <option value="export">{t("duty.importDuty")}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {[t("duty.hsCode"),t("hs.description"),t("duty.importDuty"),"CIS",t("duty.excise"),t("duty.importDuty"),t("duty.vat"),"Cert", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map((h) => (
                <tr key={h.code}
                  onClick={() => setSelected(h === selected ? null : h)}
                  className={cn("cursor-pointer transition-colors", selected?.code === h.code ? "bg-teal-50" : "hover:bg-slate-50/60")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {FREQ_USED.includes(h.code) && <Star size={10} className="text-amber-400 shrink-0" fill="currentColor" />}
                      <span className="font-mono text-xs font-bold text-slate-800">{h.code}</span>
                    </div>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-slate-700 leading-snug">{h.description}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-sm font-bold", h.dutyRate === 0 ? "text-emerald-600" : "text-slate-800")}>
                      {h.dutyRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {h.cisRate !== null
                      ? <span className={cn("font-semibold", h.cisRate < h.dutyRate ? "text-emerald-600" : "text-slate-500")}>{h.cisRate}%</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {h.exciseRate !== null
                      ? <span className="font-semibold text-orange-600">{h.exciseRate}%</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {h.exportDuty !== null
                      ? <span className={cn("font-bold", h.exportDuty > 0 ? "text-red-600" : "text-emerald-600")}>{h.exportDuty}%</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">{h.vatRate}%</td>
                  <td className="px-4 py-3">
                    {h.requiresCert
                      ? <ShieldCheck size={14} className="text-amber-500" />
                      : <span className="text-slate-200">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700">
                      {t("hs.select")}
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-slate-400">
                    <FileSearch size={32} className="mx-auto mb-2 opacity-30" />
                    {t("hs.noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
          {visible.length} of {HS_CODES.length} codes · Source: tarif.customs.uz / PP-55 (Jan 2025)
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Info size={16} className="text-teal-600" />
            <h3 className="font-semibold text-teal-900">HS {selected.code} — Uzbekistan Classification Details</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
            <InfoField label={t("hs.chapter")} value={`${selected.chapter} / ${selected.heading}`} />
            <InfoField label={t("duty.importDuty")} value={`${selected.dutyRate}%`} tone={selected.dutyRate === 0 ? "green" : "default"} />
            <InfoField label="CIS Preferential"   value={selected.cisRate !== null ? `${selected.cisRate}%` : "Same as MFN"} tone={selected.cisRate !== null && selected.cisRate < selected.dutyRate ? "green" : "default"} />
            <InfoField label={t("duty.vat")} value={`${selected.vatRate}%`} />
            {selected.exciseRate !== null && (
              <InfoField label={t("duty.excise")} value={`${selected.exciseRate}%`} tone="orange" />
            )}
            {selected.exportDuty !== null && (
              <InfoField label="Export Duty" value={`${selected.exportDuty}%`} tone={selected.exportDuty > 0 ? "red" : "green"} />
            )}
          </div>

          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-600">Full Description</p>
            <p className="mt-0.5 text-sm text-teal-900">{selected.description}</p>
          </div>

          {selected.requiresCert && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Mandatory Certification Required</p>
                <p className="text-xs text-amber-700">{selected.certBody}</p>
              </div>
            </div>
          )}

          {selected.exportDuty !== null && selected.exportDuty > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-600" />
              <p className="text-xs text-red-800">
                <strong>Export duty {selected.exportDuty}%</strong> — restricted export commodity under Uzbekistan trade policy.
              </p>
            </div>
          )}

          {selected.notes && (
            <div className="rounded-lg bg-white border border-teal-100 px-3 py-2.5">
              <p className="text-xs text-slate-700">{selected.notes}</p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-1.5 text-xs text-teal-600">
            <ArrowUpRight size={12} />
            <a href="https://tarif.customs.uz" target="_blank" rel="noreferrer" className="underline hover:text-teal-800">
              Verify on tarif.customs.uz (official Uzbekistan integrated tariff system)
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "green" | "red" | "orange" }) {
  const toneClass = { default: "text-teal-900", green: "text-emerald-700", red: "text-red-700", orange: "text-orange-700" }[tone];
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-600">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold", toneClass)}>{value}</p>
    </div>
  );
}
