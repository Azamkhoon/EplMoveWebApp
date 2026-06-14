import { cn } from "@/lib/utils";

type Tone = "slate" | "blue" | "violet" | "emerald" | "amber" | "red" | "teal" | "orange";

const TONES: Record<Tone, string> = {
  slate:   "bg-slate-100 text-slate-600",
  blue:    "bg-blue-100 text-blue-700",
  violet:  "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber:   "bg-amber-100 text-amber-700",
  red:     "bg-red-100 text-red-700",
  teal:    "bg-teal-100 text-teal-700",
  orange:  "bg-orange-100 text-orange-700",
};

export function Badge({ label, tone = "slate" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", TONES[tone])}>
      {label}
    </span>
  );
}
