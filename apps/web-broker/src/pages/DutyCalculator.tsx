import { useState, useMemo } from "react";
import { Calculator, Info, ArrowRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { HS_CODES } from "@/data/mock";

interface Calc {
  hsCode:      string;
  origin:      string;
  destination: string;
  value:       number;
  currency:    string;
  freight:     number;
  insurance:   number;
  method:      "cif" | "fob";
  qty:         number;
}

const BLANK: Calc = {
  hsCode: "", origin: "CN", destination: "US",
  value: 0, currency: "USD", freight: 0, insurance: 0, method: "cif", qty: 1,
};

const COUNTRIES = [
  ["US","United States"],["CN","China"],["DE","Germany"],["AE","UAE"],
  ["JP","Japan"],["KR","South Korea"],["AU","Australia"],["PL","Poland"],
  ["SG","Singapore"],["GB","United Kingdom"],["FR","France"],["NL","Netherlands"],
];

const FX: Record<string,number> = { USD: 1, EUR: 1.09, GBP: 1.27, AED: 0.27, AUD: 0.65, JPY: 0.0067 };

export function DutyCalculator() {
  const [form, setForm] = useState<Calc>(BLANK);
  const [calculated, setCalculated] = useState(false);

  function patch(f: Partial<Calc>) {
    setForm((p) => ({ ...p, ...f }));
    setCalculated(false);
  }

  const hsInfo = HS_CODES.find((h) => h.code === form.hsCode);

  const result = useMemo(() => {
    if (!calculated || !hsInfo) return null;
    const fx       = FX[form.currency] ?? 1;
    const valueUSD = form.value * fx;
    const cifValue = form.method === "cif"
      ? valueUSD
      : valueUSD + form.freight * fx + form.insurance * fx;
    const customsDuty = cifValue * (hsInfo.dutyRate / 100);
    const vatBase     = cifValue + customsDuty;
    const vat         = vatBase * (hsInfo.vatRate / 100);
    const totalLiab   = customsDuty + vat;
    const brokerageFee= totalLiab * 0.015 + 120;
    const grandTotal  = totalLiab + brokerageFee;
    return { cifValue, customsDuty, vat, totalLiab, brokerageFee, grandTotal, dutyRate: hsInfo.dutyRate, vatRate: hsInfo.vatRate };
  }, [calculated, hsInfo, form]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-5 py-4">
        <Calculator size={22} className="text-teal-600 shrink-0" />
        <p className="text-sm text-teal-800">
          Estimate customs duty, VAT, and brokerage fees before filing a declaration.
          Results are indicative — official rates may vary.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800">Shipment Details</h2>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">HS Code</label>
            <select value={form.hsCode} onChange={(e) => patch({ hsCode: e.target.value })} className="input-base">
              <option value="">Select HS code…</option>
              {HS_CODES.map((h) => (
                <option key={h.code} value={h.code}>{h.code} — {h.description.slice(0,40)}…</option>
              ))}
            </select>
            {hsInfo && (
              <p className="mt-1 text-[11px] text-teal-600">
                Duty {hsInfo.dutyRate}% · VAT {hsInfo.vatRate}%
                {hsInfo.notes && <span className="ml-2 text-amber-600">⚠ {hsInfo.notes}</span>}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Origin</label>
              <select value={form.origin} onChange={(e) => patch({ origin: e.target.value })} className="input-base">
                {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{code} — {name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Destination</label>
              <select value={form.destination} onChange={(e) => patch({ destination: e.target.value })} className="input-base">
                {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{code} — {name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Declared Value</label>
              <input type="number" min={0} value={form.value || ""} onChange={(e) => patch({ value: Number(e.target.value) })}
                className="input-base" placeholder="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Currency</label>
              <select value={form.currency} onChange={(e) => patch({ currency: e.target.value })} className="input-base">
                {Object.keys(FX).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* CIF basis toggle */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">Valuation Method</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
              {(["cif","fob"] as const).map((m) => (
                <button key={m} onClick={() => patch({ method: m })}
                  className={cn("flex-1 py-2 transition-colors uppercase", form.method === m ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {form.method === "fob" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Freight ({form.currency})</label>
                <input type="number" min={0} value={form.freight || ""} onChange={(e) => patch({ freight: Number(e.target.value) })}
                  className="input-base" placeholder="0" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Insurance ({form.currency})</label>
                <input type="number" min={0} value={form.insurance || ""} onChange={(e) => patch({ insurance: Number(e.target.value) })}
                  className="input-base" placeholder="0" />
              </div>
            </div>
          )}

          <button
            onClick={() => setCalculated(true)}
            disabled={!form.hsCode || !form.value}
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
            Calculate Duties
          </button>
        </div>

        {/* Results */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Duty &amp; Tax Estimate</h2>
          {!result ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-300">
              <Calculator size={40} className="opacity-40" />
              <p className="text-sm">Enter shipment details and calculate</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Origin → dest */}
              <div className="flex items-center justify-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                <span>{form.origin}</span>
                <ArrowRight size={14} className="text-slate-400" />
                <span>{form.destination}</span>
              </div>

              <ResultRow label="CIF Value (basis)"     value={formatCurrency(result.cifValue, "USD")} />
              <ResultRow label={`Customs Duty (${result.dutyRate}%)`} value={formatCurrency(result.customsDuty, "USD")} highlight />
              <ResultRow label={`VAT (${result.vatRate}%)`}           value={formatCurrency(result.vat, "USD")} highlight />
              <div className="border-t border-slate-200 pt-3">
                <ResultRow label="Total Duty Liability" value={formatCurrency(result.totalLiab, "USD")} large />
              </div>
              <div className="border-t border-slate-100 pt-3">
                <ResultRow label="Estimated Brokerage Fee" value={formatCurrency(result.brokerageFee, "USD")} />
              </div>
              <div className="rounded-lg bg-teal-50 p-3 border border-teal-200">
                <ResultRow label="Grand Total Estimate" value={formatCurrency(result.grandTotal, "USD")} large teal />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                <Info size={13} className="mt-0.5 shrink-0" />
                <p>Indicative only. Anti-dumping duties, excise, and local surcharges not included. Consult official tariff schedules for binding classification.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ label, value, large, highlight, teal }: {
  label: string; value: string; large?: boolean; highlight?: boolean; teal?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={cn("text-xs", highlight ? "font-semibold text-slate-700" : "text-slate-500")}>{label}</span>
      <span className={cn("font-semibold", large ? "text-lg" : "text-sm",
        teal ? "text-teal-700" : highlight ? "text-slate-900" : "text-slate-700")}>
        {value}
      </span>
    </div>
  );
}
