import type { Declaration, Client, HsCode, BrokerDocument } from "@/types";

// ─── Declarations ────────────────────────────────────────────────────────────
// All declarations now use Uzbekistan as the destination (imports) or origin (exports)
// Currencies: UZS (soum) for local, USD/EUR for international invoices
export const DECLARATIONS: Declaration[] = [
  {
    id: "d-001", reference: "DEC-2026-0041", type: "import", status: "under_review",
    clientId: "c-001", clientName: "Orion Tekstil MChJ",
    shipmentRef: "SHP-0041", origin: "CN", destination: "UZ",
    hsCode: "5208.21", description: "Cotton fabric, plain weave, bleached",
    totalValue: 48000, currency: "USD",
    dutyAmount: 4800, vatAmount: 6336,          // 10% duty + 12% VAT on (CIF+duty)
    declarant: "Dilnoza Yusupova",
    createdAt: "2026-06-10T09:00:00Z", updatedAt: "2026-06-12T14:00:00Z", deadline: "2026-06-15",
  },
  {
    id: "d-002", reference: "DEC-2026-0040", type: "export", status: "approved",
    clientId: "c-002", clientName: "Fergana Kimyo AJ",
    shipmentRef: "SHP-0039", origin: "UZ", destination: "TR",
    hsCode: "5201.00", description: "Cotton, not carded or combed",
    totalValue: 210000, currency: "USD",
    dutyAmount: 0, vatAmount: 0,               // 0% export duty (raw cotton historically 100%, but this lot has phytosanitary cert)
    declarant: "Jasur Toshmatov",
    createdAt: "2026-06-09T11:00:00Z", updatedAt: "2026-06-11T16:00:00Z", deadline: null,
  },
  {
    id: "d-003", reference: "DEC-2026-0039", type: "import", status: "docs_requested",
    clientId: "c-003", clientName: "ToshTrans LLC",
    shipmentRef: "SHP-0038", origin: "DE", destination: "UZ",
    hsCode: "8704.21", description: "Motor vehicles for goods transport, diesel, ≤5t GVW",
    totalValue: 95000, currency: "EUR",
    dutyAmount: 9500, vatAmount: 12540,        // 10% duty + 12% VAT
    declarant: "Dilnoza Yusupova",
    createdAt: "2026-06-08T08:00:00Z", updatedAt: "2026-06-12T10:00:00Z", deadline: "2026-06-14",
  },
  {
    id: "d-004", reference: "DEC-2026-0038", type: "import", status: "submitted",
    clientId: "c-004", clientName: "Samarqand Vino ZAJ",
    shipmentRef: "SHP-0036", origin: "FR", destination: "UZ",
    hsCode: "2204.21", description: "Wine of fresh grapes, in containers ≤2L",
    totalValue: 18000, currency: "EUR",
    dutyAmount: 3600, vatAmount: 2592,         // 20% duty + excise + 12% VAT
    declarant: "Jasur Toshmatov",
    createdAt: "2026-06-07T14:00:00Z", updatedAt: "2026-06-10T09:00:00Z", deadline: "2026-06-16",
  },
  {
    id: "d-005", reference: "DEC-2026-0037", type: "import", status: "draft",
    clientId: "c-001", clientName: "Orion Tekstil MChJ",
    shipmentRef: "SHP-0035", origin: "KR", destination: "UZ",
    hsCode: "8444.00", description: "Machines for extruding, drawing, texturing man-made textile",
    totalValue: 340000, currency: "USD",
    dutyAmount: 0, vatAmount: 0,               // 0% duty — industrial equipment
    declarant: "Dilnoza Yusupova",
    createdAt: "2026-06-06T16:00:00Z", updatedAt: "2026-06-06T16:00:00Z", deadline: "2026-06-18",
  },
  {
    id: "d-006", reference: "DEC-2026-0036", type: "export", status: "released",
    clientId: "c-005", clientName: "Navruz Meva Sabzavot",
    shipmentRef: "SHP-0034", origin: "UZ", destination: "RU",
    hsCode: "0808.10", description: "Apples, fresh",
    totalValue: 32000, currency: "USD",
    dutyAmount: 0, vatAmount: 0,               // CIS FTA — 0% export duty, 0% RU import duty
    declarant: "Aziza Karimova",
    createdAt: "2026-06-04T10:00:00Z", updatedAt: "2026-06-08T11:00:00Z", deadline: null,
  },
  {
    id: "d-007", reference: "DEC-2026-0035", type: "import", status: "rejected",
    clientId: "c-003", clientName: "ToshTrans LLC",
    shipmentRef: "SHP-0033", origin: "RU", destination: "UZ",
    hsCode: "2710.12", description: "Light oils and preparations (petrol/gasoline)",
    totalValue: 87000, currency: "USD",
    dutyAmount: 8700, vatAmount: 11484,        // 10% + 12% VAT — missing fuel excise docs
    declarant: "Jasur Toshmatov",
    createdAt: "2026-06-03T13:00:00Z", updatedAt: "2026-06-05T14:00:00Z", deadline: null,
  },
  {
    id: "d-008", reference: "DEC-2026-0034", type: "import", status: "closed",
    clientId: "c-002", clientName: "Fergana Kimyo AJ",
    shipmentRef: "SHP-0031", origin: "CN", destination: "UZ",
    hsCode: "3105.20", description: "Mineral or chemical fertilisers, NPK",
    totalValue: 124000, currency: "USD",
    dutyAmount: 6200, vatAmount: 15624,        // 5% duty + 12% VAT
    declarant: "Aziza Karimova",
    createdAt: "2026-05-28T08:00:00Z", updatedAt: "2026-06-01T09:00:00Z", deadline: null,
  },
];

