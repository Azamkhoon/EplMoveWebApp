import type { Declaration, Client, HsCode, BrokerDocument } from "@/types";

// ─── Declarations ────────────────────────────────────────────────────────────
// All declarations now use Uzbekistan as the destination (imports) or origin (exports)
// Currencies: UZS (soum) for local, USD/EUR for international invoices
export const DECLARATIONS: Declaration[] = [];

// ─── Clients ──────────────────────────────────────────────────────────────────
// Real Uzbekistan company formats: MChJ = LLC, AJ = JSC, ZAJ = OJSC
export const CLIENTS: Client[] = [];

// ─── HS Codes (Uzbekistan tariff, Presidential Resolution PP-55, Jan 2025) ────
//
// Calculation formula (Uzbekistan Customs Code, Art. 292-294):
//   CIF Value  = Invoice (FOB) + Freight + Insurance
//   Duty       = CIF × dutyRate%
//   Excise     = CIF × exciseRate% (if applicable; some goods use specific rates in soum)
//   VAT Base   = CIF + Duty + Excise
//   VAT        = VAT Base × 12%               ← 12% since 2023 (reduced from 15%)
//   Customs Fee= CIF × 0.35%                  ← BCU-based, approx 0.35%
//   Total      = Duty + Excise + VAT + Customs Fee
//
// CIS preferential rates apply to goods originating in: RU, KZ, KG, TJ, BY, AM, MD
// MFN doubled for non-MFN countries.
// Source: tarif.customs.uz, lex.uz/docs/7358852, PwC Tax Summaries UZ 2024

