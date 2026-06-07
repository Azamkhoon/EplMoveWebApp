import type { GeniusAnswer } from "@epl/contracts";

/** Logistics knowledge base — keyword-scored. Sources are real org names. */
interface KbEntry {
  keywords: string[];
  answer: string;
  sources: string[];
}

export const KB: KbEntry[] = [
  {
    keywords: ["fob", "cif", "incoterm", "incoterms", "exw", "ddp", "dap", "delivery term"],
    answer:
      "Incoterms® 2020 are standardized ICC trade terms defining who pays for and bears risk over each leg.\n\n• EXW — buyer takes over at the seller's door.\n• FOB — seller delivers on board the vessel at origin; risk/freight pass to the buyer once loaded.\n• CIF — seller pays ocean freight + minimum insurance to destination port, but risk passes at origin.\n• DAP/DDP — seller delivers to destination; with DDP the seller also clears import customs and pays duties.",
    sources: ["ICC — Incoterms® 2020", "Maersk Trade Guide"],
  },
  {
    keywords: ["container type", "high cube", "reefer container", "open top", "flat rack", "40hc", "20gp"],
    answer:
      "Common ocean containers: 20'/40' General Purpose, 40'/45' High Cube (extra height), Reefer (refrigerated), Open Top (over-height), Flat Rack (oversized/heavy), Tank (liquids). Rail equivalents: container flat wagons, covered wagons, open wagons.",
    sources: ["WCO", "Hapag-Lloyd Container Specifications"],
  },
  {
    keywords: ["demurrage", "detention", "free time", "free days", "storage charge"],
    answer:
      "Demurrage = your FULL container sits inside the terminal beyond free days. Detention = you keep the carrier's container OUTSIDE the terminal beyond free days after pickup. Negotiate longer free time and schedule trucking early.",
    sources: ["FIATA", "Carrier Tariff Guides"],
  },
  {
    keywords: ["bill of lading", "b/l", "bol", "seaway", "telex release", "waybill"],
    answer:
      "A Bill of Lading is receipt, contract of carriage, and document of title. Types: Original (negotiable), Seaway Bill (non-negotiable, faster release), Telex/Express release.",
    sources: ["ICC", "BIMCO"],
  },
  {
    keywords: ["customs", "hs code", "harmonized", "clearance", "duty", "tariff", "import declaration"],
    answer:
      "Customs clearance starts with the HS (Harmonized System) code — 6 digits international, extended to 8–10 nationally — which drives duty rates and restrictions. Core docs: commercial invoice, packing list, B/L or AWB, plus certificates (origin, licences).",
    sources: ["World Customs Organization (WCO)", "Local Customs Authority"],
  },
  {
    keywords: ["air vs ocean", "air freight", "sea freight", "ocean freight", "which mode", "faster"],
    answer:
      "Air = days, ocean = weeks. Ocean is far cheaper per kg for heavy/bulky cargo; air wins for light, urgent or high-value goods. Air prices on chargeable (volumetric) weight; ocean on container slots / W/M for LCL. Ocean has a far lower CO₂ footprint.",
    sources: ["IATA Cargo", "Clean Cargo Working Group"],
  },
  {
    keywords: ["dangerous goods", "hazardous", "imdg", "dg", "adr", "un number", "hazmat"],
    answer:
      "Dangerous goods are 9 UN hazard classes. Ocean → IMDG Code; Air → IATA DGR; Road (EU) → ADR. You need UN-approved packaging, correct labels/placards and a Dangerous Goods Declaration with the right UN number and packing group.",
    sources: ["IMO — IMDG Code", "IATA DGR", "ADR"],
  },
  {
    keywords: ["volumetric", "chargeable weight", "dim weight", "dimensional weight"],
    answer:
      "Chargeable weight = greater of actual and volumetric weight. Air: (L×W×H cm) ÷ 6000. Courier/road: often ÷ 5000. Ocean LCL: billed per W/M (1 m³ vs 1 tonne, whichever is greater).",
    sources: ["IATA", "FIATA"],
  },
];

const FALLBACK: GeniusAnswer = {
  answer:
    "I can help with Incoterms, container/trailer/wagon types, customs & HS codes, demurrage vs detention, air vs ocean, dangerous goods, chargeable weight and transit times. I can also estimate freight rates and optimize routes — try the rate or route tools.",
  sources: [],
};

export function kbAnswer(question: string): GeniusAnswer {
  const q = question.toLowerCase();
  let best: { entry: KbEntry; score: number } | null = null;
  for (const entry of KB) {
    let score = 0;
    for (const kw of entry.keywords) if (q.includes(kw)) score += kw.length;
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  if (!best) return FALLBACK;
  return { answer: best.entry.answer, sources: best.entry.sources };
}
