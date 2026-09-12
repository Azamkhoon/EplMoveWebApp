export type TenantKind = "shipper" | "carrier";
export type TenantStatus = "active" | "suspended";

export interface Tenant {
  id: string; name: string; slug: string; kind: TenantKind;
  status: TenantStatus; memberCount: number; createdAt: string;
  loadCount: number; shipmentCount: number; invoiceTotal: number;
}

export interface Member {
  id: string; tenantId: string; tenantName: string;
  userId: string; email: string; roleKey: string; createdAt: string;
}

export interface AdminShipment {
  id: string; ref: string; tenantId: string; tenantName: string;
  origin: string; destination: string; mode: string;
  carrierName: string; status: string; createdAt: string; value: number;
}

export interface AdminInvoice {
  id: string; number: string; tenantId: string; tenantName: string;
  amount: number; currency: string; status: "pending" | "paid" | "overdue";
  issuedAt: string; paidAt: string | null;
}

export interface AuditEvent {
  id: string; ts: string; actor: string; tenantName: string;
  action: string; resource: string; detail: string; ip: string;
}

export interface ServiceHealth {
  name: string; port: number; status: "up" | "degraded" | "down";
  latencyMs: number; uptimePct: number; lastChecked: string;
}

// ── Tenants ──────────────────────────────────────────────────────────────────
export const TENANTS: Tenant[] = [];

// ── Members ───────────────────────────────────────────────────────────────────
export const MEMBERS: Member[] = [];

// ── Shipments ─────────────────────────────────────────────────────────────────
export const SHIPMENTS: AdminShipment[] = [];

// ── Invoices ──────────────────────────────────────────────────────────────────
export const INVOICES: AdminInvoice[] = [];

// ── Audit log ─────────────────────────────────────────────────────────────────
export const AUDIT_LOG: AuditEvent[] = [];

// ── Service health ────────────────────────────────────────────────────────────
export const SERVICE_HEALTH: ServiceHealth[] = [];
