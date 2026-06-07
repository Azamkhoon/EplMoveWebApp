import type { KpiPoint, LaneStat, ModeSpend } from "@/types";

export const MONTHLY_TREND: KpiPoint[] = [
  { label: "Jan", shipments: 42, delivered: 39, spend: 184000 },
  { label: "Feb", shipments: 51, delivered: 47, spend: 211000 },
  { label: "Mar", shipments: 48, delivered: 45, spend: 198000 },
  { label: "Apr", shipments: 63, delivered: 59, spend: 256000 },
  { label: "May", shipments: 58, delivered: 55, spend: 241000 },
  { label: "Jun", shipments: 71, delivered: 64, spend: 298000 },
];

export const MODE_SPEND: ModeSpend[] = [
  { mode: "Ocean", spend: 612000, share: 46 },
  { mode: "Air", spend: 384000, share: 29 },
  { mode: "FTL", spend: 168000, share: 13 },
  { mode: "LTL", spend: 92000, share: 7 },
  { mode: "Rail", spend: 67000, share: 5 },
];

export const TOP_LANES: LaneStat[] = [
  { lane: "Shanghai → Rotterdam", volume: 28, onTime: 94 },
  { lane: "Mumbai → Hamburg", volume: 21, onTime: 88 },
  { lane: "Singapore → Le Havre", volume: 18, onTime: 91 },
  { lane: "Dubai → Felixstowe", volume: 15, onTime: 96 },
  { lane: "Rotterdam → Gdansk", volume: 12, onTime: 97 },
];

export const WEEKLY_VOLUME = [
  { day: "Mon", inbound: 8, outbound: 12 },
  { day: "Tue", inbound: 11, outbound: 9 },
  { day: "Wed", inbound: 7, outbound: 14 },
  { day: "Thu", inbound: 13, outbound: 10 },
  { day: "Fri", inbound: 16, outbound: 15 },
  { day: "Sat", inbound: 5, outbound: 4 },
  { day: "Sun", inbound: 3, outbound: 2 },
];

export const ON_TIME_RATE = 92.4;
export const AVG_TRANSIT_DAYS = 11.3;
