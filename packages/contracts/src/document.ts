import { z } from "zod";

/** Document contracts (owned by doc-svc). */

export const DocumentType = z.enum([
  "Commercial Invoice",
  "Packing List",
  "Sales Contract",
  "Certificate of Origin",
  "Export Declaration",
  "Import Declaration",
  "CMR",
  "AWB",
  "Bill of Lading",
  "Railway Bill",
  "Phytosanitary Certificate",
  "Veterinary Certificate",
  "Certificate of Conformity",
  "MSDS",
  "Product Specification",
  "HS Code confirmation",
  "Insurance Certificate",
  "Authorization Letter",
  "Proof of Delivery",
  "Other",
]);
export type DocumentType = z.infer<typeof DocumentType>;

export const DocumentStatus = z.enum(["pending", "verified", "rejected"]);
export type DocumentStatus = z.infer<typeof DocumentStatus>;

export const ShipmentDocument = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  shipmentId: z.string().uuid().optional(),
  documentRequestId: z.string().uuid().optional(),
  brokerTenantId: z.string().uuid().nullable().optional(),
  carrierTenantId: z.string().uuid().nullable().optional(),
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
  documentRequestId: z.string().uuid().optional(),
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

export const DocumentRequestStatus = z.enum([
  "REQUESTED",
  "VIEWED",
  "UPLOADED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "REVISION_REQUIRED",
]);
export type DocumentRequestStatus = z.infer<typeof DocumentRequestStatus>;

export const DocumentRequest = z.object({
  id: z.string().uuid(),
  shipmentId: z.string().uuid(),
  shipmentReference: z.string(),
  brokerId: z.string().uuid(),
  brokerName: z.string(),
  shipperId: z.string().uuid(),
  documentType: DocumentType,
  title: z.string(),
  description: z.string().optional(),
  status: DocumentRequestStatus,
  required: z.boolean(),
  dueDate: z.string().datetime().optional(),
  comment: z.string().optional(),
  documentId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DocumentRequest = z.infer<typeof DocumentRequest>;

export const CreateDocumentRequestInput = z.object({
  shipmentId: z.string().uuid(),
  documentType: DocumentType,
  title: z.string().min(1),
  description: z.string().max(4000).optional(),
  required: z.boolean().default(true),
  dueDate: z.string().datetime().optional(),
  comment: z.string().max(2000).optional(),
});
export type CreateDocumentRequestInput = z.infer<typeof CreateDocumentRequestInput>;

export const ReviewDocumentRequestInput = z.object({
  status: z.enum(["APPROVED", "REJECTED", "REVISION_REQUIRED"]),
  comment: z.string().max(2000).optional(),
});
export type ReviewDocumentRequestInput = z.infer<typeof ReviewDocumentRequestInput>;
