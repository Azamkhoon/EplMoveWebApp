import { EplClient } from "@epl/sdk";

/** Live API connection. Missing configuration never enables a demo session. */
export const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const LIVE = Boolean(API_URL);

export const api = LIVE
  ? new EplClient({
      baseUrl: API_URL!,
      portal: "carrier",
      onTokenChange: (t) => {
        if (t) sessionStorage.setItem("epl-carrier-access", t);
        else sessionStorage.removeItem("epl-carrier-access");
      },
    })
  : null;

/** Restore an access token across reloads (best-effort; refresh cookie is source of truth). */
export function restoreToken() {
  const t = sessionStorage.getItem("epl-carrier-access");
  if (t && api) api.setToken(t);
}
