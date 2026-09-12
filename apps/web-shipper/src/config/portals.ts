export type PortalId = "shipper" | "carrier" | "broker" | "admin";

export interface PortalLink {
  id: PortalId;
  label: string;
  description: string;
  url: string;
}

const DEFAULTS: Record<PortalId, string> = {
  shipper: import.meta.env.DEV ? "http://localhost:5173" : "https://epl-move-web-shipper.vercel.app",
  carrier: import.meta.env.DEV ? "http://localhost:5174" : "https://epl-move-web-carrier.vercel.app",
  broker: import.meta.env.DEV ? "http://localhost:5175" : "https://epl-move-web-broker.vercel.app",
  admin: import.meta.env.DEV ? "http://localhost:5176" : "https://epl-move-web-app-web-admin.vercel.app",
};

function url(id: PortalId, envKey: keyof ImportMetaEnv): string {
  const v = import.meta.env[envKey] as string | undefined;
  return v?.trim() || DEFAULTS[id];
}

export const EPL_PORTALS: PortalLink[] = [
  {
    id: "shipper",
    label: "Customer",
    description: "Shipper portal — post loads, track shipments",
    url: url("shipper", "VITE_PORTAL_SHIPPER_URL"),
  },
  {
    id: "carrier",
    label: "Carrier",
    description: "Carrier portal — bid, dispatch, fleet",
    url: url("carrier", "VITE_PORTAL_CARRIER_URL"),
  },
  {
    id: "broker",
    label: "Broker",
    description: "Customs broker — declarations, HS codes, duty",
    url: url("broker", "VITE_PORTAL_BROKER_URL"),
  },
  {
    id: "admin",
    label: "Admin",
    description: "Platform admin — tenants, users, health",
    url: url("admin", "VITE_PORTAL_ADMIN_URL"),
  },
];

export function otherPortals(current: PortalId): PortalLink[] {
  return EPL_PORTALS.filter((p) => p.id !== current);
}

export function portalById(id: PortalId): PortalLink {
  return EPL_PORTALS.find((p) => p.id === id)!;
}
