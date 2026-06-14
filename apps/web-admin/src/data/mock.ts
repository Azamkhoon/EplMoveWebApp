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
export const TENANTS: Tenant[] = [
  { id: "t-001", name: "Acme Logistics",         slug: "acme-logistics",        kind: "shipper", status: "active",    memberCount: 4,  createdAt: "2026-01-12T09:00:00Z", loadCount: 38, shipmentCount: 31, invoiceTotal: 284000 },
  { id: "t-002", name: "OceanFlex Lines",         slug: "oceanflex-lines",       kind: "carrier", status: "active",    memberCount: 2,  createdAt: "2026-02-05T14:00:00Z", loadCount: 0,  shipmentCount: 18, invoiceTotal: 148000 },
  { id: "t-003", name: "GlobalTrade GmbH",        slug: "globaltrade-gmbh",      kind: "shipper", status: "active",    memberCount: 7,  createdAt: "2026-02-18T11:00:00Z", loadCount: 22, shipmentCount: 19, invoiceTotal: 196000 },
  { id: "t-004", name: "Pacific Freight Co.",     slug: "pacific-freight",       kind: "carrier", status: "active",    memberCount: 3,  createdAt: "2026-03-01T08:00:00Z", loadCount: 0,  shipmentCount: 24, invoiceTotal: 212000 },
  { id: "t-005", name: "Nordic Exports AS",       slug: "nordic-exports",        kind: "shipper", status: "active",    memberCount: 2,  createdAt: "2026-03-14T10:00:00Z", loadCount: 11, shipmentCount: 9,  invoiceTotal: 88000  },
  { id: "t-006", name: "Rapid Haul Ltd",          slug: "rapid-haul",            kind: "carrier", status: "suspended", memberCount: 1,  createdAt: "2026-03-28T16:00:00Z", loadCount: 0,  shipmentCount: 6,  invoiceTotal: 44000  },
  { id: "t-007", name: "Crescent Trading LLC",    slug: "crescent-trading",      kind: "shipper", status: "active",    memberCount: 3,  createdAt: "2026-04-03T09:00:00Z", loadCount: 17, shipmentCount: 14, invoiceTotal: 134000 },
  { id: "t-008", name: "Atlas Cargo S.A.",        slug: "atlas-cargo",           kind: "carrier", status: "active",    memberCount: 4,  createdAt: "2026-04-22T12:00:00Z", loadCount: 0,  shipmentCount: 21, invoiceTotal: 178000 },
  { id: "t-009", name: "HorizonShip Pte. Ltd.",   slug: "horizonship",           kind: "shipper", status: "active",    memberCount: 2,  createdAt: "2026-05-08T14:00:00Z", loadCount: 8,  shipmentCount: 7,  invoiceTotal: 72000  },
  { id: "t-010", name: "Kestrel Logistics Inc.",  slug: "kestrel-logistics",     kind: "carrier", status: "active",    memberCount: 2,  createdAt: "2026-05-30T10:00:00Z", loadCount: 0,  shipmentCount: 11, invoiceTotal: 94000  },
];

// ── Members ───────────────────────────────────────────────────────────────────
export const MEMBERS: Member[] = [
  { id: "m-001", tenantId: "t-001", tenantName: "Acme Logistics",       userId: "u-001", email: "demo@acme-logistics.test",   roleKey: "shipper_admin",  createdAt: "2026-01-12T09:05:00Z" },
  { id: "m-002", tenantId: "t-001", tenantName: "Acme Logistics",       userId: "u-002", email: "ops@acme-logistics.test",    roleKey: "shipper_member", createdAt: "2026-01-15T10:00:00Z" },
  { id: "m-003", tenantId: "t-002", tenantName: "OceanFlex Lines",       userId: "u-003", email: "carrier@oceanflex.test",    roleKey: "carrier_admin",  createdAt: "2026-02-05T14:02:00Z" },
  { id: "m-004", tenantId: "t-003", tenantName: "GlobalTrade GmbH",      userId: "u-004", email: "admin@globaltrade.test",    roleKey: "shipper_admin",  createdAt: "2026-02-18T11:05:00Z" },
  { id: "m-005", tenantId: "t-004", tenantName: "Pacific Freight Co.",   userId: "u-005", email: "ops@pacific-freight.test",  roleKey: "carrier_admin",  createdAt: "2026-03-01T08:10:00Z" },
  { id: "m-006", tenantId: "t-006", tenantName: "Rapid Haul Ltd",        userId: "u-006", email: "info@rapidhaul.test",      roleKey: "carrier_admin",  createdAt: "2026-03-28T16:05:00Z" },
  { id: "m-007", tenantId: "t-007", tenantName: "Crescent Trading LLC",  userId: "u-007", email: "trade@crescent.test",      roleKey: "shipper_admin",  createdAt: "2026-04-03T09:08:00Z" },
  { id: "m-008", tenantId: "t-008", tenantName: "Atlas Cargo S.A.",      userId: "u-008", email: "fleet@atlascargo.test",    roleKey: "carrier_admin",  createdAt: "2026-04-22T12:04:00Z" },
];

