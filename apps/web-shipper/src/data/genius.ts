// EPL Genius — logistics knowledge base + answer engine.
//
// This is a local, offline knowledge base that powers the in-app AI assistant.
// To wire a real LLM + live web search later, set VITE_GENIUS_API_URL and the
// askGenius() function will POST there instead of using the local KB. The rest
// of the UI does not need to change.

export interface GeniusAnswer {
  answer: string;
  sources: string[];
}

interface KbEntry {
  keywords: string[];
  answer: string;
  sources: string[];
}

const KB: KbEntry[] = [
  {
    keywords: ["fob", "cif", "incoterm", "incoterms", "exw", "ddp", "dap", "delivery term"],
    answer:
      "Incoterms® 2020 are standardized trade terms from the ICC that define who pays for and bears risk over each leg of a shipment.\n\n• EXW (Ex Works) — buyer takes over at the seller's door; maximum buyer responsibility.\n• FOB (Free On Board) — seller delivers goods on board the vessel at origin; risk and freight pass to the buyer once loaded.\n• CIF (Cost, Insurance & Freight) — seller pays ocean freight and minimum insurance to the destination port, but risk still passes to the buyer at origin once on board.\n• DAP / DDP — seller delivers to the destination; with DDP the seller also clears import customs and pays duties.\n\nRule of thumb: FOB gives the buyer control of the main carriage; CIF/DDP shift that work to the seller.",
    sources: ["ICC — Incoterms® 2020", "Maersk Trade Guide"],
  },
  {
    keywords: ["container type", "container types", "high cube", "reefer container", "open top", "flat rack", "what container", "40hc", "20gp"],
    answer:
      "Common ocean container types:\n\n• 20' & 40' General Purpose (Dry) — standard boxes for palletised/dry cargo.\n• 40' High Cube — same footprint as 40' GP but ~30 cm taller for extra volume.\n• 45' High Cube — longer high cube for light, bulky cargo.\n• Reefer (20'/40') — refrigerated units for cold-chain goods.\n• Open Top — removable roof for over-height / top-loaded cargo.\n• Flat Rack — collapsible ends for oversized or heavy cargo.\n• Tank — for liquids, gases and chemicals.\n\nFor rail, the equivalents are container flat wagons, covered wagons and open wagons.",
    sources: ["WCO", "Hapag-Lloyd Container Specifications"],
  },
  {
    keywords: ["demurrage", "detention", "free time", "free days", "storage charge"],
    answer:
      "Demurrage and detention are both penalty charges, separated by where the box is:\n\n• Demurrage — charged when your FULL container sits inside the terminal/port beyond the free days (you didn't pick it up in time).\n• Detention — charged when you keep the carrier's container OUTSIDE the terminal (e.g., at your warehouse) beyond the free days after pickup.\n\nTip: negotiate longer free time up front and schedule trucking early to avoid both.",
    sources: ["FIATA", "Carrier Tariff Guides"],
  },
  {
    keywords: ["bill of lading", "b/l", "bol", "seaway", "telex release", "waybill"],
    answer:
      "A Bill of Lading (B/L) is the core ocean shipping document and plays three roles:\n1. Receipt — proof the carrier received the goods.\n2. Contract of carriage — the terms between shipper and carrier.\n3. Document of title — the holder of an original negotiable B/L can claim the cargo.\n\nCommon types: Original (negotiable), Seaway Bill (non-negotiable, faster release) and Telex/Express release.",
    sources: ["ICC", "BIMCO"],
  },
  {
    keywords: ["customs", "hs code", "harmonized", "clearance", "duty", "tariff", "import declaration"],
    answer:
      "Customs clearance starts with classifying goods under an HS (Harmonized System) code — a 6-digit international code (extended to 8–10 digits nationally) that drives duty rates and restrictions.\n\nCore documents: commercial invoice, packing list, bill of lading / air waybill, plus any certificates (origin, licences). Accurate HS classification and honest value declaration prevent delays and penalties.",
    sources: ["World Customs Organization (WCO)", "Local Customs Authority"],
  },
  {
    keywords: ["air vs ocean", "air or ocean", "air freight", "sea freight", "ocean freight", "which mode", "faster"],
    answer:
      "Air vs ocean freight trade-offs:\n\n• Speed — air is days; ocean is weeks.\n• Cost — ocean is far cheaper per kg for heavy/bulky cargo; air only wins for light, urgent or high-value goods.\n• Pricing basis — air uses chargeable (volumetric) weight; ocean uses container slots or W/M for LCL.\n• Footprint — ocean emits far less CO₂ per tonne-km.\n\nUse air for time-critical or perishable high-value cargo; ocean for cost-efficient bulk.",
    sources: ["IATA Cargo", "Clean Cargo Working Group"],
  },
  {
    keywords: ["reefer", "cold chain", "temperature", "perishable", "pharma", "frozen"],
    answer:
      "Cold-chain (reefer) shipping keeps temperature-sensitive cargo (pharma, food) within range end-to-end:\n• Reefer containers control temperature, humidity and ventilation.\n• Pre-cool the container and pre-condition cargo before loading.\n• Monitor with data loggers; many pharma lanes require GDP compliance.\n• Secure power at terminals and during transshipment to avoid temperature gaps.",
    sources: ["IATA — CEIV Pharma", "WHO GDP Guidelines"],
  },
  {
    keywords: ["dangerous goods", "hazardous", "imdg", "dg", "adr", "un number", "hazmat"],
    answer:
      "Dangerous goods fall into 9 UN hazard classes (e.g., Class 3 flammable liquids, Class 8 corrosives). Requirements by mode:\n• Ocean — IMDG Code.\n• Air — IATA DGR.\n• Road (Europe) — ADR.\n\nYou need UN-approved packaging, correct labels/placards and a Dangerous Goods Declaration. Book as DG with the right UN number and packing group.",
    sources: ["IMO — IMDG Code", "IATA DGR", "ADR"],
  },
  {
    keywords: ["transit time", "how long", "shanghai", "rotterdam", "sailing", "eta", "days to"],
    answer:
      "Typical port-to-port ocean transit Shanghai → Rotterdam is roughly 30–40 days, depending on the service, transshipments and routing (Suez vs Cape of Good Hope). Add origin/destination handling and customs for door-to-door. Air freight on the same lane is usually 1–3 days in the air plus handling.",
    sources: ["Carrier Sailing Schedules", "Sea-Intelligence"],
  },
  {
    keywords: ["volumetric", "chargeable weight", "dim weight", "dimensional weight", "billed weight"],
    answer:
      "Chargeable weight is the GREATER of actual (gross) weight and volumetric weight:\n\n• Air: volumetric kg = (L × W × H in cm) ÷ 6000.\n• Road/courier: often ÷ 5000.\n• Ocean LCL: billed per W/M — 1 m³ vs 1 tonne, whichever is greater.\n\nSo bulky-but-light cargo is priced on volume, not actual weight.",
    sources: ["IATA", "FIATA"],
  },
  {
    keywords: ["trailer", "tautliner", "curtainside", "mega", "flatbed", "swap body", "truck type"],
    answer:
      "Common European road trailers:\n• Curtainside / Tautliner — flexible side access, ~13.6 m, the workhorse for palletised cargo.\n• Box / Dry Van — enclosed, more secure.\n• Mega Trailer — taller internal height (~3.0 m) for high-volume light cargo.\n• Reefer Trailer — temperature controlled.\n• Flatbed — open deck for oversized/heavy loads.\n• Jumbo — combined volume layout for max cube.\n• Swap Body — demountable unit for intermodal road↔rail.\n\nMost standard trailers carry ~24 t payload and 33 euro pallets.",
    sources: ["IRU", "Carrier Equipment Guides"],
  },
  {
    keywords: ["wagon", "rail", "train", "intermodal", "block train", "railway"],
    answer:
      "Rail freight wagon types:\n• Container Flat Wagon — carries ISO containers / swap bodies (often 2× 30' or 1× 40').\n• Covered Wagon — enclosed for weather-sensitive dry cargo.\n• Open Wagon — high sides for bulk like aggregates or scrap.\n• Sliding-Wall Wagon — full-length side access for palletised goods.\n• Tank Wagon — liquids, gases and chemicals.\n\nRail shines on long, high-volume corridors (e.g., China–Europe block trains) with a lower footprint than road.",
    sources: ["UIC", "DB Cargo"],
  },
];

const FALLBACK: GeniusAnswer = {
  answer:
    "I can help with logistics topics like Incoterms, container, trailer & wagon types, customs and HS codes, demurrage vs detention, air vs ocean freight, cold chain, dangerous goods, chargeable weight and transit times. Could you add a bit more detail about your shipment?",
  sources: [],
};

export const GENIUS_SUGGESTIONS = [
  "What's the difference between FOB and CIF?",
  "Demurrage vs detention?",
  "Which container types are there?",
  "How is chargeable weight calculated?",
];

function localAnswer(question: string): GeniusAnswer {
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

const API_URL = import.meta.env.VITE_GENIUS_API_URL as string | undefined;

/**
 * Ask EPL Genius a logistics question.
 * Uses a live API endpoint when VITE_GENIUS_API_URL is configured; otherwise
 * answers from the built-in knowledge base. The simulated latency mimics a
 * web-search round trip so the UI behaves the same either way.
 */
export async function askGenius(question: string): Promise<GeniusAnswer> {
  if (API_URL) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (res.ok) return (await res.json()) as GeniusAnswer;
    } catch {
      /* fall through to local KB */
    }
  }
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
  return localAnswer(question);
}
