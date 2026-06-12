import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Gavel, Loader2, RefreshCw, Store } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/Misc";
import { api } from "@/api/client";
import { ApiError, type MarketplaceQuote } from "@epl/sdk";
import { formatCurrency, relativeTime } from "@/lib/utils";

export function Marketplace() {
  const [quotes, setQuotes] = useState<MarketplaceQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidding, setBidding] = useState<MarketplaceQuote | null>(null);
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [co2, setCo2] = useState("");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(false);

  async function load() {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      setQuotes(await api.listOpenQuotes());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load the marketplace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openBid(q: MarketplaceQuote) {
    setBidding(q);
    setPlaced(false);
    setPrice(q.bestPrice ? String(Math.round(q.bestPrice * 0.97)) : "");
    setDays("");
    setCo2("");
  }

  async function submit() {
    if (!api || !bidding) return;
    setBusy(true);
    setError(null);
    try {
      await api.submitMarketplaceBid(bidding.id, {
        price: { amount: Number(price), currency: "USD" },
        transitDays: Number(days),
        co2Kg: co2 ? Number(co2) : undefined,
      });
      setPlaced(true);
      void load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Bid failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{quotes.length}</span> open load
          {quotes.length === 1 ? "" : "s"} requesting quotes
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" /> Loading marketplace…
          </div>
        ) : quotes.length === 0 ? (
          <EmptyState
            icon={<Store size={22} />}
            title="No open loads right now"
            description="When shippers request quotes, their loads appear here for bidding."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="row-pad-y px-4 font-medium">Reference</th>
                  <th className="row-pad-y px-4 font-medium">Mode</th>
                  <th className="row-pad-y px-4 font-medium">Posted</th>
                  <th className="row-pad-y px-4 font-medium">Bids</th>
                  <th className="row-pad-y px-4 text-right font-medium">Best price</th>
                  <th className="row-pad-y px-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {quotes.map((q) => (
                  <tr key={q.id} className="transition hover:bg-slate-50">
                    <td className="row-pad-y px-4 font-semibold text-slate-900">{q.reference}</td>
                    <td className="row-pad-y px-4">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {q.mode}
                      </span>
                    </td>
                    <td className="row-pad-y px-4 text-slate-500">{relativeTime(q.createdAt)}</td>
                    <td className="row-pad-y px-4">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Gavel size={13} className="text-slate-400" /> {q.bidCount}
                        {q.myBidCount > 0 && <Badge tone="blue">yours in</Badge>}
                      </span>
                    </td>
                    <td className="row-pad-y px-4 text-right font-medium text-slate-900">
                      {q.bestPrice != null ? formatCurrency(q.bestPrice) : "—"}
                    </td>
                    <td className="row-pad-y px-4 text-right">
                      <Button size="sm" variant={q.myBidCount > 0 ? "outline" : "primary"} onClick={() => openBid(q)}>
                        {q.myBidCount > 0 ? "Rebid" : "Bid"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!bidding}
        onClose={() => setBidding(null)}
        title={placed ? "Bid placed" : `Bid on ${bidding?.reference ?? ""}`}
        subtitle={placed ? undefined : `${bidding?.mode} · ${bidding?.bidCount ?? 0} competing bid(s)`}
        footer={
          placed ? (
            <Button onClick={() => setBidding(null)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setBidding(null)}>
                Cancel
              </Button>
              <Button disabled={busy || !price || !days} onClick={() => void submit()}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : "Submit bid"}
              </Button>
            </>
          )
        }
      >
        {placed ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={30} />
            </span>
            <p className="mt-4 text-sm text-slate-600">
              Your bid of <span className="font-semibold text-slate-900">{formatCurrency(Number(price))}</span> is in.
              You'll see the outcome under <span className="font-semibold">My Bids</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bidding?.bestPrice != null && (
              <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
                <Clock size={13} /> Current best price: {formatCurrency(bidding.bestPrice)} — undercut it to lead.
              </p>
            )}
            <Field label="Your all-in rate (USD)">
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8200" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Transit time (days)">
                <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="28" />
              </Field>
              <Field label="CO₂ (kg, optional)">
                <Input type="number" value={co2} onChange={(e) => setCo2(e.target.value)} placeholder="3400" />
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
