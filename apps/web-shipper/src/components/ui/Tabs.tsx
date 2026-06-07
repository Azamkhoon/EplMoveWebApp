import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
}

export function Tabs({
  items,
  active,
  onChange,
  className,
  variant = "underline",
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: "underline" | "pill";
}) {
  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1",
          className
        )}
      >
        {items.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              active === t.id
                ? "bg-white text-navy-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {t.icon}
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 text-xs",
                  active === t.id
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-200 text-slate-500"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 border-b border-slate-200", className)}>
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            active === t.id
              ? "text-brand-700"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          {t.icon}
          {t.label}
          {typeof t.count === "number" && (
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                active === t.id
                  ? "bg-brand-100 text-brand-700"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              {t.count}
            </span>
          )}
          {active === t.id && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
          )}
        </button>
      ))}
    </div>
  );
}