export const HS_CODES: HsCode[] = [
  {
    code: "5208.21",
    description: "Cotton fabric, plain weave, ≤100g/m², bleached",
    dutyRate: 10, vatRate: 12, exciseRate: null, cisRate: 5,
    exportDuty: null, requiresCert: false, certBody: null,
    notes: "CIS preferential 5%; standard MFN 10%. Common Uzbek textile import.",
    chapter: "52", heading: "5208",
  },
  {
    code: "5201.00",
    description: "Cotton, not carded or combed (raw cotton lint)",
    dutyRate: 0, vatRate: 0, exciseRate: null, cisRate: 0,
    exportDuty: 100, requiresCert: true, certBody: "O'zstandart + phytosanitary",
    notes: "Export duty 100% — strategic commodity; exemption with phytosanitary certificate. Zero VAT on export.",
    chapter: "52", heading: "5201",
  },
  {
    code: "8704.21",
    description: "Motor vehicles for goods transport, diesel engine, GVW ≤5 tonnes",
    dutyRate: 10, vatRate: 12, exciseRate: null, cisRate: 0,
    exportDuty: null, requiresCert: true, certBody: "O'zstandart (type approval)",
    notes: "Mandatory vehicle type-approval cert (O'zstandart). CIS origin exempt from duty.",
    chapter: "87", heading: "8704",
  },
  {
    code: "8703.23",
    description: "Passenger cars, spark-ignition, cylinder capacity 1500–3000 cm³",
    dutyRate: 30, vatRate: 12, exciseRate: 10, cisRate: 0,
    exportDuty: null, requiresCert: true, certBody: "O'zstandart (type approval + EURO norms)",
    notes: "High duty to protect local UzAuto production. Excise 10% on top. EURO-2 emissions minimum.",
    chapter: "87", heading: "8703",
  },
  {
    code: "2204.21",
    description: "Wine of fresh grapes in containers ≤ 2 litres",
    dutyRate: 20, vatRate: 12, exciseRate: 30, cisRate: 20,
    exportDuty: null, requiresCert: true, certBody: "State Sanitary Inspectorate + O'zstandart",
    notes: "Excise 30% on CIF. Sanitary-epidemiological certificate required. Labelling must be in Uzbek.",
    chapter: "22", heading: "2204",
  },
  {
    code: "2208.20",
    description: "Spirits obtained by distilling grape wine or marc (brandy/cognac)",
    dutyRate: 20, vatRate: 12, exciseRate: 50, cisRate: 20,
    exportDuty: null, requiresCert: true, certBody: "State Sanitary Inspectorate + O'zstandart",
    notes: "Excise 50% on CIF (or min 101,500 soum/litre for imports). Alcohol licence required.",
    chapter: "22", heading: "2208",
  },
  {
    code: "2402.20",
    description: "Cigarettes containing tobacco",
    dutyRate: 15, vatRate: 12, exciseRate: null, cisRate: 15,
    exportDuty: null, requiresCert: true, certBody: "State Sanitary Inspectorate",
    notes: "Specific excise: 325,000 soum/1000 pcs + 10% ad valorem (import rate 2024). Health warning labels required.",
    chapter: "24", heading: "2402",
  },
  {
    code: "8444.00",
    description: "Machines for extruding, drawing, texturing or cutting man-made textile materials",
    dutyRate: 0, vatRate: 12, exciseRate: null, cisRate: 0,
    exportDuty: null, requiresCert: false, certBody: null,
    notes: "Zero duty — industrial textile machinery. Encouraged under Uzbekistan textile investment programme.",
    chapter: "84", heading: "8444",
  },
  {
    code: "8471.30",
    description: "Portable automatic data processing machines (laptops/notebooks), weight ≤10kg",
    dutyRate: 0, vatRate: 12, exciseRate: null, cisRate: 0,
    exportDuty: null, requiresCert: true, certBody: "O'zstandart (EAC mark / electromagnetic compatibility)",
    notes: "Zero MFN duty. EAC conformity mark or O'zstandart cert required. Common import for IT sector.",
    chapter: "84", heading: "8471",
  },
  {
    code: "3105.20",
    description: "Mineral or chemical fertilisers containing nitrogen, phosphorus and potassium (NPK)",
    dutyRate: 5, vatRate: 12, exciseRate: null, cisRate: 0,
    exportDuty: null, requiresCert: true, certBody: "O'zstandart (agrochemical registration)",
    notes: "Agrochemical state registration required. Reduced 5% duty to support agriculture. CIS origin: 0%.",
    chapter: "31", heading: "3105",
  },
  {
    code: "2710.12",
    description: "Light oils and preparations (motor spirit/petrol, gasoline)",
    dutyRate: 10, vatRate: 12, exciseRate: 20, cisRate: 5,
    exportDuty: null, requiresCert: true, certBody: "O'zstandart (fuel quality) + State Ecology",
    notes: "Excise 20% on CIF. Environmental permit + fuel quality cert required. Strategic commodity — quota may apply.",
    chapter: "27", heading: "2710",
  },
  {
    code: "0808.10",
    description: "Apples, fresh",
    dutyRate: 15, vatRate: 12, exciseRate: null, cisRate: 0,
    exportDuty: 0, requiresCert: true, certBody: "Phytosanitary certificate (O'zkarantin)",
    notes: "Export requires phytosanitary certificate from O'zkarantin. Zero export duty. Uzbekistan is a major apple exporter (RU, KZ markets).",
    chapter: "08", heading: "0808",
  },
  {
    code: "7204.10",
    description: "Waste and scrap of cast iron (ferrous metal scrap)",
    dutyRate: 0, vatRate: 12, exciseRate: null, cisRate: 0,
    exportDuty: 100, requiresCert: false, certBody: null,
    notes: "Export duty 100% — Uzbekistan bans scrap metal exports to protect domestic metallurgy.",
    chapter: "72", heading: "7204",
  },
  {
    code: "7403.11",
    description: "Refined copper, cathodes and sections of cathodes",
    dutyRate: 0, vatRate: 0, exciseRate: null, cisRate: 0,
    exportDuty: 10, requiresCert: false, certBody: null,
    notes: "Export duty 10% (from July 2025 per PP-55). Uzbekistan is world's 10th largest copper producer (Almalyk MMC).",
    chapter: "74", heading: "7403",
  },
  {
    code: "3004.20",
    description: "Pharmaceuticals containing antibiotics, in measured doses",
    dutyRate: 0, vatRate: 0, exciseRate: null, cisRate: 0,
    exportDuty: null, requiresCert: true, certBody: "Agency for Development of Pharmaceutical Industry",
    notes: "Zero duty + zero VAT on essential medicines. State registration with pharma agency mandatory.",
    chapter: "30", heading: "3004",
  },
  {
    code: "1001.99",
    description: "Wheat, other than durum wheat (common/bread wheat)",
    dutyRate: 0, vatRate: 0, exciseRate: null, cisRate: 0,
    exportDuty: null, requiresCert: true, certBody: "O'zkarantin (phytosanitary) + grain quality cert",
    notes: "Zero duty — strategic food security import. Grain quality and phytosanitary certs required.",
    chapter: "10", heading: "1001",
  },
  {
    code: "2716.00",
    description: "Electrical energy",
    dutyRate: 0, vatRate: 0, exciseRate: null, cisRate: 0,
    exportDuty: null, requiresCert: false, certBody: null,
    notes: "Cross-border electricity trade under CIS agreements. Special licensing through Ministry of Energy.",
    chapter: "27", heading: "2716",
  },
  {
    code: "6109.10",
    description: "T-shirts, singlets and other vests of cotton, knitted or crocheted",
    dutyRate: 30, vatRate: 12, exciseRate: null, cisRate: 10,
    exportDuty: null, requiresCert: true, certBody: "O'zstandart (textile composition labelling)",
    notes: "High 30% duty to protect Uzbek garment sector. Composition labels must be in Uzbek language.",
    chapter: "61", heading: "6109",
  },
  {
    code: "8542.31",
    description: "Electronic integrated circuits — processors and controllers",
    dutyRate: 0, vatRate: 12, exciseRate: null, cisRate: 0,
    exportDuty: null, requiresCert: false, certBody: null,
    notes: "Zero duty under IT development programme. No cert required for semiconductors.",
    chapter: "85", heading: "8542",
  },
  {
    code: "2601.11",
    description: "Iron ores and concentrates, non-agglomerated",
    dutyRate: 0, vatRate: 0, exciseRate: null, cisRate: 0,
    exportDuty: 5, requiresCert: false, certBody: null,
    notes: "Export duty 5% from July 2025. Strategic mineral export.",
    chapter: "26", heading: "2601",
  },
];

// ─── Documents ────────────────────────────────────────────────────────────────
export const DOCUMENTS: BrokerDocument[] = [];

// ─── Pending Shipments ────────────────────────────────────────────────────────
export const SHIPMENTS_PENDING: { ref: string; origin: string; dest: string; carrier: string; mode: string; cargo: string; incoterms: string; eta: string; client: string; value: number; }[] = [];
