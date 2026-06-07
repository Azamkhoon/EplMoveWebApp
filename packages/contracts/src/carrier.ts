import { z } from "zod";
import { TransportMode } from "./common";

/** Carrier domain contracts (owned by carrier-svc). */

export const Carrier = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(), // the carrier org's tenant
  name: z.string(),
  scac: z.string().optional(), // Standard Carrier Alpha Code
  modes: z.array(TransportMode),
  rating: z.number().min(0).max(5), // avg star rating
  reliability: z.number().min(0).max(100), // on-time %
  ratingsCount: z.number().int().nonnegative(),
  status: z.enum(["active", "suspended"]).default("active"),
  createdAt: z.string().datetime(),
});
export type Carrier = z.infer<typeof Carrier>;

export const CreateCarrierInput = z.object({
  name: z.string().min(1),
  scac: z.string().optional(),
  modes: z.array(TransportMode).min(1),
});
export type CreateCarrierInput = z.infer<typeof CreateCarrierInput>;

/** Summary attached to a bid so the shipper can compare without an extra call. */
export const CarrierSummary = z.object({
  id: z.string().uuid(),
  name: z.string(),
  rating: z.number(),
  reliability: z.number(),
});
export type CarrierSummary = z.infer<typeof CarrierSummary>;
