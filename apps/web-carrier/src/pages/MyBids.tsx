import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Gavel, Loader2, XCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/api/client";
import type { CarrierBid } from "@epl/sdk";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Tab = "pending" | "won" | "lost";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right text-xs font-medium text-slate-800">{value}</span>
    </div>
  );
}

function BidDetailPanel({ bid }: { bid: CarrierBid }) {
  const isWon  = bid.status === "accepted";
  const isLost = bid.status === "rejected";

  return (
    <div className="border-l border-slate-100 bg-slate-50 p-6 lg:w-80 xl:w-96 shrink-0">
      <div className="mb-4 flex items-center gap-2">
        {isWon  && <CheckCircle2 size={18} className="text-emerald-500" />}
        {isLost && <XCircle      size={18} className="text-slate-400"   />}
        {!isWon && !isLost && <Clock size={18} className="text-amber-500" />}
        <span className="text-sm font-semibold text-slate-900">
          {isWon ? "You won this load" : isLost ? "Bid not selected" : "Awaiting decision"}
        </span>
      </div>

      <div className="space-y-3">
        <Row label="Reference"    value={bid.reference} />
        <Row label="Mode"         value={bid.mode} />
        <Row label="Your rate"    value={formatCurrency(bid.price.amount)} />
        <Row label="Transit"      value={`${bid.transitDays} days`} />
        {bid.co2Kg != null && <Row label="CO₂" value={`${bid.co2Kg.toLocaleString()} kg`} />}
        <Row label="Bid placed"   value={formatDateTime(bid.createdAt)} />
        <Row label="Quote status" value={
          <Badge tone={bid.quoteStatus === "awarded" ? "green" : bid.quoteStatus === "open" ? "blue" : "slate"}>
            {bid.quoteStatus}
          </Badge>
        } />
      </div>

      {isWon && (
        <div className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <p className="text-xs font-medium text-emerald-700">
            This bid was accepted. Coordinate with the shipper to confirm pickup details and assign a driver.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, count, tone, suffix = "" }: {
  label: string; count: number;
  tone: "amber" | "green" | "slate" | "blue"; suffix?: string;
}) {
  const tones: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
    blue:  "bg-blue-50 text-blue-700 ring-blue-200",
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-2 ring-1 ${tones[tone]}`}>
      <span className="text-xl font-bold">{count}{suffix}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

export function MyBids() {
  const [bids, setBids]         = useState<CarrierBid[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>("pending");
  const [selected, setSelected] = useState<CarrierBid | null>(null);

  useEffect(() => {
    if (!api) return;
    api.listMyBids()
      .then((b) => { setBids(b); if (b.length > 0) setSelected(b[0]); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const pending = bids.filter((b) => b.status === "submitted");
  const won     = bids.filter((b) => b.status === "accepted");
  const lost    = bids.filter((b) => b.status === "rejected");
  const shown   = tab === "pending" ? pending : tab === "won" ? won : lost;

  const winRate = (won.length + lost.length) > 0
    ? Math.round((won.length / (won.length + lost.length)) * 100) : null;

  return (
    <div className="space-y-5">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <SummaryPill label="Pending" count={pending.length} tone="amber" />
        <SummaryPill label="Won"     count={won.length}     tone="green" />
        <SummaryPill label="Lost"    count={lost.length}    tone="slate" />
        {winRate !== null && <SummaryPill label="Win rate" count={winRate} suffix="%" tone="blue" />}
      </div>

      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {/* List pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-slate-100 px-5 pt-4 pb-0">
            <Tabs
              variant="underline"
              active={tab}
              onChange={(t) => setTab(t as Tab)}
              items={[
                { id: "pending", label: `Pending (${pending.length})` },
                { id: "won",     label: `Won (${won.length})`         },
                { id: "lost",    label: `Lost (${lost.length})`       },
              ]}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Loading bids…
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={<Gavel size={22} />}
              title={`No ${tab} bids`}
              description={tab === "pending" ? "Quote loads from the Marketplace to see bids here." : `No ${tab} bids yet.`}
            />
          ) : (
            <div className="divide-y divide-slate-50 overflow-y-auto">
              {shown.map((b) => {
                const isWon  = b.status === "accepted";
                const isLost = b.status === "rejected";
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className={`flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50 ${selected?.id === b.id ? "bg-brand-50" : ""}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isWon ? "bg-emerald-100 text-emerald-600" :
                      isLost ? "bg-slate-100 text-slate-400" :
                      "bg-amber-100 text-amber-600"
                    }`}>
                      {isWon  ? <CheckCircle2 size={16} /> :
                       isLost ? <XCircle      size={16} /> :
                                <Clock        size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{b.reference}</span>
                        <Badge tone={b.mode === "Ocean" ? "blue" : b.mode === "Air" ? "amber" : "slate"} className="text-[10px]">
                          {b.mode}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {b.transitDays}d · {formatCurrency(b.price.amount)}
                      </p>
                    </div>
                    <Badge tone={isWon ? "green" : isLost ? "slate" : "amber"}>
                      {isWon ? "Won" : isLost ? "Lost" : "Pending"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail pane */}
        {selected && <BidDetailPanel bid={selected} />}
      </div>
    </div>
  );
}
