import type { ReactNode } from "react";
import { cn, STATUS_META } from "@/lib/utils";
import type { ShipmentStatus } from "@/types";
import { useI18n } from "@/i18n/LanguageContext";

export function StatusPill({
  status,
  className,
}: {
  status: ShipmentStatus;
  className?: string;
}) {
  const { t } = useI18n();
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        m.bg,
        m.text,
        m.ring,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {t(`status.${status}`) === `status.${status}` ? m.label : t(`status.${status}`)}
    </span>
  );
}

type Tone = "blue" | "green" | "amber" | "red" | "slate" | "navy";

const tones: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  navy: "bg-navy-50 text-navy-700 ring-navy-200",
};

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
