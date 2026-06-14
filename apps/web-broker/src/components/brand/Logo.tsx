import { cn } from "@/lib/utils";

interface LogoProps { variant?: "full" | "mark"; size?: number; className?: string; }

export function Logo({ variant = "full", size = 40, className }: LogoProps) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#0b1a2e" />
      <ellipse cx="24" cy="24" rx="9" ry="20" stroke="#c8a24a" strokeWidth="2" fill="none" />
      <ellipse cx="24" cy="24" rx="20" ry="9" stroke="#c8a24a" strokeWidth="2" fill="none" />
      <path d="M8 18 Q20 14 36 24 Q20 32 8 30" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6" />
      <circle cx="36" cy="16" r="3.5" fill="#c8a24a" />
      <path d="M34 14 L36 16 L40 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (variant === "mark") return <span className={cn("inline-flex shrink-0", className)}>{mark}</span>;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {mark}
      <span className="leading-tight">
        <span className="block text-[1.05rem] font-extrabold tracking-tight text-slate-900">
          EPL M<span style={{ color: "#c8a24a" }}>O</span>VE
        </span>
        <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
          World Connected
        </span>
      </span>
    </span>
  );
}
