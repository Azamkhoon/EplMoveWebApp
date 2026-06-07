import { EplClient } from "@epl/sdk";

/**
 * API mode. When VITE_API_URL is set, the app talks to the real gateway.
 * When unset, the app stays in mock mode (existing data/* modules) so it runs
 * offline with no backend — see docs/architecture/07-roadmap.md (Phase 1).
 */
export const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const LIVE = Boolean(API_URL);

export const api = LIVE
  ? new EplClient({
      baseUrl: API_URL!,
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