// ── Shipments ─────────────────────────────────────────────────────────────────
export const SHIPMENTS: AdminShipment[] = [
  { id: "s-001", ref: "SHP-0041", tenantId: "t-001", tenantName: "Acme Logistics",     origin: "Shanghai, CN",    destination: "Houston, US",    mode: "Ocean",  carrierName: "OceanFlex Lines",   status: "in_transit",  createdAt: "2026-06-10T09:00:00Z", value: 148000 },
  { id: "s-002", ref: "SHP-0039", tenantId: "t-003", tenantName: "GlobalTrade GmbH",   origin: "Frankfurt, DE",   destination: "Dubai, AE",      mode: "Air",    carrierName: "Pacific Freight",   status: "delivered",   createdAt: "2026-06-09T11:00:00Z", value: 320000 },
  { id: "s-003", ref: "SHP-0038", tenantId: "t-001", tenantName: "Acme Logistics",     origin: "Gdańsk, PL",     destination: "Newark, US",     mode: "Ocean",  carrierName: "Atlas Cargo S.A.",  status: "in_transit",  createdAt: "2026-06-08T08:00:00Z", value: 61000  },
  { id: "s-004", ref: "SHP-0036", tenantId: "t-007", tenantName: "Crescent Trading LLC",origin: "Tokyo, JP",      destination: "Sydney, AU",     mode: "Ocean",  carrierName: "Kestrel Logistics", status: "at_customs",  createdAt: "2026-06-07T14:00:00Z", value: 87000  },
  { id: "s-005", ref: "SHP-0035", tenantId: "t-005", tenantName: "Nordic Exports AS",  origin: "Oslo, NO",       destination: "Singapore, SG",  mode: "Air",    carrierName: "Pacific Freight",   status: "booked",      createdAt: "2026-06-06T16:00:00Z", value: 560000 },
  { id: "s-006", ref: "SHP-0034", tenantId: "t-003", tenantName: "GlobalTrade GmbH",   origin: "Los Angeles, US", destination: "Singapore, SG",  mode: "Ocean",  carrierName: "OceanFlex Lines",   status: "delivered",   createdAt: "2026-06-04T10:00:00Z", value: 4200000},
  { id: "s-007", ref: "SHP-0033", tenantId: "t-009", tenantName: "HorizonShip Pte.",   origin: "Mumbai, IN",     destination: "Rotterdam, NL",  mode: "Ocean",  carrierName: "Atlas Cargo S.A.",  status: "in_transit",  createdAt: "2026-06-03T13:00:00Z", value: 38000  },
];

// ── Invoices ──────────────────────────────────────────────────────────────────
export const INVOICES: AdminInvoice[] = [
  { id: "inv-001", number: "INV-2026-041", tenantId: "t-001", tenantName: "Acme Logistics",     amount: 43540,  currency: "USD", status: "pending", issuedAt: "2026-06-10", paidAt: null         },
  { id: "inv-002", number: "INV-2026-040", tenantId: "t-003", tenantName: "GlobalTrade GmbH",   amount: 1800,   currency: "USD", status: "paid",    issuedAt: "2026-06-09", paidAt: "2026-06-11" },
  { id: "inv-003", number: "INV-2026-038", tenantId: "t-007", tenantName: "Crescent Trading",   amount: 5260,   currency: "USD", status: "overdue", issuedAt: "2026-06-07", paidAt: null         },
  { id: "inv-004", number: "INV-2026-036", tenantId: "t-003", tenantName: "GlobalTrade GmbH",   amount: 2400,   currency: "USD", status: "paid",    issuedAt: "2026-06-04", paidAt: "2026-06-08" },
  { id: "inv-005", number: "INV-2026-035", tenantId: "t-005", tenantName: "Nordic Exports AS",  amount: 14580,  currency: "USD", status: "overdue", issuedAt: "2026-06-03", paidAt: null         },
  { id: "inv-006", number: "INV-2026-034", tenantId: "t-001", tenantName: "Acme Logistics",     amount: 29970,  currency: "USD", status: "paid",    issuedAt: "2026-05-28", paidAt: "2026-06-01" },
];

