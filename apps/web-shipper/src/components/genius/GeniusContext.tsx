import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface GeniusValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const GeniusContext = createContext<GeniusValue | null>(null);

export function GeniusProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
  );

  return (
    <GeniusContext.Provider value={value}>{children}</GeniusContext.Provider>
  );
}

export function useGenius() {
  const ctx = useContext(GeniusContext);
  if (!ctx) throw new Error("useGenius must be used within GeniusProvider");
  return ctx;
}
