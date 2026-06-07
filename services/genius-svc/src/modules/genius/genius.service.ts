import { Injectable } from "@nestjs/common";
import {
  AskInput,
  GeniusAnswer,
  RateEstimateInput,
  RateEstimate,
  RouteOptimizeInput,
  RouteOptimizeResult,
  RouteOption,
  DocAssistInput,
  DocAssistResult,
  type TransportMode,
} from "@epl/contracts";
import { createLogger } from "@epl/observability";
import { config } from "../../config";
import { kbAnswer } from "./kb";

const logger = createLogger("genius-svc");

// Rough per-mode pricing model (USD). Real deployment swaps in a rates feed.
const RATE_MODEL: Record<TransportMode, { perKg: number; base: number; daysLow: number; daysHigh: number; co2PerKg: number }> = {
  Air: { perKg: 4.2, base: 120, daysLow: 1, daysHigh: 4, co2PerKg: 2.1 },
  Road: { perKg: 0.35, base: 180, daysLow: 2, daysHigh: 7, co2PerKg: 0.09 },
  Rail: { perKg: 0.12, base: 250, daysLow: 12, daysHigh: 20, co2PerKg: 0.03 },
  Ocean: { perKg: 0.05, base: 600, daysLow: 25, daysHigh: 42, co2PerKg: 0.012 },
  Multimodal: { perKg: 0.18, base: 400, daysLow: 10, daysHigh: 24, co2PerKg: 0.05 },
};

const DISCLAIMER =
  "Estimate only — actual rates depend on carrier, season, surcharges (BAF/CAF), lane and capacity. Request a quote for a firm price.";

@Injectable()
export class GeniusService {
  /** Chat: delegate to an LLM/web-search provider if configured, else KB. */
  async ask(body: unknown): Promise<GeniusAnswer> {
    const input = AskInput.parse(body);

    if (config.GENIUS_LLM_URL) {
      try {
        const res = await fetch(config.GENIUS_LLM_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(config.GENIUS_LLM_API_KEY ? { authorization: `Bearer ${config.GENIUS_LLM_API_KEY}` } : {}),
          },
          body: JSON.stringify({
            question: input.question,
            context: input.context,
            // Ground the model with our KB snippets (simple RAG).
            knowledge: kbAnswer(input.question).answer,
          }),
        });
        if (res.ok) return GeniusAnswer.parse(await res.json());
        logger.warn({ status: res.status }, "LLM provider non-OK; falling back to KB");
      } catch (err) {
        logger.warn({ err }, "LLM provider error; falling back to KB");
      }
    }
    return kbAnswer(input.question);
  }

  /** Freight rate estimation. */
  estimateRate(body: unknown): RateEstimate {
    const input = RateEstimateInput.parse(body);
    const m = RATE_MODEL[input.mode];
    // Chargeable weight: max(actual, volumetric). Air ÷6000, others lighter.
    const divisor = input.mode === "Air" ? 6000 : 5000;
    const volKg = input.volumeM3 ? (input.volumeM3 * 1_000_000) / divisor : 0;
    const chargeable = Math.max(input.weightKg, volKg);
    const mid = m.base + chargeable * m.perKg;
    return RateEstimate.parse({
      mode: input.mode,
      lowUsd: Math.round(mid * 0.85),
      midUsd: Math.round(mid),
      highUsd: Math.round(mid * 1.2),
      transitDaysLow: m.daysLow,
      transitDaysHigh: m.daysHigh,
      chargeableWeightKg: Math.round(chargeable),
      basis: `${input.mode}: base $${m.base} + ${Math.round(chargeable)} kg chargeable × $${m.perKg}/kg (${input.origin} → ${input.destination}).`,
      disclaimer: DISCLAIMER,
    });
  }

  /** Route optimization: rank modes by the chosen priority. */
  optimizeRoute(body: unknown): RouteOptimizeResult {
    const input = RouteOptimizeInput.parse(body);
    const weight = input.weightKg ?? 10000;
    const modes: TransportMode[] = ["Air", "Road", "Rail", "Ocean", "Multimodal"];
    const scored = modes.map((mode) => {
      const m = RATE_MODEL[mode];
      const cost = Math.round(m.base + weight * m.perKg);
      const days = Math.round((m.daysLow + m.daysHigh) / 2);
      const co2 = Math.round(weight * m.co2PerKg);
      return { mode, cost, days, co2 };
    });

    const key =
      input.priority === "speed" ? (x: { days: number }) => x.days
      : input.priority === "green" ? (x: { co2: number }) => x.co2
      : (x: { cost: number }) => x.cost;
    const ranked = [...scored].sort((a, b) => key(a) - key(b));

    const options: RouteOption[] = ranked.map((r, i) =>
      RouteOption.parse({
        mode: r.mode,
        label: `${r.mode} · ${input.origin} → ${input.destination}`,
        transitDays: r.days,
        estCostUsd: r.cost,
        co2Kg: r.co2,
        recommended: i === 0,
        rationale:
          i === 0
            ? `Best for ${input.priority}: ${r.days}d, ~$${r.cost}, ${r.co2} kg CO₂.`
            : `${r.days}d, ~$${r.cost}, ${r.co2} kg CO₂.`,
      }),
    );
    return RouteOptimizeResult.parse({ priority: input.priority, options });
  }

  /** Documentation / customs assistance checklists. */
  docAssist(body: unknown): DocAssistResult {
    const input = DocAssistInput.parse(body);
    if (input.topic === "customs") {
      return DocAssistResult.parse({
        checklist: [
          "Classify goods under the correct HS code (6–10 digits).",
          "Commercial invoice with accurate value & currency.",
          "Packing list (weights, dimensions, package counts).",
          "Bill of Lading / Air Waybill.",
          "Certificate of Origin (if claiming preferential duty).",
          "Import/export licences or permits for controlled goods.",
          "Customs value: confirm Incoterm to know what's included.",
        ],
        notes:
          `For ${input.commodity ?? "your commodity"} on ${input.origin ?? "origin"} → ${input.destination ?? "destination"}, verify HS classification early — it drives duty and any restrictions. Misdeclaration causes holds and penalties.`,
        sources: ["World Customs Organization (WCO)", "ICC"],
      });
    }
    return DocAssistResult.parse({
      checklist: [
        "Commercial Invoice",
        "Packing List",
        "Bill of Lading / Air Waybill",
        "Insurance Certificate",
        "Customs Declaration",
        "Proof of Delivery (on completion)",
      ],
      notes:
        "Upload each document in the Documents hub and mark it verified once checked. Keep the invoice value consistent with the customs declaration.",
      sources: ["FIATA", "ICC"],
    });
  }
}
