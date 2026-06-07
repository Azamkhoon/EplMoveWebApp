import { z } from "zod";

/**
 * Shared value objects & enums — the canonical vocabulary of the platform.
 * Every service, the SDK, and the web apps import from here. No drift.
 */

// ── Transport mode (platform standard; SPA's FTL/LTL maps to Road + serviceLevel) ──
export const TransportMode = z.enum(["Road", "Air", "Rail", "Ocean", "Multimodal"]);
export type TransportMode = z.infer<typeof TransportMode>;

export const RoadServiceLevel = z.enum(["FTL", "LTL"]);
export type RoadServiceLevel = z.infer<typeof RoadServiceLevel>;

// ── Equipment ──
export const EquipmentKind = z.enum(["container", "trailer", "wagon"]);
export type EquipmentKind = z.infer<typeof EquipmentKind>;

// ── Value objects ──
export const Location = z.object({
  city: z.string().min(1),
  country: z.string().min(1),
  code: z.string().optional(), // port / airport / facility code
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  window: z
    .object({ from: z.string().datetime(), to: z.string().datetime() })
    .optional(),
});
export type Location = z.infer<typeof Location>;

export const Money = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3).default("USD"),
});
export type Money = z.infer<typeof Money>;

export const Dimensions = z.object({
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
});
export type Dimensions = z.infer<typeof Dimensions>;

// ── Standard API error contract ──
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    traceId: z.string().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

// ── Pagination ──
export const Page = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type Page = z.infer<typeof Page>;
