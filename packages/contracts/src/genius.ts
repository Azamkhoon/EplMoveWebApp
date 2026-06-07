import { z } from "zod";
import { TransportMode } from "./common";

/**
 * EPL Genius contracts (owned by genius-svc).
 *
 * The chat answer shape matches the SPA's existing askGenius() seam exactly
 * ({ answer, sources }) so the widget needs no change to go live. The richer
 * tools (rate estimation, route optimization, doc/customs assistance) are
 * additive endpoints.
 */

// ── Chat ──
export const GeniusAnswer = z.object({
  answer: z.string(),
  sources: z.array(z.string()),
  /** Optional structured tool result when the question maps to a tool. */
  tool: z.string().optional(),
});
export type GeniusAnswer = z.infer<typeof GeniusAnswer>;

export const AskInput = z.object({
  question: z.string().min(1),
  /** Optional shipment/load context to ground the answer. */
  context: z
    .object({
      origin: z.string().optional(),
      destination: z.string().optional(),
      mode: TransportMode.optional(),
    })
    .optional(),
});
export type AskInput = z.infer<typeof AskInput>;

// ── Freight rate estimation ──
export const RateEstimateInput = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  mode: TransportMode,
  weightKg: z.number().positive(),
  volumeM3: z.number().positive().optional(),
});
export type RateEstimateInput = z.infer<typeof RateEstimateInput>;

export const RateEstimate = z.object({
  mode: TransportMode,
  lowUsd: z.number(),
  highUsd: z.number(),
  midUsd: z.number(),
  transitDaysLow: z.number().int(),
  transitDaysHigh: z.number().int(),
  chargeableWeightKg: z.number(),
  basis: z.string(), // explanation of how it was derived
  disclaimer: z.string(),
});
export type RateEstimate = z.infer<typeof RateEstimate>;

// ── Route optimization ──
export const RouteOptimizeInput = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  priority: z.enum(["cost", "speed", "green"]).default("cost"),
  weightKg: z.number().positive().optional(),
});
export type RouteOptimizeInput = z.infer<typeof RouteOptimizeInput>;

export const RouteOption = z.object({
  mode: TransportMode,
  label: z.string(),
  transitDays: z.number().int(),
  estCostUsd: z.number(),
  co2Kg: z.number(),
  recommended: z.boolean(),
  rationale: z.string(),
});
export type RouteOption = z.infer<typeof RouteOption>;

export const RouteOptimizeResult = z.object({
  priority: z.enum(["cost", "speed", "green"]),
  options: z.array(RouteOption),
});
export type RouteOptimizeResult = z.infer<typeof RouteOptimizeResult>;

// ── Documentation / customs assistance ──
export const DocAssistInput = z.object({
  topic: z.enum(["documentation", "customs"]),
  origin: z.string().optional(),
  destination: z.string().optional(),
  commodity: z.string().optional(),
});
export type DocAssistInput = z.infer<typeof DocAssistInput>;

export const DocAssistResult = z.object({
  checklist: z.array(z.string()),
  notes: z.string(),
  sources: z.array(z.string()),
});
export type DocAssistResult = z.infer<typeof DocAssistResult>;
