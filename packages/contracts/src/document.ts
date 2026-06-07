import { z } from "zod";

/** Document contracts (owned by doc-svc). */

export const DocumentType = z.enum([
  "Bill of Lading",
  "Commercial Invoice",
  "Packing List",
  "Customs Declaration",
  "Proof of Delivery",
  "Insurance Certificate",
]);
export type DocumentType = z.infer<typeof DocumentType>;

export const DocumentStatus = z.enum(["pending", "verified", "rejected"]);
export type DocumentStatus = z.infer<typeof DocumentStatus>;

export const ShipmentDocument = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  shipmentId: z.string().uuid().optional(),
  loadId: z.string().uuid().optional(),
  type: DocumentType,
  name: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  contentType: z.string(),
  status: DocumentStatus,
  storageKey: z.string(), // GCS object key (or local path in dev)
  uploadedBy: z.string().uuid(),
  uploadedAt: z.string().datetime(),
  // Invoice-specific (when type === "Commercial Invoice")
  amount: z.number().optional(),
  currency: z.string().optional(),
});
export type ShipmentDocument = z.infer<typeof ShipmentDocument>;

/** Metadata for an upload; the binary is sent separately (multipart / signed URL). */
export const UploadDocumentInput = z.object({
  shipmentId: z.string().uuid().optional(),
  loadId: z.string().uuid().optional(),
  type: DocumentType,
  name: z.string().min(1),
  contentType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  // dev/demo: inline base64 content (prod uses signed URLs to GCS)
  contentBase64: z.string().optional(),
});
export type UploadDocumentInput = z.infer<typeof UploadDocumentInput>;
