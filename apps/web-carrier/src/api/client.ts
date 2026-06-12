import { EplClient } from "@epl/sdk";

/**
 * API mode. The carrier portal is live-only — it exists to interact with the
 * real marketplace. Without VITE_API_URL the app renders a setup notice.
 */
export const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const LIVE = Boolean(API_URL);

export const api = LIVE
  ? new EplClient({
      baseUrl: API_URL!,
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
