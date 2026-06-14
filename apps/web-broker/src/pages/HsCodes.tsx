import { useState } from "react";
import { Search, FileSearch, Info, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { HS_CODES } from "@/data/mock";
import type { HsCode } from "@/types";

const CHAPTERS = Array.from(new Set(HS_CODES.map((h) => h.chapter))).sort();
const FREQ_USED = ["8471.30", "8703.23", "8542.31"];

export function HsCodes() {
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<HsCode | null>(null);
  const [chapter, setChapter]   = useState<string>("all");

  const visible = HS_CODES.filter((h) => {
    if (chapter !== "all" && h.chapter !== chapter) return false;
    if (search) {
      const q = search.toLowerCase();
      return h.code.includes(q) || h.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Frequently used */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Frequently Used</h2>
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
              <p className="mt-2 text-[11px] text-slate-400">Duty {h.dutyRate}% · VAT {h.vatRate}%</p>
            </button>
          ))}
        </div>
      </div>

      {/* Search + browse */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              placeholder="Search HS codes or descriptions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} className="input-base w-36 text-xs">
            <option value="all">All chapters</option>
            {CHAPTERS.map((c) => <option key={c} value={c}>Chapter {c}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["HS Code","Description","Chapter","Duty Rate","VAT Rate","Notes",""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map((h) => (
                <tr key={h.code}
                  onClick={() => setSelected(h === selected ? null : h)}
                  className={cn("cursor-pointer transition-colors", selected?.code === h.code ? "bg-teal-50" : "hover:bg-slate-50/60")}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      {FREQ_USED.includes(h.code) && <Star size={10} className="text-amber-400" fill="currentColor" />}
                      <span className="font-mono font-semibold text-slate-800">{h.code}</span>
                    </div>
                  </td>
                  <td className="max-w-xs px-5 py-3 text-xs text-slate-700">{h.description}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">Ch.{h.chapter} / {h.heading}</td>
                  <td className="px-5 py-3">
                    <span className={cn("font-semibold text-sm", h.dutyRate === 0 ? "text-emerald-600" : "text-slate-800")}>
                      {h.dutyRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-700">{h.vatRate}%</td>
                  <td className="px-5 py-3 text-xs text-amber-600">{h.notes ?? "—"}</td>
                  <td className="px-5 py-3">
                    <button className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700">
                      Assign
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                    <FileSearch size={32} className="mx-auto mb-2 opacity-30" />
                    No HS codes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {visible.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
            {visible.length} code{visible.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Info size={16} className="text-teal-600" />
            <h3 className="font-semibold text-teal-900">HS {selected.code} — Classification Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <InfoField label="Heading"     value={selected.heading} />
            <InfoField label="Chapter"     value={selected.chapter} />
            <InfoField label="Duty Rate"   value={`${selected.dutyRate}%`} />
            <InfoField label="VAT Rate"    value={`${selected.vatRate}%`} />
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-600">Full Description</p>
            <p className="mt-0.5 text-sm text-teal-900">{selected.description}</p>
          </div>
          {selected.notes && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs text-amber-800"><strong>Note:</strong> {selected.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-600">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-teal-900">{value}</p>
    </div>
  );
}
