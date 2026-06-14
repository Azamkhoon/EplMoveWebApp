import { cn } from "@/lib/utils";

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn(className)}>
      <rect width="40" height="40" rx="10" fill="#06101d" />
      <path d="M8 20C8 13.373 13.373 8 20 8s12 5.373 12 12-5.373 12-12 12S8 26.627 8 20Z" fill="#7c3aed" opacity="0.18" />
      <path d="M20 10l2.5 7.5H30l-6.25 4.5 2.5 7.5L20 25l-6.25 4.5 2.5-7.5L10 17.5h7.5L20 10Z" fill="#a78bfa" />
      <circle cx="20" cy="20" r="3" fill="#c4b5fd" />
    </svg>
  );
}
