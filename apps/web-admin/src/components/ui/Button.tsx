import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

const VARIANTS = {
  primary:   "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50",
  danger:    "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
  ghost:     "text-slate-600 hover:bg-slate-100 disabled:opacity-50",
};
const SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
};

export function Button({ variant = "primary", size = "md", className, children, ...props }: Props) {
  return (
    <button className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors", VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  );
}
