import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "amber" | "red" | "slate" | "teal" | "purple" | "navy";
const tones: Record<Tone, string> = {
  blue:   "bg-blue-50 text-blue-700 ring-blue-200",
  green:  "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber:  "bg-amber-50 text-amber-700 ring-amber-200",
  red:    "bg-red-50 text-red-700 ring-red-200",
  slate:  "bg-slate-100 text-slate-600 ring-slate-200",
  teal:   "bg-teal-50 text-teal-700 ring-teal-200",
  purple: "bg-purple-50 text-purple-700 ring-purple-200",
  navy:   "bg-navy-50 text-navy-700 ring-navy-200",
};

export function Badge({ children, tone = "slate", className }: {
  children: ReactNode; tone?: Tone; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}>
      {children}
    </span>
  );
}
