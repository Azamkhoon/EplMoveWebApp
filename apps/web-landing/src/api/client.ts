import { EplClient } from "@epl/sdk";

export const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export const PORTAL_URLS = {
  shipper: import.meta.env.VITE_PORTAL_SHIPPER_URL ?? (import.meta.env.DEV ? "http://localhost:5173" : "https://epl-move-web-shipper.vercel.app"),
  carrier: import.meta.env.VITE_PORTAL_CARRIER_URL ?? (import.meta.env.DEV ? "http://localhost:5174" : "https://epl-move-web-carrier.vercel.app"),
  broker:  import.meta.env.VITE_PORTAL_BROKER_URL  ?? (import.meta.env.DEV ? "http://localhost:5175" : "https://epl-move-web-broker.vercel.app"),
} as const;

export const api = API_URL
  ? new EplClient({
      baseUrl: API_URL,
      portal: "shipper",
      onTokenChange: (t) => {
        if (t) sessionStorage.setItem("epl-access", t);
        else sessionStorage.removeItem("epl-access");
      },
    })
  : null;

export function restoreToken() {
  const t = sessionStorage.getItem("epl-access");
  if (t && api) api.setToken(t);
}
