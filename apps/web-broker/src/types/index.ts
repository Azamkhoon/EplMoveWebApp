export type DeclarationStatus =
  | "draft" | "submitted" | "under_review" | "docs_requested"
  | "approved" | "released" | "rejected" | "closed";

export type DeclarationType = "import" | "export" | "transit" | "temp_import" | "temp_export";

export type ClientType = "importer" | "exporter" | "consignee" | "consignor";

export type DocType =
  | "commercial_invoice" | "packing_list" | "certificate_of_origin"
  | "bill_of_lading" | "air_waybill" | "cmr" | "import_permit"
  | "export_permit" | "customs_license" | "declaration_form" | "other";

export interface Declaration {
  id: string;
  reference: string;
  type: DeclarationType;
  status: DeclarationStatus;
  clientId: string;
  clientName: string;
  shipmentRef: string;
  origin: string;
  destination: string;
  hsCode: string;
  description: string;
  totalValue: number;
  currency: string;
  dutyAmount: number;
  vatAmount: number;
  declarant: string;
  createdAt: string;
  updatedAt: string;
  deadline: string | null;
}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  taxId: string;
  country: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  eoriNumber: string | null;
  authorizedAt: string | null;
  declarationCount: number;
}

export interface HsCode {
  code: string;
  description: string;
  dutyRate: number;
  vatRate: number;
  notes: string | null;
  chapter: string;
  heading: string;
}

export interface BrokerDocument {
  id: string;
  name: string;
  type: DocType;
  declarationId: string | null;
  declarationRef: string | null;
  clientId: string | null;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  verified: boolean;
}
