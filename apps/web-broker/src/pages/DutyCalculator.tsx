import { useState, useMemo } from "react";
import { Calculator, Info, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { HS_CODES } from "@/data/mock";
import { useI18n } from "@/i18n/LanguageContext";

// Uzbekistan customs duty calculation
// Legal basis: Customs Code (Law ZRU-401, 2016) Arts 292-294
//              Presidential Resolution PP-55, 31 Jan 2025
//
// Formula:
//   CIF Value  = Invoice (FOB) + Freight + Insurance
//   Duty       = CIF × dutyRate%  (or 0 if CIS-origin and cisRate = 0)
//   Excise     = CIF × exciseRate%  (where applicable)
//   VAT Base   = CIF + Duty + Excise
//   VAT        = VAT Base × 12%   (reduced from 15% in 2023)
//   Customs Fee= CIF × 0.35%     (BCU-based processing fee, approx)
//   Total      = Duty + Excise + VAT + Customs Fee
//
// CIS preferential rates apply to RU, KZ, KG, TJ, BY, AM, MD origin
// Non-MFN (restricted) countries: MFN rate is doubled
// Source: tarif.customs.uz, lex.uz/docs/7358852

const CIS_COUNTRIES = ["RU","KZ","KG","TJ","BY","AM","MD"];

const ORIGIN_COUNTRIES = [
  ["CN","China"],["DE","Germany"],["TR","Turkey"],["RU","Russia"],
  ["KZ","Kazakhstan"],["KG","Kyrgyzstan"],["KR","South Korea"],
  ["JP","Japan"],["US","United States"],["FR","France"],
  ["IT","Italy"],["PL","Poland"],["AE","UAE"],["IN","India"],
  ["UZ","Uzbekistan"],["TJ","Tajikistan"],["BY","Belarus"],
  ["AM","Armenia"],["MD","Moldova"],["GB","United Kingdom"],
];

// Exchange rates to USD (approximate, for display)
const FX_TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.09, GBP: 1.27, RUB: 0.011,
  KZT: 0.0022, CNY: 0.138, KRW: 0.00073,
  JPY: 0.0067, AED: 0.27, TRY: 0.031,
};
// 1 USD ≈ 12,750 UZS (approximate mid-2026)
const USD_TO_UZS = 12750;

// Incoterms 2020 — all 11 rules with their CIF adjustment logic.
// Uzbekistan customs always values on CIF basis (Art. 293 Customs Code ZRU-401).
// For each Incoterm, we derive what the invoice price already includes (cost/freight/insurance),
// and what must be added to reach CIF at the Uzbek border.
//
// Groups:
//   E  — EXW  (seller's works only — buyer pays everything)
//   F  — FCA, FAS, FOB (seller clears export, delivers to carrier)
//   C  — CPT, CIP, CFR, CIF (seller pays main carriage)
//   D  — DAP, DPU, DDP (seller delivers to destination)

interface IncoRule {
  code:        string;
  name:        string;
  group:       "E" | "F" | "C" | "D";
  modes:       string;          // applicable transport modes
  desc:        string;          // what the invoice price includes
  addFreight:  boolean;         // must user add freight to reach CIF?
  addInsurance:boolean;         // must user add insurance to reach CIF?
  freightAdj:  number;          // multiplier on entered freight (1 = full, 0 = not needed)
  insAdj:      number;          // multiplier on entered insurance
  note:        string;          // UZ customs note
}

