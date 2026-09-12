import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, LIVE, restoreToken } from "./client";

const MOCK_KEY = "epl-broker-mock-authed";

interface AuthState {
  live: boolean; authed: boolean; loading: boolean;
  login:  (email: string, password: string, tenantSlug?: string) => Promise<void>;
  register: (input: {
    email: string; password: string; name: string; tenantName: string;
    vatNumber: string; country: string; city: string; address: string; phone: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(MOCK_KEY)) { setAuthed(true); setLoading(false); return; }
    if (!api) { setLoading(false); return; }
    restoreToken();
    api.refresh()
      .then((t) => setAuthed(Boolean(t)))
      .catch(() => setAuthed(false))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, tenantSlug?: string) => {
    if (!api) throw new Error("No API");
    await api.login({ email, password, tenantSlug });
    setAuthed(true);
  }, []);

  const register = useCallback(async (input: {
    email: string; password: string; name: string; tenantName: string;
    vatNumber: string; country: string; city: string; address: string; phone: string;
  }) => {
    if (!api) throw new Error("No API");
    await api.register({ ...input, kind: "broker" });
    setAuthed(true);
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.removeItem(MOCK_KEY);
    await api?.logout();
    setAuthed(false);
  }, []);

  const value = useMemo<AuthState>(() => ({ live: LIVE, authed, loading, login, register, logout }), [authed, loading, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
