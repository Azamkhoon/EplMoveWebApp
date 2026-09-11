import { EplClient } from "@epl/sdk";

export const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const LIVE = Boolean(API_URL);

export const api = LIVE
  ? new EplClient({
      baseUrl: API_URL!,
      portal: "broker",
      onTokenChange: (t) => {
        if (t) sessionStorage.setItem("epl-broker-access", t);
        else sessionStorage.removeItem("epl-broker-access");
      },
    })
  : null;

export function restoreToken() {
  const t = sessionStorage.getItem("epl-broker-access");
  if (t && api) api.setToken(t);
}
