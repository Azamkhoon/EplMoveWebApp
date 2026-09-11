import { EplClient } from "@epl/sdk";

export const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const LIVE = Boolean(API_URL);

export const api = LIVE
  ? new EplClient({
      baseUrl: API_URL!,
      portal: "admin",
      onTokenChange: (t) => {
        if (t) sessionStorage.setItem("epl-admin-access", t);
        else sessionStorage.removeItem("epl-admin-access");
      },
    })
  : null;

export function restoreToken() {
  const t = sessionStorage.getItem("epl-admin-access");
  if (t && api) api.setToken(t);
}