const INCOTERMS: IncoRule[] = [
  // ── E group ──────────────────────────────────────────────────────────────
  {
    code: "EXW", name: "Ex Works", group: "E", modes: "Any",
    desc: "Invoice = factory gate price only. Buyer arranges all transport, export customs, freight, insurance.",
    addFreight: true, addInsurance: true, freightAdj: 1, insAdj: 1,
    note: "Add full freight + insurance to reach CIF. Most common for intra-Uzbekistan factory purchases.",
  },
  // ── F group ──────────────────────────────────────────────────────────────
  {
    code: "FCA", name: "Free Carrier", group: "F", modes: "Any",
    desc: "Invoice includes seller export clearance + delivery to named carrier/place. Buyer pays main freight + insurance.",
    addFreight: true, addInsurance: true, freightAdj: 1, insAdj: 1,
    note: "Add main carriage freight + insurance. Commonly used with containers (replaces FOB for containerised cargo).",
  },
  {
    code: "FAS", name: "Free Alongside Ship", group: "F", modes: "Sea / Inland waterway",
    desc: "Invoice includes delivery alongside vessel at origin port. Buyer pays loading, freight, insurance.",
    addFreight: true, addInsurance: true, freightAdj: 1, insAdj: 1,
    note: "Sea/river only. Add ocean freight + insurance. Seller does not load the vessel.",
  },
  {
    code: "FOB", name: "Free On Board", group: "F", modes: "Sea / Inland waterway",
    desc: "Invoice includes delivery on board vessel at origin port. Buyer pays ocean freight + insurance.",
    addFreight: true, addInsurance: true, freightAdj: 1, insAdj: 1,
    note: "Most common basis for Uzbekistan imports from China/Korea. Add freight + insurance to reach CIF.",
  },
  // ── C group ──────────────────────────────────────────────────────────────
  {
    code: "CFR", name: "Cost and Freight", group: "C", modes: "Sea / Inland waterway",
    desc: "Invoice includes cost + ocean freight to destination port. Buyer pays insurance only.",
    addFreight: false, addInsurance: true, freightAdj: 0, insAdj: 1,
    note: "Freight already in invoice. Add insurance only to reach CIF basis.",
  },
  {
    code: "CIF", name: "Cost, Insurance and Freight", group: "C", modes: "Sea / Inland waterway",
    desc: "Invoice includes cost + insurance + freight to destination port. = Customs value directly.",
    addFreight: false, addInsurance: false, freightAdj: 0, insAdj: 0,
    note: "Invoice price = CIF customs value. No adjustment needed. Preferred Incoterm for UZ customs declarations.",
  },
  {
    code: "CPT", name: "Carriage Paid To", group: "C", modes: "Any",
    desc: "Invoice includes carriage to named destination. Buyer pays insurance. Risk transfers at first carrier.",
    addFreight: false, addInsurance: true, freightAdj: 0, insAdj: 1,
    note: "Freight included. Add insurance. Used for multimodal / rail shipments (common on China–UZ rail corridor).",
  },
  {
    code: "CIP", name: "Carriage and Insurance Paid To", group: "C", modes: "Any",
    desc: "Invoice includes carriage + insurance (minimum cover) to named destination.",
    addFreight: false, addInsurance: false, freightAdj: 0, insAdj: 0,
    note: "Invoice = CIF equivalent. No adjustment needed. CIP requires minimum Institute Cargo Clause (A) cover.",
  },
  // ── D group ──────────────────────────────────────────────────────────────
  {
    code: "DAP", name: "Delivered at Place", group: "D", modes: "Any",
    desc: "Invoice includes all costs to named destination, unloaded. Buyer pays import duties.",
    addFreight: false, addInsurance: false, freightAdj: 0, insAdj: 0,
    note: "DAP invoice ≥ CIF value (includes destination costs). Use invoice as customs value — this is already ≥ CIF.",
  },
  {
    code: "DPU", name: "Delivered at Place Unloaded", group: "D", modes: "Any",
    desc: "Seller delivers and unloads at named destination. Buyer pays import duties. (Replaces DAT in 2020.)",
    addFreight: false, addInsurance: false, freightAdj: 0, insAdj: 0,
    note: "DPU invoice ≥ CIF. Customs may deduct inland freight from destination to border if documented.",
  },
  {
    code: "DDP", name: "Delivered Duty Paid", group: "D", modes: "Any",
    desc: "Seller pays everything including import duties at destination. Buyer does nothing.",
    addFreight: false, addInsurance: false, freightAdj: 0, insAdj: 0,
    note: "Duties already paid by seller. UZ customs still calculates on CIF basis from invoice. Rarely used for UZ imports — duty responsibility must be clarified.",
  },
];

const INCOTERM_GROUP_LABEL: Record<string, string> = {
  E: "E — Departure", F: "F — Main carriage unpaid",
  C: "C — Main carriage paid", D: "D — Arrival",
};

// EXW transportation cost breakdown
// Under EXW the buyer (importer) bears every cost from the seller's factory to the UZ border.
// These are all real cost components that must be declared on the customs value (CIF).
interface ExwCosts {
  localHaulage:    number;  // truck from factory to origin port/terminal
  exportCustoms:   number;  // export customs clearance fee in origin country
  loading:         number;  // loading/stuffing at origin
  mainFreight:     number;  // ocean / rail / air / road main freight
  insurance:       number;  // cargo insurance (CIF minimum 110% of invoice value)
  transhipment:    number;  // transhipment handling if applicable
  destUnloading:   number;  // unloading at destination port (Tashkent dry port / Navoi)
  destHaulage:     number;  // haulage from UZ border / port to buyer's warehouse
}

