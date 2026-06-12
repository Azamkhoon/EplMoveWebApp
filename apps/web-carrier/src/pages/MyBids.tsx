import { useEffect, useMemo, useState } from "react";
import { Gavel, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/Misc";
import { api } from "@/api/client";
import { ApiError, type CarrierBid } from "@epl/sdk";
import { formatCurrency, formatDate } from "@/lib/utils";

type Filter = "all" | "submitted" | "accepted" | "rejected";

const BID_TONE: Record<string, string> = {
  submitted: "bg-amber-50 text-amber-700 ring-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-slate-100 text-slate-500 ring-slate-200",
  withdrawn: "bg-slate-50 text-slate-400 ring-slate-200",
};

export function MyBids() {
  const [bids, setBids] = useState<CarrierBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!api) return;
    api
      .listMyBids()
      .then(setBids)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load bids"))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(
    () => (filter === "all" ? bids : bids.filter((b) => b.status === filter)),
    [bids, filter],
  );

  const tabs = [
    { id: "all", label: "All", count: bids.length },
    { id: "submitted", label: "Pending", count: bids.filter((b) => b.status === "submitted").length },
    { id: "accepted", label: "Won", count: bids.filter((b) => b.status === "accepted").length },
    { id: "rejected", label: "Lost", count: bids.filter((b) => b.status === "rejected").length },
  ];

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}
      <Tabs variant="pill" items={tabs} active={filter} onChange={(id) => setFilter(id as Filter)} />

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" /> Loading bids…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Gavel size={22} />}
            title={filter === "all" ? "No bids yet" : `No ${filter === "submitted" ? "pending" : filter} bids`}
            description="Head to the Marketplace to quote on open loads."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="row-pad-y px-4 font-medium">Load</th>
                  <th className="row-pad-y px-4 font-medium">Mode</th>
                  <th className="row-pad-y px-4 font-medium">Submitted</th>
                  <th className="row-pad-y px-4 font-medium">Transit</th>
                  <th className="row-pad-y px-4 text-right font-medium">Your rate</th>
                  <th className="row-pad-y px-4 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((b) => (
                  <tr key={b.id} className="transition hover:bg-slate-50">
                    <td className="row-pad-y px-4 font-semibold text-slate-900">{b.reference}</td>
                    <td className="row-pad-y px-4">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {b.mode}
                      </span>
                    </td>
                    <td className="row-pad-y px-4 text-slate-500">{formatDate(b.createdAt)}</td>
                    <td className="row-pad-y px-4 text-slate-600">{b.transitDays}d</td>
                    <td className="row-pad-y px-4 text-right font-medium text-slate-900">
                      {formatCurrency(b.price.amount)}
                    </td>
                    <td className="row-pad-y px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                          BID_TONE[b.status] ?? BID_TONE.withdrawn
                        }`}
                      >
                        {b.status === "accepted" ? "won" : b.status === "rejected" ? "lost" : b.status}
                        {b.quoteStatus === "open" && b.status === "submitted" ? " · auction open" : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
