import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Leaf,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { api, LIVE } from "@/api/client";
import { ApiError, type Load, type Quote, type Shipment } from "@epl/sdk";
import { formatCurrency } from "@/lib/utils";

/**
 * Live marketplace flow (Phase 2): pick a posted load → request quotes →
 * compare carrier bids (rate / transit / rating) → accept → shipment created.
 * Only meaningful in LIVE mode (VITE_API_URL set).
 */
export function Marketplace() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(LIVE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!LIVE || !api) return;
    api
      .listLoads()
      .then(setLoads)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!api || !quote?.id || quote.status !== "open") return;
    let active = true;
    const refresh = async () => {
      try {
        const current = await api!.getQuote(quote.id);
        if (active) setQuote(current);
      } catch {
        // Notification delivery remains active; retry on the next interval.
      }
    };
    const timer = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [quote?.id, quote?.status]);

  async function requestQuotes(load: Load) {
    if (!api) return;
    setBusy(true);
    setError(null);
    setShipment(null);
    try {
      const q = await api.createQuote({ loadId: load.id, reference: load.reference, mode: load.mode });
      setQuote(q);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to request quotes");
    } finally {
      setBusy(false);
    }
  }

  async function accept(bidId: string) {
    if (!api || !quote) return;
    setBusy(true);
    setError(null);
    try {
      await api.acceptBid(quote.id, bidId);
      // shipment-svc creates the shipment asynchronously; poll briefly.
      let s: Shipment | null = null;
      for (let i = 0; i < 8 && !s; i++) {
        await new Promise((r) => setTimeout(r, 700));
        const list = await api.listShipments();
        s = list.find((x) => x.quoteId === quote.id) ?? null;
      }
      setShipment(s);
      setQuote(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to accept bid");
    } finally {
      setBusy(false);
    }
  }

  async function reject(bidId: string) {
    if (!api || !quote) return;
    setBusy(true); setError(null);
    try {
      setQuote(await api.rejectBid(quote.id, bidId));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Failed to reject bid");
    } finally {
      setBusy(false);
    }
  }

  if (!LIVE) {
    return (
      <Card>
        <EmptyState
          icon={<Sparkles size={22} />}
          title="Transport Board requires the backend"
          description="Set VITE_API_URL and sign in to request quotes, compare carrier bids, and book shipments end-to-end."
        />
      </Card>
    );
  }

  if (shipment) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardBody className="flex flex-col items-center py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={30} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Shipment booked</h2>
          <p className="mt-1 text-sm text-slate-500">
            {shipment.reference} with{" "}
            <span className="font-semibold text-slate-900">{shipment.carrierName}</span> ·{" "}
            {shipment.transitDays} days · {formatCurrency(shipment.price.amount)}
          </p>
          <div className="mt-3"><StatusPill status="booked" /></div>
          <Button className="mt-5" onClick={() => setShipment(null)}>
            Back to marketplace <ArrowRight size={15} />
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {!quote && (
        <Card>
          <CardHeader title="Posted loads" subtitle="Request quotes to receive carrier bids" />
          <CardBody className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8 text-slate-400">
                <Loader2 className="animate-spin" />
              </div>
            ) : loads.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={22} />}
                title="No posted loads"
                description="Post a load first, then request quotes here."
              />
            ) : (
              loads.filter((load) => ["posted", "open_for_bids", "bid_received"].includes(load.status)).map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{l.reference}</p>
                    <p className="text-xs text-slate-500">
                      {l.pickup.city} → {l.delivery.city} · {l.mode} · {l.commodity}
                    </p>
                  </div>
                  <Button size="sm" disabled={busy} onClick={() => requestQuotes(l)}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Request quotes
                  </Button>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}

      {quote && (
        <Card>
          <CardHeader
            title={`Bids for ${quote.reference}`}
            subtitle="Compare rate, transit time and carrier rating"
            action={
              <Button variant="ghost" size="sm" onClick={() => setQuote(null)}>
                Back
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {(quote.bids ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Waiting for bids…</p>
            ) : (
              (quote.bids ?? [])
                .slice()
                .sort((a, b) => a.price.amount - b.price.amount)
                .map((b, i) => (
                  <div
                    key={b.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-sm font-bold text-navy-700">
                        {(b.carrier?.name ?? "??").slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{b.carrier?.name ?? "Carrier"}</p>
                          {i === 0 && <Badge tone="green">Best price</Badge>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {b.transitDays} days
                          </span>
                          {b.equipment && <span>{b.equipment}</span>}
                          {b.truckInfo && <span>{b.truckInfo}</span>}
                          {b.co2Kg != null && (
                            <span className="flex items-center gap-1">
                              <Leaf size={12} /> {b.co2Kg.toLocaleString()} kg CO₂
                            </span>
                          )}
                          {b.carrier && (
                            <span className="flex items-center gap-1">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              {b.carrier.rating} · {b.carrier.reliability}% on-time
                            </span>
                          )}
                        </div>
                        {b.comment && <p className="mt-1.5 text-xs text-slate-500">{b.comment}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <p className="text-xl font-bold text-slate-900">
                        {formatCurrency(b.price.amount)}
                      </p>
                      {b.status === "submitted" ? (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={busy} onClick={() => reject(b.id)}>Reject</Button>
                          <Button size="sm" disabled={busy} onClick={() => accept(b.id)}>
                            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                            Accept <ArrowRight size={14} />
                          </Button>
                        </div>
                      ) : <Badge tone={b.status === "accepted" ? "green" : "slate"}>{b.status}</Badge>}
                    </div>
                  </div>
                ))
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
