import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Gavel, Loader2, XCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { api } from "@/api/client";
import { ApiError, type CarrierBid } from "@epl/sdk";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

type Tab = "pending" | "won" | "lost";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right text-xs font-medium text-slate-800">{value}</span>
    </div>
  );
}

function BidDetailPanel({
  bid,
  onChanged,
}: {
  bid: CarrierBid;
  onChanged: (bid: CarrierBid) => void;
}) {
  const { t } = useI18n();
  const isWon  = bid.status === "accepted";
  const isLost = bid.status === "rejected" || bid.status === "withdrawn";
  const active = bid.status === "submitted" && bid.quoteStatus === "open";
  const [price, setPrice] = useState(String(bid.price.amount));
  const [days, setDays] = useState(String(bid.transitDays));
  const [comment, setComment] = useState(bid.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrice(String(bid.price.amount));
    setDays(String(bid.transitDays));
    setComment(bid.comment ?? "");
    setError(null);
  }, [bid.id, bid.price.amount, bid.transitDays, bid.comment]);

  async function update() {
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      onChanged(await api.updateMarketplaceBid(bid.id, {
        price: { amount: Number(price), currency: bid.price.currency },
        transitDays: Number(days),
        comment: comment || undefined,
      }));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not update bid");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      onChanged(await api.withdrawMarketplaceBid(bid.id));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not withdraw bid");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-l border-slate-100 bg-slate-50 p-6 lg:w-80 xl:w-96 shrink-0">
      <div className="mb-4 flex items-center gap-2">
        {isWon  && <CheckCircle2 size={18} className="text-emerald-500" />}
        {isLost && <XCircle      size={18} className="text-slate-400"   />}
        {!isWon && !isLost && <Clock size={18} className="text-amber-500" />}
        <span className="text-sm font-semibold text-slate-900">
          {isWon ? t("status.won") : isLost ? t("status.lost") : t("status.pending")}
        </span>
      </div>

      <div className="space-y-3">
        <Row label={t("common.shipment")} value={bid.reference} />
        <Row label={t("shipments.mode")} value={bid.mode} />
        <Row label={t("market.price")} value={formatCurrency(bid.price.amount)} />
        <Row label={t("market.transit")} value={`${bid.transitDays}`} />
        {bid.co2Kg != null && <Row label="CO₂" value={`${bid.co2Kg.toLocaleString()} kg`} />}
        {bid.equipment && <Row label="Equipment" value={bid.equipment} />}
        {bid.truckInfo && <Row label="Truck" value={bid.truckInfo} />}
        {bid.comment && <Row label="Comment" value={bid.comment} />}
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
            {t("bids.acceptedHint")}
          </p>
        </div>
      )}

      {active && (
        <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Manage offer</p>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Rate">
              <Input type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
            </Field>
            <Field label="Transit days">
              <Input type="number" value={days} onChange={(event) => setDays(event.target.value)} />
            </Field>
          </div>
          <Field label="Comment">
            <Input value={comment} onChange={(event) => setComment(event.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !price || !days} onClick={() => void update()}>
              Update offer
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void withdraw()}>
              Withdraw
            </Button>
          </div>
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
  const { t } = useI18n();
  const [bids, setBids]         = useState<CarrierBid[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>("pending");
  const [selected, setSelected] = useState<CarrierBid | null>(null);

  function replaceBid(next: CarrierBid) {
    setBids((current) => current.map((bid) => (bid.id === next.id ? next : bid)));
    setSelected(next);
  }

  useEffect(() => {
    if (!api) return;
    api.listMyBids()
      .then((b) => { setBids(b); if (b.length > 0) setSelected(b[0]); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const pending = bids.filter((b) => b.status === "submitted");
  const won     = bids.filter((b) => b.status === "accepted");
  const lost    = bids.filter((b) => b.status === "rejected" || b.status === "withdrawn");
  const shown   = tab === "pending" ? pending : tab === "won" ? won : lost;

  const winRate = (won.length + lost.length) > 0
    ? Math.round((won.length / (won.length + lost.length)) * 100) : null;

  return (
    <div className="space-y-5">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <SummaryPill label={t("bids.pending")} count={pending.length} tone="amber" />
        <SummaryPill label={t("bids.won")} count={won.length} tone="green" />
        <SummaryPill label={t("bids.lost")} count={lost.length} tone="slate" />
        {winRate !== null && <SummaryPill label={t("analytics.bidWinRate")} count={winRate} suffix="%" tone="blue" />}
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
                { id: "pending", label: `${t("bids.pending")} (${pending.length})` },
                { id: "won", label: `${t("bids.won")} (${won.length})` },
                { id: "lost", label: `${t("bids.lost")} (${lost.length})` },
              ]}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> {t("bids.loading")}
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={<Gavel size={22} />}
              title={t("bids.none")}
              description={t("bids.marketHint")}
            />
          ) : (
            <div className="divide-y divide-slate-50 overflow-y-auto">
              {shown.map((b) => {
                const isWon  = b.status === "accepted";
                const isLost = b.status === "rejected" || b.status === "withdrawn";
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
                      {isWon ? t("bids.won") : isLost ? t("bids.lost") : t("bids.pending")}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail pane */}
        {selected && <BidDetailPanel bid={selected} onChanged={replaceBid} />}
      </div>
    </div>
  );
}
