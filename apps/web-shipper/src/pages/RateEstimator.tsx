import { useState, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  MapPin,
  Plane,
  Plus,
  Shield,
  Sparkles,
  ThermometerSun,
  Trash2,
  Truck,
  Zap,
  Weight,
  LayoutGrid,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransportMode = "air" | "road";

// Air freight
interface Pallet {
  id: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  grossKg: number;
  qty: number;
}

interface AirForm {
  originIata: string;
  destIata: string;
  pallets: Pallet[];
  commodity: string;
  specialHandling: string[];
}

// Road freight
type VehicleType = "tautliner" | "refrigerated" | "flatbed" | "container_chassis" | "lowbed" | "oversized";

interface CargoItem {
  id: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  qty: number;
  label: string;
}

interface RoadForm {
  originCity: string;
  destCity: string;
  vehicleType: VehicleType;
  cargoItems: CargoItem[];
  // Tautliner
  cbm: number;
  // Refrigerated
  minTempC: number;
  maxTempC: number;
  tempSensitivity: "ambient" | "chilled" | "frozen" | "pharma";
  // Flatbed / Lowbed / Oversized
  cargoLengthM: number;
  cargoWidthM: number;
  cargoHeightM: number;
  cargoWeightT: number;
  // Container chassis
  containerSize: "20" | "40" | "40HC" | "45";
}

// Results
interface RouteOption {
  label: string;
  tag: "fastest" | "cheapest" | "safest" | "recommended";
  distanceKm: number;
  transitDays: string;
  costUsd: number;
  riskScore: number; // 1-10
  borders: number;
  highlights: string[];
}

interface AirResult {
  totalGrossKg: number;
  totalVolumetricKg: number;
  totalChargeableKg: number;
  pallets: Array<{
    id: string;
    grossKg: number;
    volumetricKg: number;
    chargeableKg: number;
  }>;
  airlines: Array<{
    name: string;
    transitDays: string;
    costPerKg: number;
    totalCost: number;
    via: string;
    tag?: string;
  }>;
  routes: RouteOption[];
}

interface FreightCarrier {
  name: string;
  transitDays: string;
  totalCostUsd: number;
  costBreakdown: {
    baseFreight: number;
    fuelSurcharge: number;
    tolls: number;
    borderFees: number;
    extras: number;
  };
  tag?: string;
  note?: string;
}

interface VehicleInstruction {
  category: string;
  items: string[];
}

interface RoadResult {
  vehicleLabel: string;
  trailerSuggestion?: string;
  permitRequired: boolean;
  permitNotes?: string;
  escortRequired?: boolean;
  capacityInfo: string;
  freightCarriers: FreightCarrier[];
  instructions: VehicleInstruction[];
  routes: RouteOption[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_TYPES: { value: VehicleType; label: string; icon: string; desc: string }[] = [
  { value: "tautliner", label: "Tautliner / Curtainsider", icon: "🚛", desc: "Standard general cargo, palletised goods" },
  { value: "refrigerated", label: "Refrigerated (Reefer)", icon: "❄️", desc: "Temperature-controlled cargo" },
  { value: "flatbed", label: "Flatbed", icon: "🔲", desc: "Oversized machinery, steel, timber" },
  { value: "container_chassis", label: "Container Chassis", icon: "📦", desc: "ISO containers — 20ft, 40ft, 40HC, 45ft" },
  { value: "lowbed", label: "Lowbed / Step-deck", icon: "⬇️", desc: "Heavy lift, construction equipment" },
  { value: "oversized", label: "Oversized / Special", icon: "⚠️", desc: "Abnormal load requiring permits & escort" },
];

const CBM_VARIANTS = [96, 100, 110, 120, 130, 140];

const SPECIAL_HANDLING = ["DGR (Dangerous Goods)", "Live Animals", "Valuables / Jewelry", "Pharma GDP", "Perishables", "Human Remains"];

// ─── Mock result generators ────────────────────────────────────────────────────

function mockAirResult(form: AirForm): AirResult {
  const palletCalc = form.pallets.map((p) => {
    const volKg = ((p.lengthCm * p.widthCm * p.heightCm) / 6000) * p.qty;
    const grossTotal = p.grossKg * p.qty;
    const chargeableKg = Math.max(grossTotal, volKg);
    return { id: p.id, grossKg: grossTotal, volumetricKg: Math.round(volKg * 10) / 10, chargeableKg: Math.round(chargeableKg * 10) / 10 };
  });

  const totalGrossKg = palletCalc.reduce((s, p) => s + p.grossKg, 0);
  const totalVolumetricKg = Math.round(palletCalc.reduce((s, p) => s + p.volumetricKg, 0) * 10) / 10;
  const totalChargeableKg = Math.max(totalGrossKg, totalVolumetricKg);

  const baseRate = totalChargeableKg < 100 ? 4.8 : totalChargeableKg < 500 ? 3.6 : 2.9;

  return {
    totalGrossKg,
    totalVolumetricKg,
    totalChargeableKg,
    pallets: palletCalc,
    airlines: [
      {
        name: "Uzbekistan Airways Cargo",
        transitDays: "2-3 days",
        costPerKg: baseRate + 0.3,
        totalCost: Math.round(totalChargeableKg * (baseRate + 0.3)),
        via: "Direct",
        tag: "recommended",
      },
      {
        name: "Turkish Cargo",
        transitDays: "3-4 days",
        costPerKg: baseRate,
        totalCost: Math.round(totalChargeableKg * baseRate),
        via: "via IST",
        tag: "cheapest",
      },
      {
        name: "Qatar Airways Cargo",
        transitDays: "2-3 days",
        costPerKg: baseRate + 0.7,
        totalCost: Math.round(totalChargeableKg * (baseRate + 0.7)),
        via: "via DOH",
      },
      {
        name: "Lufthansa Cargo",
        transitDays: "1-2 days",
        costPerKg: baseRate + 1.4,
        totalCost: Math.round(totalChargeableKg * (baseRate + 1.4)),
        via: "via FRA",
        tag: "fastest",
      },
    ],
    routes: [
      {
        label: "Direct Non-stop",
        tag: "recommended",
        distanceKm: 5800,
        transitDays: "2-3 days",
        costUsd: Math.round(totalChargeableKg * (baseRate + 0.3)),
        riskScore: 2,
        borders: 0,
        highlights: ["No transhipment risk", "Fastest customs clearance", "UZ Air direct slot available"],
      },
      {
        label: "Istanbul Hub",
        tag: "cheapest",
        distanceKm: 6400,
        transitDays: "3-4 days",
        costUsd: Math.round(totalChargeableKg * baseRate),
        riskScore: 3,
        borders: 1,
        highlights: ["Lowest total cost", "Strong transshipment network", "IST cargo hub capacity available"],
      },
      {
        label: "Frankfurt Hub",
        tag: "fastest",
        distanceKm: 6900,
        transitDays: "1-2 days",
        costUsd: Math.round(totalChargeableKg * (baseRate + 1.4)),
        riskScore: 2,
        borders: 1,
        highlights: ["Premium express option", "LH cargo express slot", "DGR approved on this routing"],
      },
    ],
  };
}

const VEHICLE_INSTRUCTIONS: Record<VehicleType, VehicleInstruction[]> = {
  tautliner: [
    {
      category: "Loading requirements",
      items: [
        "Cargo must be palletised on EUR-pallets (120×80 cm) or industrial pallets (120×100 cm)",
        "Max floor load: 5,000 kg/axle — distribute weight evenly front-to-rear",
        "Stack height must not exceed trailer internal height (typically 270–295 cm)",
        "Secure all pallets with lashing straps — minimum 2 straps per pallet row",
        "Fragile or top-heavy cargo must be braced with load bars or airbags",
      ],
    },
    {
      category: "Documentation",
      items: [
        "CMR waybill (original × 3 copies) signed by shipper before departure",
        "Commercial invoice and packing list in English and Russian",
        "T1 transit document for EU-bound cargo passing through CIS",
        "Phytosanitary certificate if carrying agricultural products",
      ],
    },
    {
      category: "Driver & border instructions",
      items: [
        "Driver must carry valid international driving licence (IDP) and TIR carnet if applicable",
        "Rest stops mandatory: max 9 hours driving per day (EU ADR rules apply in transit)",
        "At Kazakh border (Chernyaevka / Gisht Köprik): present all docs in Russian",
        "Do not leave cargo unattended at border crossings for extended periods",
      ],
    },
    {
      category: "Prohibited cargo",
      items: [
        "DGR (dangerous goods) without full ADR certification and labelling",
        "Live animals — requires separate ATP/veterinary vehicle",
        "Cargo exceeding 24,000 kg gross weight without prior heavy-haulage approval",
      ],
    },
  ],
  refrigerated: [
    {
      category: "Temperature & pre-cooling",
      items: [
        "Pre-cool trailer to target temperature at least 2 hours before loading",
        "Do not load warm cargo — all products must be at target temp before stuffing",
        `Maintain set-point throughout: target range ${"-"} check form values`,
        "Continuous temperature recorder (data logger) must be active for entire journey",
        "Defrost cycles must not interrupt cold chain — use continuous mode for short legs",
      ],
    },
    {
      category: "Loading & stowage",
      items: [
        "Leave minimum 15 cm clearance between cargo and trailer walls for airflow",
        "Do not block the return air duct at the front of the trailer floor",
        "Stack cargo no higher than the load line marked on interior walls",
        "Use returnable plastic pallets rather than wooden to avoid moisture absorption",
      ],
    },
    {
      category: "Documentation",
      items: [
        "ATP (Agreement on the International Carriage of Perishable Foodstuffs) certificate for the vehicle",
        "Health/veterinary certificate for food products crossing international borders",
        "Temperature log printout must accompany delivery receipt (CMR)",
        "Phytosanitary certificate for fresh fruit and vegetables",
      ],
    },
    {
      category: "Emergency procedures",
      items: [
        "If refrigeration unit fails: notify EPL dispatcher immediately and find nearest workshop",
        "Driver must log any temperature excursion above set-point with timestamp",
        "For pharma cargo: GDP temperature excursion report required within 2 hours",
        "Emergency contact for reefer breakdown: EPL 24/7 ops centre",
      ],
    },
  ],
  flatbed: [
    {
      category: "Loading & securing",
      items: [
        "All cargo must be secured per EN 12195-1 lashing standard",
        "Minimum lashing capacity: 50% of cargo gross weight in each direction",
        "Steel coils and pipes: use V-boards and end chocks — never rely on friction alone",
        "Timber/lumber: at least 4 lashing points per bundle, cross-lashed preferred",
        "Cover tarpaulins required for all cargo susceptible to weather damage",
      ],
    },
    {
      category: "Dimensional limits (standard)",
      items: [
        "Max width without permit: 2.55 m (EU) / 2.60 m (UZ/KZ)",
        "Max height without permit: 4.00 m (EU) / 4.20 m (UZ/KZ)",
        "Max length without permit: 16.50 m overall (trailer + tractor)",
        "Overhang: rear overhang >1.0 m requires rear marker board; >4.0 m requires escort",
      ],
    },
    {
      category: "Documentation",
      items: [
        "CMR waybill with exact cargo dimensions and weight declared",
        "Special transport permit if any dimension exceeds standard limits",
        "Crane/lifting plan if cargo requires intermediate trans-loading",
        "Weight certificate from certified weigh station for cargo >20 t",
      ],
    },
    {
      category: "Route & timing",
      items: [
        "Oversized flatbed moves often restricted to daytime hours (06:00–22:00) by national rules",
        "Bridges and underpasses: verify clearances on planned route before departure",
        "Coordinate with EPL to avoid peak-traffic border crossing times",
      ],
    },
  ],
  container_chassis: [
    {
      category: "Container & chassis requirements",
      items: [
        "Verify container is ISO-certified and free of structural damage before accepting",
        "Twist locks must be fully engaged on all four corner castings before movement",
        "Check container seal number matches shipping documents — photograph before departure",
        "King-pin coupling: inspect and grease 5th wheel before every journey",
        "Chassis must have valid roadworthiness certificate (TüV / GOST-R equivalent)",
      ],
    },
    {
      category: "Weight & payload",
      items: [
        "20ft: max payload 21,700 kg (max gross 24,000 kg)",
        "40ft / 40HC: max payload 26,500 kg (max gross 30,480 kg)",
        "45ft PW: max payload 27,600 kg — verify local axle limits before loading",
        "Overweight containers require special permit and axle-weight certificate",
      ],
    },
    {
      category: "Documentation",
      items: [
        "Container release order (CRO) from shipping line before gate-out at depot",
        "Equipment Interchange Receipt (EIR) signed at pick-up and delivery",
        "CMR or CIM waybill depending on transit countries",
        "Dangerous goods declaration (DGD) if container holds hazmat cargo",
      ],
    },
    {
      category: "Terminal & depot instructions",
      items: [
        "Arrive at terminal within booking window — late arrivals may lose slot",
        "Driver must present booking reference, truck registration, and ID at gate",
        "Do not open container doors or break seals without customs authority present at destination",
      ],
    },
  ],
  lowbed: [
    {
      category: "Loading & rigging",
      items: [
        "Lowbed deck height: typically 80–100 cm — confirm with carrier before dispatch",
        "All lifting operations must be conducted by certified riggers",
        "Cargo centre of gravity must be declared — asymmetric loads require counterbalance calculation",
        "Ramps must be rated for cargo weight × dynamic factor (min 1.3×)",
        "Block and chain all tracks/wheels of self-propelled equipment on deck",
      ],
    },
    {
      category: "Permits & escort",
      items: [
        "Abnormal load permit required from each country transport ministry — allow 5–10 business days",
        "Route survey mandatory for cargo height >5.0 m to identify bridge/cable conflicts",
        "Police escort required in most CIS countries for width >3.5 m or height >5.0 m",
        "Pilot vehicle required: 1 front + 1 rear for width >4.0 m",
        "Night movement may be prohibited — confirm with permit authority",
      ],
    },
    {
      category: "Documentation",
      items: [
        "Special transport permit (original) must travel with the vehicle",
        "Approved route map signed by transport authority",
        "Cargo weight certificate from certified scales",
        "Insurance certificate covering abnormal transport liability",
        "CMR waybill with cargo dimensions and weight clearly stated",
      ],
    },
    {
      category: "Timing restrictions",
      items: [
        "Movement typically restricted: no movement Friday 18:00 – Monday 08:00 in EU",
        "Summer weight restrictions may apply on rural roads (spring thaw period: March–April)",
        "Public holidays: movement bans may apply — check per country before scheduling",
      ],
    },
  ],
  oversized: [
    {
      category: "Pre-transport planning (mandatory)",
      items: [
        "Engage EPL special transport team minimum 14 business days before required move date",
        "Full cargo dimensions, weight, and photos required for route feasibility assessment",
        "Bridge load calculations must be performed by certified structural engineer for cargo >80 t",
        "All utility and infrastructure obstructions (power lines, traffic lights) must be identified",
        "Utility companies must be notified and paid for any line-raising operations",
      ],
    },
    {
      category: "Permits & authorities",
      items: [
        "Special transport permit from Ministry of Transport in each transit country",
        "Police escort convoy mandatory — co-ordinate through EPL permit desk",
        "Military escort may be required in some CIS territories — minimum 4-week lead time",
        "Road authority approval for each bridge and structure on route",
        "Notify local municipalities of planned passage dates",
      ],
    },
    {
      category: "Vehicle & equipment",
      items: [
        "Modular multi-axle hydraulic trailer (SPMT) required for cargo >100 t",
        "All axles must be self-steering for tight turns — confirm with carrier",
        "Counter-ballast calculation required if cargo CoG is offset",
        "All indicator lights, beacons, and warning boards must be fully operational",
        "Spare tyres and hydraulic pump unit must accompany convoy",
      ],
    },
    {
      category: "On-road restrictions",
      items: [
        "Daylight movement only in most CIS and EU countries (07:00–19:00)",
        "Speed limit for oversized convoy: typically 40–60 km/h maximum",
        "No movement during adverse weather (high wind, ice, fog below 100 m visibility)",
        "All road users must be cleared from junction before convoy passes",
        "Convoy must stop at all designated weigh stations and present permits",
      ],
    },
  ],
};

function mockRoadResult(form: RoadForm): RoadResult {
  const isOversized = form.vehicleType === "oversized" || form.vehicleType === "lowbed";
  const isFlatbedPermit = form.vehicleType === "flatbed" && (form.cargoWidthM > 2.55 || form.cargoHeightM > 4.0);
  const permitRequired = isOversized || isFlatbedPermit;

  let trailerSuggestion: string | undefined;
  let capacityInfo = "";

  switch (form.vehicleType) {
    case "tautliner":
      if (form.cbm <= 96) trailerSuggestion = "Standard 13.6m Tautliner (96 CBM) — optimal fit";
      else if (form.cbm <= 110) trailerSuggestion = "Jumbo Trailer (110 CBM) recommended";
      else trailerSuggestion = "Mega / Double-deck Trailer (120–140 CBM) required";
      capacityInfo = `${form.cbm} CBM · Max payload ~24,000 kg · 13.6 m usable floor`;
      break;
    case "refrigerated":
      capacityInfo = `Reefer ${form.minTempC}°C / ${form.maxTempC}°C · 82 CBM · Max payload 22,000 kg · Diesel-powered Thermo King / Carrier unit`;
      break;
    case "flatbed":
      capacityInfo = `Cargo: ${form.cargoLengthM}m × ${form.cargoWidthM}m × ${form.cargoHeightM}m · ${form.cargoWeightT} t · Deck: steel platform, no side walls`;
      break;
    case "container_chassis":
      capacityInfo = `${form.containerSize}ft ISO container · Extendable chassis · Twist-lock securing`;
      break;
    case "lowbed":
      capacityInfo = `Cargo: ${form.cargoLengthM}m × ${form.cargoWidthM}m × ${form.cargoHeightM}m · ${form.cargoWeightT} t · Low deck ~90 cm from ground`;
      break;
    case "oversized":
      capacityInfo = `Abnormal load: ${form.cargoLengthM}m × ${form.cargoWidthM}m × ${form.cargoHeightM}m · ${form.cargoWeightT} t · Requires SPMT or multi-axle trailer`;
      break;
  }

  const permitAdd = permitRequired ? 800 : 0;
  const escortAdd = form.vehicleType === "oversized" ? 1500 : form.vehicleType === "lowbed" ? 900 : 0;
  const reeferAdd = form.vehicleType === "refrigerated" ? 400 : 0;
  const baseFreight = form.vehicleType === "oversized" ? 6800 : form.vehicleType === "lowbed" ? 5200 : 2400;

  const makeCarrier = (
    name: string,
    factor: number,
    transitDays: string,
    tag: string | undefined,
    note: string | undefined
  ): FreightCarrier => {
    const base = Math.round(baseFreight * factor);
    const fuel = Math.round(base * 0.14);
    const tolls = Math.round(180 * factor);
    const border = Math.round(120 * factor);
    const extras = permitAdd + escortAdd + reeferAdd;
    return {
      name,
      transitDays,
      totalCostUsd: base + fuel + tolls + border + extras,
      costBreakdown: { baseFreight: base, fuelSurcharge: fuel, tolls, borderFees: border, extras },
      tag,
      note,
    };
  };

  const freightCarriers: FreightCarrier[] = [
    makeCarrier("EPL Road Express", 1.0, "4–5 days", "recommended", "EPL managed — one point of contact, door-to-door"),
    makeCarrier("Trans-Caspian Lines", 0.88, "5–6 days", "cheapest", "Budget option, shared load consolidation available"),
    makeCarrier("SilkRoute Cargo", 1.08, "3–4 days", "fastest", "Express service, dedicated truck, priority border crossing"),
    makeCarrier("EuroAsia Freight", 0.95, "4–5 days", undefined, "Strong UZ–DE corridor, reliable but no express guarantee"),
  ];

  return {
    vehicleLabel: VEHICLE_TYPES.find((v) => v.value === form.vehicleType)?.label ?? form.vehicleType,
    trailerSuggestion,
    capacityInfo,
    permitRequired,
    permitNotes: permitRequired
      ? `Special transport permit required from ${form.originCity} transport authority. Apply 5–10 business days before departure. Cargo: ${form.cargoLengthM}m × ${form.cargoWidthM}m × ${form.cargoHeightM}m · ${form.cargoWeightT} t.`
      : undefined,
    escortRequired: form.vehicleType === "oversized" || form.vehicleType === "lowbed",
    freightCarriers,
    instructions: VEHICLE_INSTRUCTIONS[form.vehicleType],
    routes: [
      {
        label: "M39 / A380 Motorway Route",
        tag: "recommended",
        distanceKm: 3420,
        transitDays: "4–5 days",
        costUsd: freightCarriers[0].totalCostUsd,
        riskScore: 3,
        borders: 2,
        highlights: ["Main corridor, best road quality", `Tolls: ~$${Math.round(180)} en route`, "Border: Uzbek–Kazakh + Kazakh–Russian / Georgian"],
      },
      {
        label: "Trans-Caspian Route",
        tag: "fastest",
        distanceKm: 2900,
        transitDays: "3–4 days",
        costUsd: freightCarriers[2].totalCostUsd,
        riskScore: 5,
        borders: 3,
        highlights: ["Caspian Sea ferry crossing (Aktau–Baku)", "Seasonal: ferry delays in Nov–Mar", "Faster but higher transhipment risk"],
      },
      {
        label: "Southern Route via Iran",
        tag: "cheapest",
        distanceKm: 3100,
        transitDays: "5–7 days",
        costUsd: freightCarriers[1].totalCostUsd,
        riskScore: 7,
        borders: 3,
        highlights: ["Lowest base cost", "Sanctions compliance check required for some cargo", "Higher customs dwell risk at IR borders"],
      },
    ],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newPallet(): Pallet {
  return { id: Math.random().toString(36).slice(2), lengthCm: 120, widthCm: 80, heightCm: 100, grossKg: 250, qty: 1 };
}

function newCargoItem(label?: string): CargoItem {
  return { id: Math.random().toString(36).slice(2), lengthCm: 120, widthCm: 80, heightCm: 100, weightKg: 500, qty: 1, label: label ?? "Cargo" };
}

// Trailer internal dimensions (cm)
const TRAILER_DIMS: Record<string, { L: number; W: number; H: number; maxKg: number }> = {
  "tautliner-96":  { L: 1360, W: 245, H: 270, maxKg: 24000 },
  "tautliner-100": { L: 1360, W: 245, H: 280, maxKg: 24000 },
  "tautliner-110": { L: 1360, W: 245, H: 305, maxKg: 24000 },
  "tautliner-120": { L: 1390, W: 245, H: 305, maxKg: 24000 },
  "tautliner-130": { L: 1390, W: 245, H: 340, maxKg: 24000 },
  "tautliner-140": { L: 1390, W: 245, H: 375, maxKg: 24000 },
  "refrigerated":  { L: 1330, W: 240, H: 260, maxKg: 22000 },
  "flatbed":       { L: 1360, W: 255, H: 400, maxKg: 24000 },
  "container_chassis-20":   { L: 590,  W: 234, H: 239, maxKg: 21700 },
  "container_chassis-40":   { L: 1203, W: 234, H: 239, maxKg: 26500 },
  "container_chassis-40HC": { L: 1203, W: 234, H: 269, maxKg: 26500 },
  "container_chassis-45":   { L: 1360, W: 234, H: 269, maxKg: 27600 },
  "lowbed":  { L: 1400, W: 300, H: 500, maxKg: 60000 },
  "oversized": { L: 2000, W: 500, H: 600, maxKg: 150000 },
};

function riskColor(score: number) {
  if (score <= 3) return "text-emerald-600";
  if (score <= 6) return "text-amber-600";
  return "text-red-600";
}

function riskLabel(score: number) {
  if (score <= 3) return "Low";
  if (score <= 6) return "Medium";
  return "High";
}

const TAG_META: Record<string, { label: string; color: string }> = {
  recommended: { label: "Recommended", color: "bg-brand-600 text-white" },
  fastest:     { label: "Fastest",     color: "bg-indigo-600 text-white" },
  cheapest:    { label: "Cheapest",    color: "bg-emerald-600 text-white" },
  safest:      { label: "Safest",      color: "bg-slate-700 text-white" },
};

// ─── Cargo Visualization ──────────────────────────────────────────────────────

const CARGO_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16", "#f97316", "#ec4899",
];

function getTrailerKey(form: RoadForm): string {
  if (form.vehicleType === "tautliner") return `tautliner-${form.cbm}`;
  if (form.vehicleType === "container_chassis") return `container_chassis-${form.containerSize}`;
  return form.vehicleType;
}

function CargoVisualization({ form }: { form: RoadForm }) {
  const trailerKey = getTrailerKey(form);
  const dims = TRAILER_DIMS[trailerKey] ?? TRAILER_DIMS["tautliner-96"];

  // Calculate totals
  const totalVolCm3 = useMemo(() =>
    form.cargoItems.reduce((s, c) => s + c.lengthCm * c.widthCm * c.heightCm * c.qty, 0),
    [form.cargoItems]
  );
  const totalWeightKg = useMemo(() =>
    form.cargoItems.reduce((s, c) => s + c.weightKg * c.qty, 0),
    [form.cargoItems]
  );
  const trailerVolCm3 = dims.L * dims.W * dims.H;
  const spacePct = Math.min(100, (totalVolCm3 / trailerVolCm3) * 100);
  const weightPct = Math.min(100, (totalWeightKg / dims.maxKg) * 100);
  const isOverVolume = spacePct > 100;
  const isOverWeight = weightPct > 100;

  // SVG canvas dimensions
  const W = 520;
  const H = 200;
  const MARGIN = { l: 80, r: 16, t: 24, b: 36 };
  // Trailer body in SVG coords
  const tw = W - MARGIN.l - MARGIN.r; // trailer width in px
  const th = H - MARGIN.t - MARGIN.b; // trailer height in px
  const tx = MARGIN.l;
  const ty = MARGIN.t;

  // Scale factors: SVG length = trailer L cm; SVG height = trailer H cm
  const scaleX = tw / dims.L;
  const scaleY = th / dims.H;

  // Pack cargo items left-to-right, single layer (top-down view uses L×W; side view uses L×H)
  // We show side view (length × height) with stacking
  type Block = { x: number; y: number; w: number; h: number; color: string; label: string; overflow: boolean };
  const blocks: Block[] = [];
  let cursorX = 0;
  let cursorY = 0; // from bottom up
  let rowH = 0;

  for (let ci = 0; ci < form.cargoItems.length; ci++) {
    const item = form.cargoItems[ci];
    const color = CARGO_COLORS[ci % CARGO_COLORS.length];
    for (let q = 0; q < Math.min(item.qty, 20); q++) {
      const bw = item.lengthCm * scaleX;
      const bh = item.heightCm * scaleY;
      if (cursorX + bw > tw + 1) {
        // wrap to next row
        cursorY += rowH;
        cursorX = 0;
        rowH = 0;
      }
      const overflow = cursorY + bh > th + 1;
      blocks.push({
        x: tx + cursorX,
        y: ty + th - cursorY - bh,
        w: Math.min(bw, tw - cursorX),
        h: Math.min(bh, th - cursorY),
        color,
        label: item.label || `C${ci + 1}`,
        overflow,
      });
      cursorX += bw;
      rowH = Math.max(rowH, bh);
    }
  }

  // Temperature zone color for reefer
  const tempZone =
    form.vehicleType === "refrigerated"
      ? form.tempSensitivity === "frozen"
        ? { bg: "#bfdbfe", border: "#3b82f6", label: "Frozen zone (< −18°C)" }
        : form.tempSensitivity === "pharma"
        ? { bg: "#e0e7ff", border: "#6366f1", label: "Pharma zone (+2 to +8°C)" }
        : form.tempSensitivity === "chilled"
        ? { bg: "#d1fae5", border: "#10b981", label: "Chilled zone (+2 to +8°C)" }
        : { bg: "#fef9c3", border: "#eab308", label: "Ambient zone (+15 to +25°C)" }
      : null;

  // CBM recommendation for tautliner
  let cbmRec: { icon: string; text: string; tone: string } | null = null;
  if (form.vehicleType === "tautliner") {
    const usedCbm = totalVolCm3 / 1_000_000;
    const trailerCbm = trailerVolCm3 / 1_000_000;
    const fillRatio = usedCbm / trailerCbm;
    if (fillRatio < 0.5) cbmRec = { icon: "⚠", text: `${trailerCbm.toFixed(0)} CBM underutilised — consider smaller trailer`, tone: "amber" };
    else if (fillRatio > 0.98) cbmRec = { icon: "⚠", text: "Cargo exceeds trailer capacity — add another unit", tone: "red" };
    else cbmRec = { icon: "✔", text: `${trailerCbm.toFixed(0)} CBM trailer is optimal for this cargo`, tone: "green" };
  }

  return (
    <div className="space-y-3">
      {/* SVG Trailer */}
      <div className="rounded-xl border border-slate-200 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Live Cargo View — Side Profile</span>
          <span className="text-[10px] text-slate-500">Scale: {dims.L / 100}m × {dims.H / 100}m internal</span>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
          {/* Temp zone overlay for reefer */}
          {tempZone && (
            <rect x={tx} y={ty} width={tw} height={th} fill={tempZone.bg} opacity={0.35} />
          )}

          {/* Cargo blocks */}
          {blocks.map((b, i) => (
            <g key={i}>
              <rect
                x={b.x + 1} y={b.y + 1}
                width={Math.max(b.w - 2, 2)} height={Math.max(b.h - 2, 2)}
                rx={2}
                fill={b.overflow ? "#ef4444" : b.color}
                opacity={b.overflow ? 0.5 : 0.85}
                stroke={b.overflow ? "#dc2626" : "rgba(255,255,255,0.3)"}
                strokeWidth={1}
              />
              {b.w > 28 && b.h > 14 && (
                <text
                  x={b.x + b.w / 2} y={b.y + b.h / 2 + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(255,255,255,0.9)"
                  fontFamily="system-ui"
                  fontWeight="600"
                >
                  {b.label}
                </text>
              )}
            </g>
          ))}

          {/* Trailer outline */}
          <rect x={tx} y={ty} width={tw} height={th}
            fill="none" stroke="#94a3b8" strokeWidth={2} rx={3} />

          {/* Cab silhouette */}
          <rect x={tx - 60} y={ty + th * 0.2} width={58} height={th * 0.8}
            fill="#334155" rx={4} />
          <rect x={tx - 64} y={ty + th * 0.25} width={66} height={th * 0.6}
            fill="#1e293b" rx={3} />
          {/* Windshield */}
          <rect x={tx - 58} y={ty + th * 0.28} width={34} height={th * 0.28}
            fill="#38bdf8" opacity={0.5} rx={2} />
          {/* Wheels */}
          {[tx - 50, tx - 20, tx + tw * 0.25, tx + tw * 0.75].map((wx, i) => (
            <ellipse key={i} cx={wx} cy={ty + th + 8} rx={10} ry={10} fill="#1e293b" stroke="#64748b" strokeWidth={2} />
          ))}

          {/* Dimension label bottom */}
          <text x={tx + tw / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="system-ui">
            {dims.L / 100}m (floor length)
          </text>
          {/* Height label left */}
          <text x={tx - 6} y={ty + th / 2} textAnchor="end" fontSize={9} fill="#64748b" fontFamily="system-ui">
            {dims.H / 100}m
          </text>

          {/* Temp zone label */}
          {tempZone && (
            <text x={tx + 8} y={ty + 14} fontSize={9} fill={tempZone.border} fontFamily="system-ui" fontWeight="600">
              {tempZone.label}
            </text>
          )}
        </svg>
      </div>

      {/* Utilisation bars */}
      <div className="grid grid-cols-2 gap-3">
        {/* Space */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <LayoutGrid size={10} /> Space
            </span>
            <span className={cn("text-xs font-bold", isOverVolume ? "text-red-600" : spacePct > 85 ? "text-amber-600" : "text-emerald-600")}>
              {spacePct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", isOverVolume ? "bg-red-500" : spacePct > 85 ? "bg-amber-500" : "bg-emerald-500")}
              style={{ width: `${Math.min(spacePct, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            {(totalVolCm3 / 1_000_000).toFixed(2)} / {(trailerVolCm3 / 1_000_000).toFixed(0)} m³
          </p>
        </div>
        {/* Weight */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Weight size={10} /> Weight
            </span>
            <span className={cn("text-xs font-bold", isOverWeight ? "text-red-600" : weightPct > 85 ? "text-amber-600" : "text-emerald-600")}>
              {weightPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", isOverWeight ? "bg-red-500" : weightPct > 85 ? "bg-amber-500" : "bg-emerald-500")}
              style={{ width: `${Math.min(weightPct, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            {totalWeightKg.toLocaleString()} / {dims.maxKg.toLocaleString()} kg
          </p>
        </div>
      </div>

      {/* CBM recommendation for tautliner */}
      {cbmRec && (
        <div className={cn(
          "flex items-start gap-2 rounded-lg px-3 py-2 text-xs ring-1",
          cbmRec.tone === "green" ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
          : cbmRec.tone === "amber" ? "bg-amber-50 text-amber-800 ring-amber-200"
          : "bg-red-50 text-red-800 ring-red-200"
        )}>
          <span>{cbmRec.icon}</span>
          <span>{cbmRec.text}</span>
        </div>
      )}

      {/* Overflow warning */}
      {(isOverVolume || isOverWeight) && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            {isOverVolume && isOverWeight ? "Cargo exceeds both volume and weight limits" :
             isOverVolume ? "Cargo volume exceeds trailer capacity" :
             "Cargo weight exceeds payload limit"}
            {" "}— split across multiple vehicles or select a larger unit.
          </span>
        </div>
      )}

      {/* Cargo legend */}
      {form.cargoItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {form.cargoItems.map((item, i) => (
            <span key={item.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: CARGO_COLORS[i % CARGO_COLORS.length] }}>
              {item.label || `C${i + 1}`} · {item.lengthCm}×{item.widthCm}×{item.heightCm} cm · {item.weightKg} kg ×{item.qty}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeCard({ mode, active, onClick }: { mode: TransportMode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
        active
          ? "border-brand-500 bg-brand-50 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      {mode === "air" ? (
        <Plane size={28} className={active ? "text-brand-600" : "text-slate-400"} />
      ) : (
        <Truck size={28} className={active ? "text-brand-600" : "text-slate-400"} />
      )}
      <span className={cn("text-sm font-semibold", active ? "text-brand-700" : "text-slate-600")}>
        {mode === "air" ? "Air Freight" : "Road Freight"}
      </span>
    </button>
  );
}

function PalletRow({
  pallet,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  pallet: Pallet;
  index: number;
  onChange: (p: Pallet) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const volKg = ((pallet.lengthCm * pallet.widthCm * pallet.heightCm) / 6000) * pallet.qty;
  const grossTotal = pallet.grossKg * pallet.qty;
  const chargeableKg = Math.max(grossTotal, volKg);
  const volHeavy = volKg > grossTotal;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pallet {index + 1}</span>
        {canRemove && (
          <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        <Field label="L (cm)">
          <Input
            type="number"
            value={pallet.lengthCm}
            onChange={(e) => onChange({ ...pallet, lengthCm: +e.target.value })}
          />
        </Field>
        <Field label="W (cm)">
          <Input
            type="number"
            value={pallet.widthCm}
            onChange={(e) => onChange({ ...pallet, widthCm: +e.target.value })}
          />
        </Field>
        <Field label="H (cm)">
          <Input
            type="number"
            value={pallet.heightCm}
            onChange={(e) => onChange({ ...pallet, heightCm: +e.target.value })}
          />
        </Field>
        <Field label="Gross (kg)">
          <Input
            type="number"
            value={pallet.grossKg}
            onChange={(e) => onChange({ ...pallet, grossKg: +e.target.value })}
          />
        </Field>
        <Field label="Qty">
          <Input
            type="number"
            min={1}
            value={pallet.qty}
            onChange={(e) => onChange({ ...pallet, qty: Math.max(1, +e.target.value) })}
          />
        </Field>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
        <span>Volumetric: <span className={cn("font-semibold", volHeavy ? "text-amber-600" : "text-slate-700")}>{Math.round(volKg * 10) / 10} kg</span></span>
        <span>Gross total: <span className="font-semibold text-slate-700">{grossTotal} kg</span></span>
        <span className="ml-auto">
          Chargeable:{" "}
          <span className="font-bold text-brand-700">{Math.round(chargeableKg * 10) / 10} kg</span>
          {volHeavy && (
            <span className="ml-1 rounded bg-amber-100 px-1 text-amber-700">vol-weight applies</span>
          )}
        </span>
      </div>
    </div>
  );
}

function RouteCard({ route }: { route: RouteOption }) {
  const [open, setOpen] = useState(false);
  const meta = TAG_META[route.tag];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        route.tag === "recommended" ? "border-brand-300 bg-brand-50/40 shadow-sm" : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-900">{route.label}</span>
            {meta && (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", meta.color)}>
                {meta.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {route.distanceKm.toLocaleString()} km
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} /> {route.transitDays}
            </span>
            <span className="flex items-center gap-1">
              <Shield size={11} />
              <span className={riskColor(route.riskScore)}>
                {riskLabel(route.riskScore)} risk ({route.riskScore}/10)
              </span>
            </span>
            <span>{route.borders} border crossing{route.borders !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-slate-900">{formatCurrency(route.costUsd)}</p>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-brand-600 hover:underline flex items-center gap-0.5 ml-auto"
          >
            Details {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>
      {open && (
        <ul className="mt-3 space-y-1 border-t border-slate-200 pt-3">
          {route.highlights.map((h) => (
            <li key={h} className="flex items-start gap-1.5 text-xs text-slate-600">
              <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-500" />
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Air Freight Panel ────────────────────────────────────────────────────────

function AirFreightForm({
  form,
  onChange,
  onSubmit,
  busy,
}: {
  form: AirForm;
  onChange: (f: AirForm) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const set = <K extends keyof AirForm>(k: K, v: AirForm[K]) => onChange({ ...form, [k]: v });

  const toggleHandling = (h: string) => {
    set(
      "specialHandling",
      form.specialHandling.includes(h) ? form.specialHandling.filter((x) => x !== h) : [...form.specialHandling, h]
    );
  };

  const updatePallet = (id: string, p: Pallet) =>
    set("pallets", form.pallets.map((x) => (x.id === id ? p : x)));

  const removePallet = (id: string) =>
    set("pallets", form.pallets.filter((x) => x.id !== id));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Origin Airport (IATA)">
          <Input
            placeholder="e.g. TAS"
            value={form.originIata}
            onChange={(e) => set("originIata", e.target.value.toUpperCase().slice(0, 3))}
          />
        </Field>
        <Field label="Destination Airport (IATA)">
          <Input
            placeholder="e.g. FRA"
            value={form.destIata}
            onChange={(e) => set("destIata", e.target.value.toUpperCase().slice(0, 3))}
          />
        </Field>
      </div>

      <Field label="Commodity description">
        <Input
          placeholder="e.g. Cotton fabric, auto parts, electronics"
          value={form.commodity}
          onChange={(e) => set("commodity", e.target.value)}
        />
      </Field>

      <div>
        <p className="mb-1 text-xs font-semibold text-slate-600">Special handling</p>
        <div className="flex flex-wrap gap-1.5">
          {SPECIAL_HANDLING.map((h) => (
            <button
              key={h}
              onClick={() => toggleHandling(h)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                form.specialHandling.includes(h)
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              )}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600">Cargo pieces / pallets</p>
          <button
            onClick={() => set("pallets", [...form.pallets, newPallet()])}
            className="flex items-center gap-1 rounded-lg border border-dashed border-brand-400 px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <Plus size={12} /> Add pallet
          </button>
        </div>
        <div className="space-y-2">
          {form.pallets.map((p, i) => (
            <PalletRow
              key={p.id}
              pallet={p}
              index={i}
              onChange={(updated) => updatePallet(p.id, updated)}
              onRemove={() => removePallet(p.id)}
              canRemove={form.pallets.length > 1}
            />
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={onSubmit} disabled={busy || !form.originIata || !form.destIata}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        Get Air Freight Rates
      </Button>
    </div>
  );
}

// ─── Road Freight Panel ───────────────────────────────────────────────────────

function CargoItemRow({
  item,
  index,
  colorHex,
  onChange,
  onRemove,
  canRemove,
}: {
  item: CargoItem;
  index: number;
  colorHex: string;
  onChange: (c: CargoItem) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: colorHex }} />
        <input
          className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400"
          placeholder={`Cargo item ${index + 1}`}
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
        />
        {canRemove && (
          <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        <Field label="L (cm)">
          <Input type="number" value={item.lengthCm} onChange={(e) => onChange({ ...item, lengthCm: +e.target.value })} />
        </Field>
        <Field label="W (cm)">
          <Input type="number" value={item.widthCm} onChange={(e) => onChange({ ...item, widthCm: +e.target.value })} />
        </Field>
        <Field label="H (cm)">
          <Input type="number" value={item.heightCm} onChange={(e) => onChange({ ...item, heightCm: +e.target.value })} />
        </Field>
        <Field label="kg/unit">
          <Input type="number" value={item.weightKg} onChange={(e) => onChange({ ...item, weightKg: +e.target.value })} />
        </Field>
        <Field label="Qty">
          <Input type="number" min={1} value={item.qty} onChange={(e) => onChange({ ...item, qty: Math.max(1, +e.target.value) })} />
        </Field>
      </div>
      <div className="mt-1.5 text-[10px] text-slate-400">
        Vol: {((item.lengthCm * item.widthCm * item.heightCm * item.qty) / 1_000_000).toFixed(3)} m³ · Weight: {(item.weightKg * item.qty).toLocaleString()} kg
      </div>
    </div>
  );
}

function RoadFreightPanel({
  form,
  onChange,
  onSubmit,
  busy,
}: {
  form: RoadForm;
  onChange: (f: RoadForm) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const set = <K extends keyof RoadForm>(k: K, v: RoadForm[K]) => onChange({ ...form, [k]: v });
  const vt = form.vehicleType;

  const updateCargo = (id: string, c: CargoItem) =>
    set("cargoItems", form.cargoItems.map((x) => (x.id === id ? c : x)));
  const removeCargo = (id: string) =>
    set("cargoItems", form.cargoItems.filter((x) => x.id !== id));
  const addCargo = () =>
    set("cargoItems", [...form.cargoItems, newCargoItem(`Cargo ${form.cargoItems.length + 1}`)]);

  const tempInvalid = vt === "refrigerated" && form.maxTempC < form.minTempC;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

      {/* ── LEFT: Inputs ── */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
            <Truck size={12} /> Shipment details
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Origin">
              <Input placeholder="Tashkent, UZ" value={form.originCity} onChange={(e) => set("originCity", e.target.value)} />
            </Field>
            <Field label="Destination">
              <Input placeholder="Hamburg, DE" value={form.destCity} onChange={(e) => set("destCity", e.target.value)} />
            </Field>
          </div>

          {/* Vehicle type */}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Vehicle type</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {VEHICLE_TYPES.map((v) => (
                <button
                  key={v.value}
                  onClick={() => set("vehicleType", v.value)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-xl border-2 p-2.5 text-left transition-all",
                    form.vehicleType === v.value
                      ? "border-brand-500 bg-brand-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <span className="text-lg">{v.icon}</span>
                  <span className={cn("text-[11px] font-semibold leading-tight", form.vehicleType === v.value ? "text-brand-700" : "text-slate-700")}>
                    {v.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tautliner CBM */}
          {vt === "tautliner" && (
            <Field label="Trailer size">
              <div className="grid grid-cols-3 gap-1.5">
                {CBM_VARIANTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => set("cbm", c)}
                    className={cn(
                      "rounded-lg border py-1.5 text-xs font-semibold transition-all",
                      form.cbm === c ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {c} CBM
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* Refrigerated temp */}
          {vt === "refrigerated" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min °C">
                  <Input type="number" value={form.minTempC} onChange={(e) => set("minTempC", +e.target.value)} />
                </Field>
                <Field label="Max °C">
                  <Input type="number" value={form.maxTempC} onChange={(e) => set("maxTempC", +e.target.value)} />
                </Field>
              </div>
              <Field label="Cargo sensitivity">
                <Select value={form.tempSensitivity} onChange={(e) => set("tempSensitivity", e.target.value as RoadForm["tempSensitivity"])}>
                  <option value="ambient">Ambient (+15 to +25°C)</option>
                  <option value="chilled">Chilled (+2 to +8°C)</option>
                  <option value="frozen">Frozen (below −18°C)</option>
                  <option value="pharma">Pharma GDP (+2 to +8°C)</option>
                </Select>
              </Field>
              {tempInvalid && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
                  <AlertTriangle size={12} /> Max must be ≥ min temperature
                </div>
              )}
            </div>
          )}

          {/* Flatbed / Lowbed / Oversized dims */}
          {(vt === "flatbed" || vt === "lowbed" || vt === "oversized") && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">Cargo dimensions & weight</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Length (m)">
                  <Input type="number" step="0.1" value={form.cargoLengthM} onChange={(e) => set("cargoLengthM", +e.target.value)} />
                </Field>
                <Field label="Width (m)">
                  <Input type="number" step="0.1" value={form.cargoWidthM} onChange={(e) => set("cargoWidthM", +e.target.value)} />
                </Field>
                <Field label="Height (m)">
                  <Input type="number" step="0.1" value={form.cargoHeightM} onChange={(e) => set("cargoHeightM", +e.target.value)} />
                </Field>
                <Field label="Weight (tons)">
                  <Input type="number" step="0.5" value={form.cargoWeightT} onChange={(e) => set("cargoWeightT", +e.target.value)} />
                </Field>
              </div>
              {(form.cargoWidthM > 2.55 || form.cargoHeightM > 4.0) && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>Exceeds standard limits — abnormal load permit required</span>
                </div>
              )}
            </div>
          )}

          {/* Container size */}
          {vt === "container_chassis" && (
            <Field label="Container size">
              <Select value={form.containerSize} onChange={(e) => set("containerSize", e.target.value as RoadForm["containerSize"])}>
                <option value="20">20ft Standard</option>
                <option value="40">40ft Standard</option>
                <option value="40HC">40ft High Cube</option>
                <option value="45">45ft Pallet Wide</option>
              </Select>
            </Field>
          )}
        </div>

        {/* Cargo items */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cargo items</p>
            <button
              onClick={addCargo}
              className="flex items-center gap-1 rounded-lg border border-dashed border-brand-400 px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
            >
              <Plus size={12} /> Add item
            </button>
          </div>
          <div className="space-y-2">
            {form.cargoItems.map((item, i) => (
              <CargoItemRow
                key={item.id}
                item={item}
                index={i}
                colorHex={CARGO_COLORS[i % CARGO_COLORS.length]}
                onChange={(c) => updateCargo(item.id, c)}
                onRemove={() => removeCargo(item.id)}
                canRemove={form.cargoItems.length > 1}
              />
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          onClick={onSubmit}
          disabled={busy || !form.originCity || !form.destCity || tempInvalid}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Get Road Freight Rates &amp; Routes
        </Button>
      </div>

      {/* ── RIGHT: Live Visualization ── */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5 pt-0.5">
          <LayoutGrid size={12} /> Live cargo visualization
        </p>
        <CargoVisualization form={form} />
      </div>
    </div>
  );
}

// ─── Air Results Panel ────────────────────────────────────────────────────────

function AirResultsPanel({ result, form }: { result: AirResult; form: AirForm }) {
  return (
    <div className="space-y-5">
      {/* Weight summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Chargeable weight calculation
        </p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{result.totalGrossKg.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Actual gross (kg)</p>
          </div>
          <div className="text-center">
            <p className={cn("text-2xl font-bold", result.totalVolumetricKg > result.totalGrossKg ? "text-amber-600" : "text-slate-900")}>
              {result.totalVolumetricKg.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Volumetric (kg)</p>
            <p className="text-[10px] text-slate-400">L×W×H÷6000</p>
          </div>
          <div className="text-center rounded-lg bg-brand-50 py-2">
            <p className="text-2xl font-bold text-brand-700">{result.totalChargeableKg.toLocaleString()}</p>
            <p className="text-xs text-brand-600 font-medium">Chargeable (kg)</p>
            <p className="text-[10px] text-slate-400">max(gross, vol)</p>
          </div>
        </div>
        {result.pallets.length > 1 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Per-pallet breakdown</p>
            <div className="space-y-1">
              {result.pallets.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between text-xs text-slate-600">
                  <span className="text-slate-400">Pallet {i + 1}</span>
                  <span>Gross: {p.grossKg} kg</span>
                  <span>Vol: {p.volumetricKg} kg</span>
                  <span className="font-semibold text-slate-800">Chargeable: {p.chargeableKg} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Airline quotes */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Airline rates — {form.originIata} → {form.destIata}
        </p>
        <div className="space-y-2">
          {result.airlines.map((a) => {
            const meta = a.tag ? TAG_META[a.tag] : undefined;
            return (
              <div
                key={a.name}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3",
                  a.tag === "recommended" ? "border-brand-200 bg-brand-50/30" : "border-slate-100 bg-slate-50"
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{a.name}</span>
                    {meta && (
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", meta.color)}>
                        {meta.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{a.via} · {a.transitDays}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(a.totalCost)}</p>
                  <p className="text-xs text-slate-400">${a.costPerKg.toFixed(2)}/kg</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Route options */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">AI route analysis</p>
        <div className="space-y-3">
          {result.routes.map((r) => (
            <RouteCard key={r.label} route={r} />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 text-center">
        Indicative rates based on current market conditions. Contact EPL freight desk for firm quotes.
      </p>
    </div>
  );
}

// ─── Road Results Panel ───────────────────────────────────────────────────────

function FreightCarrierCard({ carrier }: { carrier: FreightCarrier }) {
  const [open, setOpen] = useState(false);
  const meta = carrier.tag ? TAG_META[carrier.tag] : undefined;
  const { baseFreight, fuelSurcharge, tolls, borderFees, extras } = carrier.costBreakdown;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        carrier.tag === "recommended" ? "border-brand-300 bg-brand-50/40 shadow-sm" : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-slate-900">{carrier.name}</span>
            {meta && (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", meta.color)}>
                {meta.label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{carrier.transitDays}</p>
          {carrier.note && <p className="text-xs text-slate-400 mt-0.5 italic">{carrier.note}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-slate-900">{formatCurrency(carrier.totalCostUsd)}</p>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-brand-600 hover:underline flex items-center gap-0.5 ml-auto mt-0.5"
          >
            Cost breakdown {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3 border-t border-slate-200 pt-3 space-y-1.5">
          {[
            { label: "Base freight", value: baseFreight },
            { label: "Fuel surcharge (14%)", value: fuelSurcharge },
            { label: "Road tolls", value: tolls },
            { label: "Border / customs fees", value: borderFees },
            ...(extras > 0 ? [{ label: "Permits / escort / reefer", value: extras }] : []),
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{row.label}</span>
              <span className="font-medium text-slate-700">{formatCurrency(row.value)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-xs font-bold">
            <span className="text-slate-700">Total estimated</span>
            <span className="text-slate-900">{formatCurrency(carrier.totalCostUsd)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function InstructionSection({ section, defaultOpen }: { section: VehicleInstruction; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-800">{section.category}</span>
        {open ? <ChevronUp size={15} className="text-slate-400 shrink-0" /> : <ChevronDown size={15} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <ul className="border-t border-slate-100 px-4 pb-3 pt-2 space-y-2">
          {section.items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoadResultsPanel({ result, form }: { result: RoadResult; form: RoadForm }) {
  return (
    <div className="space-y-5">
      {/* Vehicle summary card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 shrink-0">
            <Truck size={18} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">{result.vehicleLabel}</p>
            {result.trailerSuggestion && (
              <p className="text-xs text-brand-600 font-medium mt-0.5">{result.trailerSuggestion}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">{result.capacityInfo}</p>
          </div>
        </div>

        {form.vehicleType === "refrigerated" && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 ring-1 ring-blue-200">
            <ThermometerSun size={13} className="shrink-0" />
            Temp range: <span className="font-semibold">{form.minTempC}°C to {form.maxTempC}°C</span> · ATP certified reefer required · Continuous data logger mandatory
          </div>
        )}

        {result.permitRequired && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold mb-0.5">Special transport permit required</p>
              <p>{result.permitNotes}</p>
            </div>
          </div>
        )}

        {result.escortRequired && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
            <Zap size={13} className="shrink-0" />
            Police / pilot escort convoy required throughout journey — coordinated by EPL permit desk
          </div>
        )}

        {!result.permitRequired && !result.escortRequired && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 size={13} className="shrink-0" />
            Standard transport — no special permits or escort required
          </div>
        )}
      </div>

      {/* Freight carrier quotes */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Freight carrier quotes — {form.originCity} → {form.destCity}
        </p>
        <div className="space-y-3">
          {result.freightCarriers.map((c) => (
            <FreightCarrierCard key={c.name} carrier={c} />
          ))}
        </div>
      </div>

      {/* Route options */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          AI route analysis
        </p>
        <div className="space-y-3">
          {result.routes.map((r) => (
            <RouteCard key={r.label} route={r} />
          ))}
        </div>
      </div>

      {/* Vehicle-specific instructions */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Transport instructions — {result.vehicleLabel}
        </p>
        <div className="space-y-2">
          {result.instructions.map((section, i) => (
            <InstructionSection key={section.category} section={section} defaultOpen={i === 0} />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 text-center">
        Indicative rates. Permit timelines and border conditions subject to change. Contact EPL road desk for firm quotes.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RateEstimator() {
  const [mode, setMode] = useState<TransportMode>("air");
  const [busy, setBusy] = useState(false);

  const [airForm, setAirForm] = useState<AirForm>({
    originIata: "TAS",
    destIata: "FRA",
    pallets: [newPallet()],
    commodity: "",
    specialHandling: [],
  });

  const [roadForm, setRoadForm] = useState<RoadForm>({
    originCity: "Tashkent",
    destCity: "Hamburg",
    vehicleType: "tautliner",
    cargoItems: [
      { id: "c1", lengthCm: 120, widthCm: 80, heightCm: 100, weightKg: 500, qty: 4, label: "Cotton bales" },
      { id: "c2", lengthCm: 80,  widthCm: 60, heightCm: 80,  weightKg: 200, qty: 6, label: "Textile rolls" },
    ],
    cbm: 96,
    minTempC: 2,
    maxTempC: 8,
    tempSensitivity: "chilled",
    cargoLengthM: 6,
    cargoWidthM: 2.4,
    cargoHeightM: 2.5,
    cargoWeightT: 20,
    containerSize: "40HC",
  });

  const [airResult, setAirResult] = useState<AirResult | null>(null);
  const [roadResult, setRoadResult] = useState<RoadResult | null>(null);

  const handleModeChange = useCallback((m: TransportMode) => {
    setMode(m);
    setAirResult(null);
    setRoadResult(null);
  }, []);

  async function submitAir() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1200));
    setAirResult(mockAirResult(airForm));
    setBusy(false);
  }

  async function submitRoad() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRoadResult(mockRoadResult(roadForm));
    setBusy(false);
  }

  const hasResult = (mode === "air" && !!airResult) || (mode === "road" && !!roadResult);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 shadow-md">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Rate &amp; Route AI</h2>
          <p className="text-xs text-slate-500">EPL Genius — AI-powered freight rate estimation &amp; optimal routing</p>
        </div>
      </div>

      {/* Transport mode selector */}
      <div className="flex gap-3">
        <ModeCard mode="air" active={mode === "air"} onClick={() => handleModeChange("air")} />
        <ModeCard mode="road" active={mode === "road"} onClick={() => handleModeChange("road")} />
      </div>

      {/* Air mode: two-column form + results */}
      {mode === "air" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Plane size={16} className="text-brand-600" />
                <span className="text-sm font-semibold text-slate-800">Air Freight Details</span>
              </div>
              <AirFreightForm form={airForm} onChange={setAirForm} onSubmit={submitAir} busy={busy} />
            </div>
          </div>
          <div className="xl:col-span-3">
            {busy && (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-brand-300 bg-brand-50/30">
                <div className="text-center">
                  <Loader2 size={28} className="animate-spin text-brand-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-brand-700">EPL Genius is calculating…</p>
                  <p className="text-xs text-slate-400 mt-1">Analysing routes, rates &amp; risks</p>
                </div>
              </div>
            )}
            {!busy && !airResult && (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                <div className="text-center px-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                    <Plane size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Enter shipment details</p>
                  <p className="text-xs text-slate-400 mt-1">Fill in airports and cargo to get rate &amp; route analysis</p>
                </div>
              </div>
            )}
            {!busy && airResult && <AirResultsPanel result={airResult} form={airForm} />}
          </div>
        </div>
      )}

      {/* Road mode: full-width split (inputs + viz) then results below */}
      {mode === "road" && (
        <div className="space-y-6">
          <RoadFreightPanel form={roadForm} onChange={setRoadForm} onSubmit={submitRoad} busy={busy} />
          {busy && (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-brand-300 bg-brand-50/30">
              <div className="text-center">
                <Loader2 size={28} className="animate-spin text-brand-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-brand-700">EPL Genius is calculating rates &amp; routes…</p>
              </div>
            </div>
          )}
          {!busy && roadResult && <RoadResultsPanel result={roadResult} form={roadForm} />}
        </div>
      )}

      {/* AI disclaimer */}
      {hasResult && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-brand-500" />
          <span>
            <span className="font-semibold text-slate-700">EPL Genius AI</span> — Rates and routes are AI-estimated based on current market data and may vary.
            <button className="ml-1 text-brand-600 hover:underline inline-flex items-center gap-0.5">
              Contact our freight desk for a firm quote <ArrowRight size={10} />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
