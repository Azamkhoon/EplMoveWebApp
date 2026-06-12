import { z } from "zod";
import { Money, TransportMode } from "./common";
import { CarrierSummary } from "./carrier";

/**
 * Quote & bid contracts (owned by quote-svc).
 *
 * Flow: shipper opens a quote request for a load → carriers submit bids →
 * shipper compares (rate / transit / rating) → accepts one → bid.accepted
 * (consumed by shipment-svc to create the shipment).
 */

export const QuoteStatus = z.enum(["open", "awarded", "cancelled", "expired"]);
export type QuoteStatus = z.infer<typeof QuoteStatus>;

export const BidStatus = z.enum(["submitted", "accepted", "rejected", "withdrawn"]);
export type BidStatus = z.infer<typeof BidStatus>;

export const Bid = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(), // shipper tenant (owns the quote)
  quoteId: z.string().uuid(),
  carrierId: z.string().uuid(),
  carrier: CarrierSummary.optional(), // denormalized for comparison UI
  mode: TransportMode,
  price: Money,
  transitDays: z.number().int().positive(),
  co2Kg: z.number().nonnegative().optional(),
  validUntil: z.string().datetime().optional(),
  status: BidStatus,
  createdAt: z.string().datetime(),
});
export type Bid = z.infer<typeof Bid>;

export const Quote = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  loadId: z.string().uuid(),
  reference: z.string(), // mirrors the load reference for display
  status: QuoteStatus,
  mode: TransportMode.or(z.literal("Any")),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  bids: z.array(Bid).optional(),
});
export type Quote = z.infer<typeof Quote>;

// ── Request DTOs ──
export const CreateQuoteInput = z.object({
  loadId: z.string().uuid(),
  reference: z.string(),
  mode: TransportMode.or(z.literal("Any")).default("Any"),
  expiresAt: z.string().datetime().optional(),
});
export type CreateQuoteInput = z.infer<typeof CreateQuoteInput>;

/** Carrier submits a bid (carrier portal; in Phase 2 also seedable for demo). */
export const SubmitBidInput = z.object({
  carrierId: z.string().uuid(),
  mode: TransportMode,
  price: Money,
  transitDays: z.number().int().positive(),
  co2Kg: z.number().nonnegative().optional(),
  validUntil: z.string().datetime().optional(),
});
export type SubmitBidInput = z.infer<typeof SubmitBidInput>;

// ── Carrier marketplace (two-sided) ──

/** A row in the carrier's marketplace: an open quote with bid stats. */
export const MarketplaceQuote = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  mode: TransportMode.or(z.literal("Any")),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  bidCount: z.number().int().nonnegative(),
  myBidCount: z.number().int().nonnegative(),
  bestPrice: z.number().nonnegative().optional(),
});
export type MarketplaceQuote = z.infer<typeof MarketplaceQuote>;

/** Carrier's bid submission (carrier_id is taken from the auth context). */
export const CarrierBidInput = z.object({
  mode: TransportMode.optional(), // defaults to the quote's mode
  price: Money,
  transitDays: z.number().int().positive(),
  co2Kg: z.number().nonnegative().optional(),
  validUntil: z.string().datetime().optional(),
});
export type CarrierBidInput = z.infer<typeof CarrierBidInput>;

/** A carrier's own bid, with the quote reference + status for "My Bids". */
export const CarrierBid = Bid.extend({
  reference: z.string(),
  quoteStatus: QuoteStatus,
});
export type CarrierBid = z.infer<typeof CarrierBid>;
