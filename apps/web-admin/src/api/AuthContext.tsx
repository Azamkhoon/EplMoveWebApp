import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, LIVE, restoreToken } from "./client";

const DEMO_EMAIL    = "admin@epl-move.internal";
const DEMO_PASSWORD = "admin123";
const MOCK_KEY      = "epl-admin-mock-authed";

interface AuthState {
  live: boolean; authed: boolean; loading: boolean;
  login:  (email: string, password: string) => Promise<void>;
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

  const login = useCallback(async (email: string, password: string) => {
    // Demo shortcut — works even when no backend platform_admin user exists
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      sessionStorage.setItem(MOCK_KEY, "1");
      setAuthed(true);
      return;
    }
    if (!api) throw new Error("No API");
    await api.login({ email, password });
    setAuthed(true);
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.removeItem(MOCK_KEY);
    await api?.logout();
    setAuthed(false);
  }, []);

  const value = useMemo<AuthState>(() => ({ live: LIVE, authed, loading, login, logout }), [authed, loading, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