// ── Audit log ─────────────────────────────────────────────────────────────────
export const AUDIT_LOG: AuditEvent[] = [
  { id: "a-001", ts: "2026-06-14T11:42:00Z", actor: "admin@epl-move.internal", tenantName: "—",                   action: "login",             resource: "auth",       detail: "platform_admin login",          ip: "10.0.0.1"   },
  { id: "a-002", ts: "2026-06-14T10:55:00Z", actor: "info@rapidhaul.test",     tenantName: "Rapid Haul Ltd",       action: "tenant.suspended",  resource: "tenant",     detail: "Account suspended by platform admin", ip: "10.0.0.1" },
  { id: "a-003", ts: "2026-06-14T09:30:00Z", actor: "carrier@oceanflex.test",  tenantName: "OceanFlex Lines",      action: "bid.submitted",     resource: "quote",      detail: "Bid $14,200 on SHP-0041",       ip: "195.1.2.3"  },
  { id: "a-004", ts: "2026-06-14T09:12:00Z", actor: "demo@acme-logistics.test",tenantName: "Acme Logistics",       action: "bid.accepted",      resource: "quote",      detail: "Accepted OceanFlex bid for SHP-0041", ip: "82.5.6.7" },
  { id: "a-005", ts: "2026-06-13T16:48:00Z", actor: "admin@globaltrade.test",  tenantName: "GlobalTrade GmbH",     action: "load.created",      resource: "load",       detail: "FCL 40' — Frankfurt → Dubai",    ip: "91.2.3.4"  },
  { id: "a-006", ts: "2026-06-13T14:20:00Z", actor: "demo@acme-logistics.test",tenantName: "Acme Logistics",       action: "invoice.paid",      resource: "billing",    detail: "INV-2026-034 paid $29,970",     ip: "82.5.6.7"  },
  { id: "a-007", ts: "2026-06-13T11:05:00Z", actor: "fleet@atlascargo.test",   tenantName: "Atlas Cargo S.A.",     action: "document.uploaded", resource: "doc",        detail: "Bill of Lading — SHP-0039.pdf", ip: "201.3.4.5"  },
  { id: "a-008", ts: "2026-06-12T17:30:00Z", actor: "ops@pacific-freight.test",tenantName: "Pacific Freight Co.", action: "member.invited",    resource: "membership", detail: "Invited driver@pacific.test",   ip: "110.4.5.6"  },
];

// ── Service health ────────────────────────────────────────────────────────────
export const SERVICE_HEALTH: ServiceHealth[] = [
  { name: "api-gateway",  port: 8080, status: "up",       latencyMs: 8,   uptimePct: 99.98, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "auth-svc",     port: 8081, status: "up",       latencyMs: 12,  uptimePct: 99.95, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "tenant-svc",   port: 8082, status: "up",       latencyMs: 9,   uptimePct: 99.99, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "load-svc",     port: 8083, status: "up",       latencyMs: 14,  uptimePct: 99.92, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "carrier-svc",  port: 8084, status: "up",       latencyMs: 11,  uptimePct: 99.97, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "quote-svc",    port: 8085, status: "up",       latencyMs: 16,  uptimePct: 99.90, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "shipment-svc", port: 8086, status: "up",       latencyMs: 13,  uptimePct: 99.94, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "tracking-svc", port: 8087, status: "degraded", latencyMs: 248, uptimePct: 98.71, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "doc-svc",      port: 8088, status: "up",       latencyMs: 19,  uptimePct: 99.88, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "genius-svc",   port: 8089, status: "up",       latencyMs: 31,  uptimePct: 99.75, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "billing-svc",  port: 8090, status: "up",       latencyMs: 10,  uptimePct: 99.99, lastChecked: "2026-06-14T11:43:00Z" },
  { name: "notify-svc",   port: 8091, status: "up",       latencyMs: 7,   uptimePct: 99.96, lastChecked: "2026-06-14T11:43:00Z" },
];
