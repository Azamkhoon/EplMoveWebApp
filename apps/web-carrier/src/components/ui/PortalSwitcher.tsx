import { useState } from "react";
import { Check, ChevronDown, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { EPL_PORTALS, portalById, type PortalId } from "@/config/portals";

interface PortalSwitcherProps {
  current: PortalId;
  variant?: "light" | "dark";
  collapsed?: boolean;
}

export function PortalSwitcher({ current, variant = "light", collapsed = false }: PortalSwitcherProps) {
  const [open, setOpen] = useState(false);
  const active = portalById(current);
  const dark = variant === "dark";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Switch EPL Move portal"
        className={cn(
          "flex items-center gap-2 rounded-lg border text-sm font-medium transition-colors",
          collapsed ? "h-10 w-10 justify-center px-0" : "h-10 px-3",
          dark
            ? "border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        )}
      >
        <LayoutGrid size={16} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="hidden sm:inline">{active.label}</span>
            <ChevronDown size={14} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "absolute z-50 w-72 animate-fade-in rounded-xl border p-1.5 shadow-lg",
              dark ? "border-white/10 bg-navy-900" : "border-slate-200 bg-white shadow-card-hover",
              collapsed ? "left-0 top-12" : "right-0 top-12",
            )}
          >
            <p
              className={cn(
                "px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide",
                dark ? "text-white/40" : "text-slate-400",
              )}
            >
              EPL Move portals
            </p>
            {EPL_PORTALS.map((p) => (
              <a
                key={p.id}
                href={p.url}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors",
                  p.id === current
                    ? dark
                      ? "bg-brand-600/30 text-white"
                      : "bg-brand-50 text-brand-800"
                    : dark
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className={cn("text-xs leading-snug", dark ? "text-white/45" : "text-slate-500")}>
                    {p.description}
                  </p>
                  <p className={cn("mt-0.5 font-mono text-[10px]", dark ? "text-white/30" : "text-slate-400")}>
                    {p.url.replace(/^https?:\/\//, "")}
                  </p>
                </div>
                {p.id === current && <Check size={15} className="mt-0.5 shrink-0 text-brand-500" />}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
