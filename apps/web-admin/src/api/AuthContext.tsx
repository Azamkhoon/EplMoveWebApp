import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, LIVE, restoreToken } from "./client";

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
    if (!api) { setLoading(false); return; }
    restoreToken();
    api.refresh()
      .then((t) => setAuthed(Boolean(t)))
      .catch(() => setAuthed(false))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!api) throw new Error("No API");
    await api.login({ email, password });
    setAuthed(true);
  }, []);

  const logout = useCallback(async () => {
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
