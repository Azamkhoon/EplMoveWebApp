import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem { id: string; label: ReactNode; }

export function Tabs({ items, active, onChange, variant = "underline", className }: {
  items: TabItem[]; active: string; onChange: (id: string) => void;
  variant?: "underline" | "pill"; className?: string;
}) {
  if (variant === "pill") {
    return (
      <div className={cn("inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1", className)}>
        {items.map((t) => (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              active === t.id ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
            {t.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {items.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cn("relative px-4 py-3 text-sm font-medium transition-colors",
            active === t.id ? "text-brand-700" : "text-slate-500 hover:text-slate-800")}>
          {t.label}
          {active === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
        </button>
      ))}
    </div>
  );
}
