import { EplClient } from "@epl/sdk";

/** Live API connection. Missing configuration never enables a demo session. */
export const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const DEMO_SESSION_KEY = "epl-shipper-mock-authed";

// Authentication always requires the configured API.
export const LIVE = Boolean(API_URL);

export const api = API_URL
  ? new EplClient({
      baseUrl: API_URL!,
      portal: "shipper",
      onTokenChange: (t) => {
        if (t) sessionStorage.setItem("epl-access", t);
        else sessionStorage.removeItem("epl-access");
      },
    })
  : null;

/** Restore an access token across reloads (best-effort; refresh cookie is source of truth). */
export function restoreToken() {
  const t = sessionStorage.getItem("epl-access");
  if (t && api) api.setToken(t);
}