// ─── Clients ──────────────────────────────────────────────────────────────────
// Real Uzbekistan company formats: MChJ = LLC, AJ = JSC, ZAJ = OJSC
export const CLIENTS: Client[] = [
  {
    id: "c-001", name: "Orion Tekstil MChJ", type: "importer",
    taxId: "UZ-INN-302845617", country: "UZ",
    address: "Andijon ko'chasi 14, Toshkent 100000",
    contactName: "Sardor Mirzayev", contactEmail: "s.mirzayev@oriontekstil.uz", contactPhone: "+998 71 234 5678",
    eoriNumber: null, authorizedAt: "2024-02-10", declarationCount: 31,
  },
  {
    id: "c-002", name: "Fergana Kimyo AJ", type: "exporter",
    taxId: "UZ-INN-415723890", country: "UZ",
    address: "Sanoat ko'chasi 5, Farg'ona 150100",
    contactName: "Nozima Xoliqova", contactEmail: "n.xoliqova@ferganakimyo.uz", contactPhone: "+998 73 221 4400",
    eoriNumber: null, authorizedAt: "2023-09-15", declarationCount: 44,
  },
  {
    id: "c-003", name: "ToshTrans LLC", type: "importer",
    taxId: "UZ-INN-200134762", country: "UZ",
    address: "Mustaqillik shoh ko'chasi 22, Toshkent 100029",
    contactName: "Bobur Rahimov", contactEmail: "b.rahimov@toshtrans.uz", contactPhone: "+998 71 556 9900",
    eoriNumber: null, authorizedAt: "2024-07-01", declarationCount: 19,
  },
  {
    id: "c-004", name: "Samarqand Vino ZAJ", type: "importer",
    taxId: "UZ-INN-709234501", country: "UZ",
    address: "Registon ko'chasi 88, Samarqand 140100",
    contactName: "Akbar Nazarov", contactEmail: "a.nazarov@samvino.uz", contactPhone: "+998 66 233 1122",
    eoriNumber: null, authorizedAt: "2024-04-20", declarationCount: 9,
  },
  {
    id: "c-005", name: "Navruz Meva Sabzavot", type: "exporter",
    taxId: "UZ-INN-803712456", country: "UZ",
    address: "Dehqon bozori ko'chasi 3, Samarqand 140000",
    contactName: "Gulnora Sobirov", contactEmail: "g.sobirov@navruzmeva.uz", contactPhone: "+998 66 212 8800",
    eoriNumber: null, authorizedAt: "2023-06-05", declarationCount: 56,
  },
];

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
export const DOCUMENTS: BrokerDocument[] = [
  { id: "doc-001", name: "Tijorat hisob-fakturasi — DEC-2026-0041.pdf",   type: "commercial_invoice",    declarationId: "d-001", declarationRef: "DEC-2026-0041", clientId: "c-001", size: 248000, uploadedBy: "Dilnoza Yusupova",   uploadedAt: "2026-06-10T10:00:00Z", verified: true  },
  { id: "doc-002", name: "Yukxat (Packing List) — SHP-0041.pdf",           type: "packing_list",          declarationId: "d-001", declarationRef: "DEC-2026-0041", clientId: "c-001", size: 98000,  uploadedBy: "Dilnoza Yusupova",   uploadedAt: "2026-06-10T10:05:00Z", verified: true  },
  { id: "doc-003", name: "Konosament — MSC BUSAN V.pdf",                   type: "bill_of_lading",        declarationId: "d-001", declarationRef: "DEC-2026-0041", clientId: "c-001", size: 185000, uploadedBy: "Jasur Toshmatov",    uploadedAt: "2026-06-11T08:00:00Z", verified: false },
  { id: "doc-004", name: "Kelib chiqish sertifikati — Form A CN.pdf",      type: "certificate_of_origin", declarationId: "d-001", declarationRef: "DEC-2026-0041", clientId: "c-001", size: 312000, uploadedBy: "Aziza Karimova",     uploadedAt: "2026-06-11T09:30:00Z", verified: true  },
  { id: "doc-005", name: "O'zstandart muvofiqlik sertifikati — 8704.pdf",  type: "customs_license",       declarationId: "d-003", declarationRef: "DEC-2026-0039", clientId: "c-003", size: 420000, uploadedBy: "Jasur Toshmatov",    uploadedAt: "2026-06-09T14:00:00Z", verified: false },
  { id: "doc-006", name: "Sanitariya xulosasi — vino FR.pdf",              type: "import_permit",         declarationId: "d-004", declarationRef: "DEC-2026-0038", clientId: "c-004", size: 156000, uploadedBy: "Dilnoza Yusupova",   uploadedAt: "2026-06-08T11:00:00Z", verified: false },
  { id: "doc-007", name: "Fitosanitariya sertifikati — olma UZ.pdf",       type: "export_permit",         declarationId: "d-006", declarationRef: "DEC-2026-0036", clientId: "c-005", size: 280000, uploadedBy: "Aziza Karimova",     uploadedAt: "2026-06-05T15:00:00Z", verified: true  },
  { id: "doc-008", name: "CMR — ToshTrans SHP-0038.pdf",                   type: "cmr",                   declarationId: "d-003", declarationRef: "DEC-2026-0039", clientId: "c-003", size: 198000, uploadedBy: "Jasur Toshmatov",    uploadedAt: "2026-06-08T17:00:00Z", verified: false },
];

