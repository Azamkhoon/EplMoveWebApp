import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, LIVE, restoreToken } from "./client";

interface AuthState {
  live: boolean;
  authed: boolean;
  loading: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  /** Registers a CARRIER tenant (kind is fixed for this portal). */
  register: (input: {
    email: string;
    password: string;
    name: string;
    tenantName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(LIVE);

  useEffect(() => {
    if (!LIVE || !api) return;
    restoreToken();
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
      await api!.register({ ...input, kind: "carrier" });
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
