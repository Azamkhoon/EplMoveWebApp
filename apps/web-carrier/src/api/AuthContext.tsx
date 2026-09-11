import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, LIVE, restoreToken } from "./client";

const DEMO_EMAIL    = "carrier@oceanflex.test";
const DEMO_PASSWORD = "carrier123";
const MOCK_KEY      = "epl-carrier-mock-authed";

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
    vatNumber: string;
    country: string;
    city: string;
    address: string;
    phone: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(LIVE);

  useEffect(() => {
    if (sessionStorage.getItem(MOCK_KEY)) { setAuthed(true); setLoading(false); return; }
    if (!LIVE || !api) { setLoading(false); return; }
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
      // Demo shortcut — works even when backend is offline
      if (!LIVE && email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        sessionStorage.setItem(MOCK_KEY, "1");
        setAuthed(true);
        return;
      }
      await api!.login({ email, password, tenantSlug });
      setAuthed(true);
    },
    async register(input) {
      await api!.register({
        ...input,
        kind: "carrier",
      });
      setAuthed(true);
    },
    async logout() {
      sessionStorage.removeItem(MOCK_KEY);
      await api?.logout();
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
