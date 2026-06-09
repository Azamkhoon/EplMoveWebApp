import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Accent = "blue" | "indigo" | "emerald" | "violet" | "amber";
export type Density = "comfortable" | "cozy" | "compact";

export interface ThemePrefs {
  accent: Accent;
  density: Density;
  /** Start the sidebar collapsed. */
  sidebarCollapsed: boolean;
}

const DEFAULTS: ThemePrefs = {
  accent: "blue",
  density: "cozy",
  sidebarCollapsed: false,
};

const STORAGE_KEY = "epl-theme";

export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: "blue", label: "Blue", swatch: "#3b82f6" },
  { id: "indigo", label: "Indigo", swatch: "#6366f1" },
  { id: "violet", label: "Violet", swatch: "#8b5cf6" },
  { id: "emerald", label: "Emerald", swatch: "#10b981" },
  { id: "amber", label: "Amber", swatch: "#f59e0b" },
];

export const DENSITIES: { id: Density; label: string; hint: string }[] = [
  { id: "comfortable", label: "Comfortable", hint: "Roomy spacing" },
  { id: "cozy", label: "Cozy", hint: "Balanced (default)" },
  { id: "compact", label: "Compact", hint: "Dense, data-first" },
];

function readInitial(): ThemePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ThemePrefs>) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

/** Applies the prefs to <html> so the CSS-variable system picks them up. */
function applyToDocument(prefs: ThemePrefs) {
  const el = document.documentElement;
  // "blue" is the default :root accent (no attribute needed).
  if (prefs.accent === "blue") el.removeAttribute("data-accent");
  else el.setAttribute("data-accent", prefs.accent);
  // "cozy" is the default :root density.
  if (prefs.density === "cozy") el.removeAttribute("data-density");
  else el.setAttribute("data-density", prefs.density);
}

interface ThemeState extends ThemePrefs {
  setAccent: (a: Accent) => void;
  setDensity: (d: Density) => void;
  setSidebarCollapsed: (v: boolean) => void;
  reset: () => void;
}

const ThemeCtx = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePrefs>(readInitial);

  // Apply + persist whenever prefs change.
  useEffect(() => {
    applyToDocument(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const setAccent = useCallback((accent: Accent) => setPrefs((p) => ({ ...p, accent })), []);
  const setDensity = useCallback((density: Density) => setPrefs((p) => ({ ...p, density })), []);
  const setSidebarCollapsed = useCallback(
    (sidebarCollapsed: boolean) => setPrefs((p) => ({ ...p, sidebarCollapsed })),
    [],
  );
  const reset = useCallback(() => setPrefs(DEFAULTS), []);

  const value = useMemo<ThemeState>(
    () => ({ ...prefs, setAccent, setDensity, setSidebarCollapsed, reset }),
    [prefs, setAccent, setDensity, setSidebarCollapsed, reset],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
