import { useEffect, useRef, useState, type ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration]);
  return value;
}

interface StatCardProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon: ReactNode;
  trend?: number; // percentage change
  accent?: "brand" | "emerald" | "amber" | "navy";
  hint?: string;
}

const accents: Record<NonNullable<StatCardProps["accent"]>, string> = {
  brand: "bg-brand-50 text-brand-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  navy: "bg-navy-50 text-navy-700",
};

export function StatCard({
  label,
  value,
  format = (n) => Math.round(n).toString(),
  icon,
  trend,
  accent = "brand",
  hint,
}: StatCardProps) {
  const animated = useCountUp(value);
  const up = (trend ?? 0) >= 0;
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            accents[accent]
          )}
        >
          {icon}
        </span>
        {typeof trend === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold",
              up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}
          >
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {format(animated)}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
