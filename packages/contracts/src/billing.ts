import { z } from "zod";
import { Money } from "./common";

/**
 * Billing domain contracts (owned by billing-svc).
 * An invoice is raised automatically when a bid is accepted (the awarded
 * freight cost), then moves through its lifecycle.
 */
export const InvoiceStatus = z.enum(["draft", "issued", "paid", "void"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const Invoice = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  number: z.string(), // human-friendly e.g. INV-2026-0001
  status: InvoiceStatus,
  loadId: z.string().uuid().nullable(),
  quoteId: z.string().uuid().nullable(),
  shipmentId: z.string().uuid().nullable(),
  reference: z.string(), // the load/shipment reference
  carrierName: z.string(),
  amount: Money,
  issuedAt: z.string().datetime().nullable(),
  dueAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type Invoice = z.infer<typeof Invoice>;

export const PayInvoiceInput = z.object({
  invoiceId: z.string().uuid(),
});
export type PayInvoiceInput = z.infer<typeof PayInvoiceInput>;