const BLANK_EXW: ExwCosts = {
  localHaulage: 0, exportCustoms: 0, loading: 0, mainFreight: 0,
  insurance: 0, transhipment: 0, destUnloading: 0, destHaulage: 0,
};

interface CalcForm {
  hsCode:      string;
  origin:      string;
  type:        "import" | "export";
  value:       number;
  currency:    string;
  freight:     number;
  insurance:   number;
  incoterm:    string;
  exwCosts:    ExwCosts;
  exwTab:      "shipment" | "transport";  // active tab when EXW selected
}

const BLANK: CalcForm = {
  hsCode: "", origin: "CN", type: "import",
  value: 0, currency: "USD", freight: 0, insurance: 0, incoterm: "FOB",
  exwCosts: BLANK_EXW, exwTab: "shipment",
};

export function DutyCalculator() {
  const { t } = useI18n();
  const [form, setForm] = useState<CalcForm>(BLANK);
  const [calculated, setCalculated] = useState(false);

  function patch(f: Partial<CalcForm>) {
    setForm((p) => ({ ...p, ...f }));
    setCalculated(false);
  }

  const hsInfo    = HS_CODES.find((h) => h.code === form.hsCode);
  const isCIS     = CIS_COUNTRIES.includes(form.origin);
  const incRule   = INCOTERMS.find((i) => i.code === form.incoterm) ?? INCOTERMS[3]; // default FOB

  const effectiveDutyRate = useMemo(() => {
    if (!hsInfo) return 0;
    if (form.type === "export") return hsInfo.exportDuty ?? 0;
    if (isCIS && hsInfo.cisRate !== null) return hsInfo.cisRate;
    return hsInfo.dutyRate;
  }, [hsInfo, isCIS, form.type]);

  // Total EXW transport costs in form currency → USD
  const exwTotalUSD = useMemo(() => {
    if (form.incoterm !== "EXW") return 0;
    const fx = FX_TO_USD[form.currency] ?? 1;
    const c  = form.exwCosts;
    return (c.localHaulage + c.exportCustoms + c.loading + c.mainFreight +
            c.insurance + c.transhipment + c.destUnloading + c.destHaulage) * fx;
  }, [form.incoterm, form.exwCosts, form.currency]);

  const result = useMemo(() => {
    if (!calculated || !hsInfo || !form.value) return null;

    const fx       = FX_TO_USD[form.currency] ?? 1;
    const valueUSD = form.value * fx;

    // For EXW: CIF = invoice + sum of all transport cost fields
    // For other incoterms: add freight/insurance only if not already in invoice price
    let freightUSD   = 0;
    let insuranceUSD = 0;
    if (form.incoterm === "EXW") {
      freightUSD   = exwTotalUSD; // entire transport bundle goes into CIF numerator
      insuranceUSD = 0;           // insurance already inside exwCosts.insurance
    } else {
      freightUSD   = incRule.addFreight   ? form.freight   * fx : 0;
      insuranceUSD = incRule.addInsurance ? form.insurance * fx : 0;
    }
    const cifUSD = valueUSD + freightUSD + insuranceUSD;

    const duty        = cifUSD * (effectiveDutyRate / 100);
    const excise      = cifUSD * ((hsInfo.exciseRate ?? 0) / 100);
    const vatBase     = cifUSD + duty + excise;
    const vat         = form.type === "export" ? 0 : vatBase * (hsInfo.vatRate / 100);
    const customsFee  = form.type === "export" ? 0 : cifUSD * 0.0035;
    const totalUSD    = duty + excise + vat + customsFee;
    const totalUZS    = totalUSD * USD_TO_UZS;
    const cifUZS      = cifUSD * USD_TO_UZS;

    return {
      cifUSD, freightUSD, insuranceUSD, duty, excise, vat, customsFee,
      vatBase, totalUSD, totalUZS, cifUZS,
      dutyRate: effectiveDutyRate,
      vatRate: hsInfo.vatRate,
      exciseRate: hsInfo.exciseRate ?? 0,
      isCISRate: isCIS && hsInfo.cisRate !== null && form.type === "import",
    };
  }, [calculated, hsInfo, form, effectiveDutyRate, isCIS, incRule, exwTotalUSD]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header info */}
      <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 px-5 py-4">
        <Calculator size={20} className="mt-0.5 text-teal-600 shrink-0" />
        <div className="text-sm text-teal-800 space-y-0.5">
          <p className="font-semibold">{t("page.dutyCalc.title")}</p>
          <p className="text-xs text-teal-700">
            Based on Presidential Resolution PP-55 (31 Jan 2025) · Customs Code ZRU-401 (2016) Arts 292-294 ·
            VAT 12% · CIF basis · CIS FTA preferential rates apply for RU/KZ/KG/TJ/BY/AM/MD origin
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Inputs ── */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">

          {/* Tab bar — only visible when EXW is selected */}
          {form.incoterm === "EXW" && (
            <div className="flex border-b border-slate-200">
              {([
                { key: "shipment",  label: t("page.shipments.title") },
                { key: "transport", label: t("duty.freight") },
              ] as const).map((tab) => (
                <button key={tab.key}
                  onClick={() => patch({ exwTab: tab.key })}
                  className={cn(
                    "flex-1 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px",
                    form.exwTab === tab.key
                      ? "border-teal-600 text-teal-700 bg-teal-50/50"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  )}>
                  {tab.label}
                  {tab.key === "transport" && exwTotalUSD > 0 && (
                    <span className="ml-1.5 rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] text-white">
                      {fmt(exwTotalUSD)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4 p-5">
            {/* ── Non-EXW header ── */}
            {form.incoterm !== "EXW" && (
              <h2 className="font-semibold text-slate-800">{t("page.shipments.title")}</h2>
            )}

            {/* ══ TAB: Transportation Expenses (EXW only) ══ */}
            {form.incoterm === "EXW" && form.exwTab === "transport" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                  Under <strong>EXW (Ex Works)</strong>, the buyer (Uzbekistan importer) bears every
                  cost from the seller's factory to the UZ border. All costs below are included
                  in the CIF customs value per UZ Customs Code Art. 293.
                </div>

                {/* Cost fields */}
                {([
                  { key: "localHaulage",  label: "Local haulage",        hint: "Truck from seller's factory to origin port / terminal" },
                  { key: "exportCustoms", label: "Export customs fee",    hint: "Customs clearance charge in the country of export" },
                  { key: "loading",       label: "Loading / stuffing",    hint: "Container stuffing or loading onto vessel / truck / rail" },
                  { key: "mainFreight",   label: "Main freight",          hint: "Ocean / rail / air / road freight to Uzbekistan border" },
                  { key: "transhipment",  label: "Transhipment handling", hint: "Port handling if cargo changes vessel or mode en route" },
                  { key: "insurance",     label: "Cargo insurance",       hint: "Minimum ICC (A) recommended: 110% × invoice value" },
                  { key: "destUnloading", label: "Destination unloading", hint: "Unloading at Tashkent dry port, Navoi FEZ, or land border" },
                  { key: "destHaulage",   label: "Destination haulage",   hint: "Delivery from UZ port / border to buyer's warehouse (note: included in CIF base)" },
                ] as { key: keyof ExwCosts; label: string; hint: string }[]).map(({ key, label, hint }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      {label} <span className="font-normal text-slate-400">({form.currency})</span>
                    </label>
                    <input
                      type="number" min={0}
                      value={form.exwCosts[key] || ""}
                      onChange={(e) => patch({ exwCosts: { ...form.exwCosts, [key]: Number(e.target.value) } })}
                      className="input-base" placeholder="0"
                    />
                    <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>
                  </div>
                ))}

                {/* Running total */}
                <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-teal-700">{t("duty.freight")}</span>
                    <span className="text-lg font-bold text-teal-800">{fmt(exwTotalUSD)}</span>
                  </div>
                  <p className="text-[11px] text-teal-600 mt-0.5">
                    CIF = Invoice {fmt((form.value || 0) * (FX_TO_USD[form.currency] ?? 1))} + Transport {fmt(exwTotalUSD)}
                    {" = "}<strong>{fmt((form.value || 0) * (FX_TO_USD[form.currency] ?? 1) + exwTotalUSD)}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setCalculated(true)}
                  disabled={!form.hsCode || !form.value}
                  className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  {t("duty.calculate")}
                </button>
              </div>

            ) : (
              /* ══ TAB: Shipment Details (always shown for non-EXW, or EXW shipment tab) ══ */
              <>
                {/* Import / Export toggle */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">{t("declarations.type")}</label>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                    {(["import","export"] as const).map((t) => (
                      <button key={t} onClick={() => patch({ type: t })}
                        className={cn("flex-1 py-2 capitalize transition-colors",
                          form.type === t ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* HS Code */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("duty.hsCode")}</label>
                  <select value={form.hsCode} onChange={(e) => patch({ hsCode: e.target.value })} className="input-base">
                    <option value="">{t("hs.select")}</option>
                    {HS_CODES.filter((h) =>
                      form.type === "import" || h.exportDuty !== null || h.code === "0808.10"
                    ).map((h) => (
                      <option key={h.code} value={h.code}>{h.code} — {h.description.slice(0, 48)}</option>
                    ))}
                  </select>
                  {hsInfo && (
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-[11px] text-teal-700 font-medium">
                        {form.type === "import" ? (
                          <>Import duty {effectiveDutyRate}%{isCIS && hsInfo.cisRate !== null ? " (CIS rate)" : " (MFN)"} · VAT {hsInfo.vatRate}%{hsInfo.exciseRate ? ` · Excise ${hsInfo.exciseRate}%` : ""}</>
                        ) : (
                          <>Export duty {hsInfo.exportDuty !== null ? `${hsInfo.exportDuty}%` : "None"}</>
                        )}
                      </p>
                      {hsInfo.requiresCert && (
                        <p className="text-[11px] text-amber-600">⚠ Certification required: {hsInfo.certBody}</p>
                      )}
                      {hsInfo.notes && (
                        <p className="text-[11px] text-slate-500">{hsInfo.notes}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Origin */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    {form.type === "import" ? "Country of Origin" : "Destination Country"}
                  </label>
                  <select value={form.origin} onChange={(e) => patch({ origin: e.target.value })} className="input-base">
                    {ORIGIN_COUNTRIES.map(([code, name]) => (
                      <option key={code} value={code}>{code} — {name}</option>
                    ))}
                  </select>
                  {form.type === "import" && isCIS && (
                    <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                      ✓ CIS Free Trade Area — preferential duty rates apply
                    </p>
                  )}
                </div>

                {/* Value + Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Declared Value</label>
                    <input type="number" min={0} value={form.value || ""} onChange={(e) => patch({ value: Number(e.target.value) })}
                      className="input-base" placeholder="0" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Currency</label>
                    <select value={form.currency} onChange={(e) => patch({ currency: e.target.value })} className="input-base">
                      {Object.keys(FX_TO_USD).map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Incoterms 2020 */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Incoterm <span className="font-normal text-slate-400">(Incoterms® 2020)</span>
                  </label>
                  <select
                    value={form.incoterm}
                    onChange={(e) => patch({ incoterm: e.target.value, exwTab: "shipment" })}
                    className="input-base"
                  >
                    {(["E","F","C","D"] as const).map((grp) => (
                      <optgroup key={grp} label={INCOTERM_GROUP_LABEL[grp]}>
                        {INCOTERMS.filter((r) => r.group === grp).map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.code} — {r.name} ({r.modes})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {/* Incoterm detail card */}
                  {incRule && (
                    <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold",
                          incRule.group === "E" ? "bg-slate-200 text-slate-700" :
                          incRule.group === "F" ? "bg-blue-100 text-blue-700" :
                          incRule.group === "C" ? "bg-teal-100 text-teal-700" :
                          "bg-violet-100 text-violet-700")}>
                          Group {incRule.group}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">{incRule.name}</span>
                        <span className="ml-auto text-[10px] text-slate-400">{incRule.modes}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{incRule.desc}</p>
                      <p className="text-[11px] text-teal-700 font-medium">{incRule.note}</p>
                      {form.incoterm === "EXW" && (
                        <button
                          onClick={() => patch({ exwTab: "transport" })}
                          className="mt-1 w-full rounded-md bg-teal-600 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition-colors">
                          Enter Transportation Expenses →
                        </button>
                      )}
                      {form.incoterm !== "EXW" && (
                        <div className="flex gap-3 text-[10px] font-semibold">
                          <span className={incRule.addFreight ? "text-amber-600" : "text-emerald-600"}>
                            Freight: {incRule.addFreight ? "add below" : "included in invoice"}
                          </span>
                          <span className={incRule.addInsurance ? "text-amber-600" : "text-emerald-600"}>
                            Insurance: {incRule.addInsurance ? "add below" : "included in invoice"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Freight + Insurance inputs for non-EXW incoterms */}
                {form.incoterm !== "EXW" && (incRule.addFreight || incRule.addInsurance) && (
                  <div className="grid grid-cols-2 gap-3">
                    {incRule.addFreight && (
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Freight ({form.currency})
                        </label>
                        <input type="number" min={0} value={form.freight || ""}
                          onChange={(e) => patch({ freight: Number(e.target.value) })}
                          className="input-base" placeholder="0" />
                      </div>
                    )}
                    {incRule.addInsurance && (
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Insurance ({form.currency})
                        </label>
                        <input type="number" min={0} value={form.insurance || ""}
                          onChange={(e) => patch({ insurance: Number(e.target.value) })}
                          className="input-base" placeholder="0" />
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setCalculated(true)}
                  disabled={!form.hsCode || !form.value}
                  className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  {t("duty.calculate")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">{t("page.dutyCalc.title")}</h2>

          {!result ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-300">
              <Calculator size={40} className="opacity-40" />
              <p className="text-sm">{t("duty.hsCode")} · {t("duty.goodsValue")} · {t("duty.calculate")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Direction badge */}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
                <span>{form.type === "import" ? `${form.origin} → UZ` : `UZ → ${form.origin}`}</span>
                <ArrowRight size={14} className="text-slate-400" />
                <span className={cn("text-xs font-bold uppercase px-2 py-0.5 rounded-full",
                  form.type === "import" ? "bg-blue-100 text-blue-700" : "bg-teal-100 text-teal-700")}>
                  {form.type}
                </span>
              </div>

              {/* CIS indicator */}
              {result.isCISRate && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 size={13} />
                  CIS Free Trade Area — preferential rate {result.dutyRate}% applied (MFN: {hsInfo?.dutyRate}%)
                </div>
              )}

              {/* Calculation breakdown */}
              <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                {/* CIF build-up */}
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">CIF build-up ({form.incoterm})</p>
                <Row label="Invoice / EXW value" value={fmt(result.cifUSD - result.freightUSD - result.insuranceUSD)} />
                {form.incoterm === "EXW" && result.freightUSD > 0 ? (
                  // EXW: show each transport cost line
                  <>
                    {(Object.entries(form.exwCosts) as [keyof ExwCosts, number][])
                      .filter(([, v]) => v > 0)
                      .map(([key, v]) => {
                        const labels: Record<keyof ExwCosts, string> = {
                          localHaulage: "+ Local haulage", exportCustoms: "+ Export customs",
                          loading: "+ Loading/stuffing", mainFreight: "+ Main freight",
                          insurance: "+ Insurance", transhipment: "+ Transhipment",
                          destUnloading: "+ Dest. unloading", destHaulage: "+ Dest. haulage",
                        };
                        return <Row key={key} label={labels[key]} value={fmt(v * (FX_TO_USD[form.currency] ?? 1))} />;
                      })}
                  </>
                ) : (
                  <>
                    {result.freightUSD > 0 && <Row label="+ Freight" value={fmt(result.freightUSD)} />}
                    {result.insuranceUSD > 0 && <Row label="+ Insurance" value={fmt(result.insuranceUSD)} />}
                  </>
                )}
                <Row label="= CIF Customs Value" value={`$${result.cifUSD.toLocaleString("en", { maximumFractionDigits: 2 })}`} highlight />
                <Row label={`  ≈ UZS (${USD_TO_UZS.toLocaleString()} soum/USD)`} value={`${(result.cifUZS / 1_000_000).toFixed(2)}M soum`} muted />

                <div className="border-t border-slate-200 pt-2 mt-2 space-y-2">
                  <Row label={`${t("duty.importDuty")} (${result.dutyRate}%)`} value={fmt(result.duty)} highlight={result.duty > 0} />
                  {result.exciseRate > 0 && (
                    <Row label={`${t("duty.excise")} (${result.exciseRate}%)`} value={fmt(result.excise)} highlight />
                  )}
                  {form.type === "import" && (
                    <>
                      <Row label={`VAT ${result.vatRate}% on (CIF + Duty${result.exciseRate > 0 ? " + Excise" : ""})`} value={fmt(result.vat)} highlight />
                      <Row label="Customs Processing Fee (0.35%)" value={fmt(result.customsFee)} />
                    </>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="rounded-lg bg-teal-600 px-4 py-3 text-white">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold opacity-80">{t("duty.total")}</span>
                  <span className="text-xl font-bold">{fmt(result.totalUSD)}</span>
                </div>
                <p className="mt-0.5 text-right text-xs opacity-70">
                  ≈ {(result.totalUZS / 1_000_000).toFixed(1)}M UZS
                </p>
              </div>

              {/* Breakdown as % of CIF */}
              {result.cifUSD > 0 && (
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Effective tax burden</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-2 rounded-full bg-teal-500 transition-all"
                        style={{ width: `${Math.min((result.totalUSD / result.cifUSD) * 100, 100).toFixed(1)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-teal-700">
                      {((result.totalUSD / result.cifUSD) * 100).toFixed(1)}% of CIF
                    </span>
                  </div>
                </div>
              )}

              {/* Export duty warning */}
              {form.type === "export" && hsInfo != null && hsInfo.exportDuty != null && hsInfo.exportDuty > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <p>Export duty of <strong>{hsInfo.exportDuty}%</strong> applies. This is a restricted export commodity under UZ trade policy.</p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                <Info size={12} className="mt-0.5 shrink-0" />
                <p>
                  Indicative only. Based on PP-55 (Jan 2025) and Customs Code ZRU-401.
                  Specific excise rates for tobacco/alcohol are per-unit (soum/litre or soum/1000 pcs) — contact customs for exact figures.
                  Verify current rates at <span className="font-semibold">tarif.customs.uz</span>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CIS FTA Reference Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-800">CIS Free Trade Area — Partner Countries</h2>
        <p className="mb-3 text-xs text-slate-500">
          Uzbekistan participates in the CIS Free Trade Agreement. Goods originating in the following countries may qualify for preferential (reduced) import duty rates. Zero-duty applies to many product categories.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ["RU","Russia"],["KZ","Kazakhstan"],["KG","Kyrgyzstan"],
            ["TJ","Tajikistan"],["BY","Belarus"],["AM","Armenia"],["MD","Moldova"],
          ].map(([code, name]) => (
            <div key={code} className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={11} /> {code} — {name}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Note: Uzbekistan is not a full EAEU member. EAEU common external tariff does not apply — Uzbekistan maintains its own tariff schedule.
        </p>
      </div>

      {/* ── VAT & Fee Formula Reference ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-800">Calculation Formula Reference</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormulaBlock title="Import Calculation (Art. 292-294, Customs Code)" lines={[
            "CIF Value  = Invoice (FOB) + Freight + Insurance",
            "Duty       = CIF × Duty Rate %",
            "Excise     = CIF × Excise Rate % (if applicable)",
            "VAT Base   = CIF + Duty + Excise",
            "VAT        = VAT Base × 12%",
            "Customs Fee= CIF × 0.35%",
            "─────────────────────────────────",
            "Total      = Duty + Excise + VAT + Fee",
          ]} />
          <FormulaBlock title="Key Rates & Thresholds" lines={[
            "VAT Rate:             12% (reduced 2023)",
            "Customs Processing:   0.35% of CIF",
            "Standard MFN Rates:   0% / 5% / 10% / 15% / 20% / 30%",
            "Cotton export duty:   100% (strategic commodity)",
            "Scrap metal export:   100% (export ban)",
            "Copper export:        10% (from Jul 2025)",
            "Passenger cars:       30% + 10% excise",
            "Wine/spirits excise:  20–50% (ad valorem)",
          ]} />
        </div>
      </div>
    </div>
  );
}

function fmt(v: number) {
  return `$${v.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Row({ label, value, highlight, muted }: { label: string; value: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={cn("text-xs", muted ? "text-slate-400" : highlight ? "font-semibold text-slate-700" : "text-slate-500")}>{label}</span>
      <span className={cn("shrink-0 text-sm font-semibold", muted ? "text-slate-400" : highlight ? "text-teal-700" : "text-slate-700")}>{value}</span>
    </div>
  );
}

function FormulaBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="mb-2 text-xs font-semibold text-slate-600">{title}</p>
      <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-600 leading-relaxed">
        {lines.join("\n")}
      </pre>
    </div>
  );
}
