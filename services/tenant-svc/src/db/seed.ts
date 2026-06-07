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
    perms: ["load:read", "quote:read", "shipment:read", "doc:read", "billing:read"],
  },
];

/** Default role assigned to the creator of a new tenant. */
export const DEFAULT_ADMIN_ROLE = "shipper_admin";
