import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, LIVE, restoreToken } from "./client";

interface AuthState {
  live: boolean; // true = real backend, false = mock mode
  authed: boolean;
  loading: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    tenantName: string;
  }) => Promise<void>;
  requestOtp: (email: string) => Promise<{ devCode?: string }>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // In mock mode there is no auth — treat as always authed.
  const [authed, setAuthed] = useState(!LIVE);
  const [loading, setLoading] = useState(LIVE);

  useEffect(() => {
    if (!LIVE || !api) return;
    restoreToken();
    // Try to silently restore a session via the refresh cookie.
    api
      .refresh()
      .then((t) => setAuthed(Boolean(t)))
      .finally(() => setLoading(false));
  }, []);

  const value: AuthState = {
    live: LIVE,
    authed,
    loading,
    async login(email, password, tenantSlug) {
      await api!.login({ email, password, tenantSlug });
      setAuthed(true);
    },
    async register(input) {
      await api!.register(input);
      setAuthed(true);
    },
    requestOtp: (email) => api!.requestOtp(email),
    async verifyOtp(email, code) {
      await api!.verifyOtp(email, code);
      setAuthed(true);
    },
    async logout() {
      await api!.logout();
      setAuthed(false);
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
