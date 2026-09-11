import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ShipmentStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string, locale = "en") {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (mins < 1) return formatter.format(0, "minute");
  if (mins < 60) return formatter.format(-mins, "minute");
  const hours = Math.round(mins / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return formatter.format(-days, "day");
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const STATUS_META: Record<
  ShipmentStatus,
  { label: string; dot: string; text: string; bg: string; ring: string }
> = {
  posted: {
    label: "Posted",
    dot: "bg-blue-500",
    text: "text-blue-700",
    bg: "bg-blue-50",
    ring: "ring-blue-200",
  },
  draft: {
    label: "Draft",
    dot: "bg-slate-400",
    text: "text-slate-600",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
  },
  booked: {
    label: "Booked",
    dot: "bg-indigo-500",
    text: "text-indigo-700",
    bg: "bg-indigo-50",
    ring: "ring-indigo-200",
  },
  carrier_selected: {
    label: "Carrier Selected", dot: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50", ring: "ring-violet-200",
  },
  pickup_scheduled: {
    label: "Pickup Scheduled", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200",
  },
  picked_up: {
    label: "Picked Up", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-slate-400",
    text: "text-slate-500",
    bg: "bg-slate-50",
    ring: "ring-slate-200",
  },
  in_transit: {
    label: "In Transit",
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
  },
  customs: {
    label: "Customs", dot: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50", ring: "ring-violet-200",
  },
  delivered: {
    label: "Delivered",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
  },
  delayed: {
    label: "Delayed",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    ring: "ring-red-200",
  },
  completed: {
    label: "Completed", dot: "bg-emerald-600", text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200",
  },
};

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