// ─── Pending Shipments ────────────────────────────────────────────────────────
export const SHIPMENTS_PENDING = [
  { ref: "SHP-0042", origin: "Shanghai, CN",    dest: "Toshkent, UZ",  carrier: "COSCO",           mode: "Rail",  cargo: "Cotton yarn 32t",         incoterms: "CFR", eta: "2026-06-22", client: "Orion Tekstil MChJ",  value: 88000  },
  { ref: "SHP-0043", origin: "Frankfurt, DE",   dest: "Toshkent, UZ",  carrier: "Lufthansa Cargo", mode: "Air",   cargo: "Textile machinery 1.2t",  incoterms: "DAP", eta: "2026-06-15", client: "Orion Tekstil MChJ",  value: 340000 },
  { ref: "SHP-0044", origin: "Samarqand, UZ",   dest: "Moskva, RU",    carrier: "O'zbekiston TY",  mode: "Rail",  cargo: "Fresh apples 80t",        incoterms: "FCA", eta: "2026-06-28", client: "Navruz Meva Sabzavot", value: 64000  },
  { ref: "SHP-0045", origin: "Istanbul, TR",    dest: "Toshkent, UZ",  carrier: "Turkish Cargo",   mode: "Air",   cargo: "Garments & textiles 3t",  incoterms: "CIF", eta: "2026-06-14", client: "Orion Tekstil MChJ",  value: 42000  },
];
