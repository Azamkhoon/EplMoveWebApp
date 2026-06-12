import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleDollarSign, Gavel, Store, Trophy } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { api } from "@/api/client";
import type { CarrierBid, MarketplaceQuote } from "@epl/sdk";
import { formatCurrency, relativeTime } from "@/lib/utils";

export function Dashboard() {
  const [open, setOpen] = useState<MarketplaceQuote[]>([]);
  const [bids, setBids] = useState<CarrierBid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    Promise.all([api.listOpenQuotes(), api.listMyBids()])
      .then(([q, b]) => {
        setOpen(q);
        setBids(b);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const pending = bids.filter((b) => b.status === "submitted");
  const won = bids.filter((b) => b.status === "accepted");
  const decided = bids.filter((b) => b.status === "accepted" || b.status === "rejected");
  const winRate = decided.length ? Math.round((won.length / decided.length) * 100) : 0;
  const revenue = won.reduce((s, b) => s + b.price.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open loads" value={open.length} icon={<Store size={18} />} accent="brand" hint="in the marketplace now" />
        <StatCard label="Pending bids" value={pending.length} icon={<Gavel size={18} />} accent="amber" hint="awaiting shipper decision" />
        <StatCard label="Loads won" value={won.length} icon={<Trophy size={18} />} accent="emerald" hint={`${winRate}% win rate`} />
        <StatCard
          label="Won revenue"
          value={revenue}
          format={(n) => formatCurrency(n)}
          icon={<CircleDollarSign size={18} />}
          accent="navy"
          hint="sum of accepted bids"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Newest open loads"
            subtitle="Fresh requests from shippers"
            action={
              <Link to="/marketplace">
                <Button variant="outline" size="sm">
                  Marketplace <ArrowRight size={14} />
                </Button>
              </Link>
            }
          />
          {open.length === 0 && !loading ? (
            <EmptyState icon={<Store size={20} />} title="Nothing open right now" description="Check back soon — new loads land here." />
          ) : (
            <div className="divide-y divide-slate-50">
              {open.slice(0, 6).map((q) => (
                <Link key={q.id} to="/marketplace" className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{q.reference}</p>
                    <p className="text-xs text-slate-400">
                      {q.mode} · {q.bidCount} bid{q.bidCount === 1 ? "" : "s"} · {relativeTime(q.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {q.bestPrice != null ? formatCurrency(q.bestPrice) : "no bids"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Latest outcomes"
            subtitle="How your recent bids fared"
            action={
              <Link to="/bids">
                <Button variant="outline" size="sm">
                  My Bids <ArrowRight size={14} />
                </Button>
              </Link>
            }
          />
          {bids.length === 0 && !loading ? (
            <EmptyState icon={<Gavel size={20} />} title="No bids yet" description="Quote your first load from the Marketplace." />
          ) : (
            <div className="divide-y divide-slate-50">
              {bids.slice(0, 6).map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{b.reference}</p>
                    <p className="text-xs text-slate-400">
                      {b.mode} · {b.transitDays}d · {formatCurrency(b.price.amount)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      b.status === "accepted"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : b.status === "rejected"
                          ? "bg-slate-100 text-slate-500 ring-slate-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200"
                    }`}
                  >
                    {b.status === "accepted" ? "won" : b.status === "rejected" ? "lost" : "pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
