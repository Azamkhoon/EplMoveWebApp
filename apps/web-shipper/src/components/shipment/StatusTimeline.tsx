import { Check } from "lucide-react";
import type { TrackingEvent } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";

export function StatusTimeline({ events }: { events: TrackingEvent[] }) {
  const nextIdx = events.findIndex((e) => !e.completed);
  return (
    <ol className="relative space-y-0">
      {events.map((e, i) => {
        const isCurrent = i === nextIdx - 1 || (nextIdx === -1 && i === events.length - 1);
        const last = i === events.length - 1;
        return (
          <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                className={cn(
                  "absolute left-[11px] top-6 h-full w-0.5",
                  e.completed ? "bg-brand-200" : "bg-slate-200"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                e.completed
                  ? "bg-brand-600 text-white"
                  : "border-2 border-slate-300 bg-white"
              )}
            >
              {e.completed ? (
                <Check size={13} strokeWidth={3} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              )}
            </span>
            <div className={cn("min-w-0 flex-1", !e.completed && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{e.status}</p>
                {isCurrent && e.completed && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
                    Current
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{e.description}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {e.location} · {formatDateTime(e.timestamp)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
