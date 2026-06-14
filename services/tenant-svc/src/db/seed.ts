/**
 * Canonical permission catalog + system-role → permission mapping.
 * Seeded idempotently on migrate. See docs/architecture/04-security.md.
 */

export const PERMISSIONS = [
  // load
  "load:create",
  "load:read",
  "load:update",
  "load:cancel",
  "load:duplicate",
  // quote
  "quote:request",
  "quote:read",
  "quote:accept",
  // marketplace (carrier-side)
  "marketplace:read",
  "carrier:bid",
  // shipment
  "shipment:read",
  // documents
  "doc:upload",
  "doc:read",
  // tenant admin
  "tenant:manage",
  "tenant:members",
  // billing
  "billing:read",
  "billing:pay",
  // notifications
  "notify:read",
  // platform ops (platform_admin only — cross-tenant visibility)
  "platform:admin",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

const SHIPPER_FULL: PermissionKey[] = [
  "load:create",
  "load:read",
  "load:update",
  "load:cancel",
  "load:duplicate",
  "quote:request",
  "quote:read",
  "quote:accept",
  "shipment:read",
  "doc:upload",
  "doc:read",
  "billing:read",
  "billing:pay",
  "notify:read",
];

// Carrier-side: discover open loads in the marketplace, bid, and follow the
// shipments they win. Carriers never see shipper-private loads/billing.
const CARRIER_FULL: PermissionKey[] = [
  "marketplace:read",
  "carrier:bid",
  "quote:read",
  "shipment:read",
  "doc:upload",
  "doc:read",
  "notify:read",
];

export const SYSTEM_ROLES: { key: string; name: string; perms: PermissionKey[] }[] = [
  {
    key: "shipper_admin",
    name: "Shipper Admin",
    perms: [...SHIPPER_FULL, "tenant:manage", "tenant:members"],
  },
  { key: "shipper_member", name: "Shipper Member", perms: SHIPPER_FULL },
  {
    key: "shipper_viewer",
    name: "Shipper Viewer",
    perms: ["load:read", "quote:read", "shipment:read", "doc:read", "billing:read", "notify:read"],
  },
  {
    key: "carrier_admin",
    name: "Carrier Admin",
    perms: [...CARRIER_FULL, "tenant:manage", "tenant:members"],
  },
  { key: "carrier_member", name: "Carrier Member", perms: CARRIER_FULL },
  {
    key: "platform_admin",
    name: "Platform Admin",
    perms: ["platform:admin", "tenant:manage", "tenant:members", "billing:read", "notify:read"],
  },
];

/** Default role assigned to the creator of a new (shipper) tenant. */
export const DEFAULT_ADMIN_ROLE = "shipper_admin";
/** Default role for a tenant that registers as a carrier. */
export const CARRIER_ADMIN_ROLE = "carrier_admin";
/** System-level ops role. Assigned manually; not auto-provisioned. */
export const PLATFORM_ADMIN_ROLE = "platform_admin";
