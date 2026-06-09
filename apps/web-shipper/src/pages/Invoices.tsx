import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Receipt } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { api, LIVE } from "@/api/client";
import { ApiError, type Invoice } from "@epl/sdk";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  issued: "bg-amber-50 text-amber-700 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  void: "bg-slate-50 text-slate-400 ring-slate-200",
};

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(LIVE);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    if (!LIVE || !api) return;
    api
      .listInvoices()
      .then(setInvoices)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }, []);

  async function pay(id: string) {
    if (!api) return;
    setPaying(id);
    try {
      const updated = await api.payInvoice(id);
      setInvoices((list) => list.map((i) => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Payment failed");
    } finally {
      setPaying(null);
    }
  }

  if (!LIVE) {
    return (
      <Card>
        <EmptyState
          icon={<Receipt size={22} />}
          title="Invoices require the backend"
          description="Set VITE_API_URL and sign in to view freight invoices."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" /> Loading invoices…
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt size={22} />}
            title="No invoices yet"
            description="An invoice is raised automatically when you accept a carrier bid."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="row-pad-y px-4 font-medium">Invoice</th>
                  <th className="row-pad-y px-4 font-medium">Shipment</th>
                  <th className="row-pad-y px-4 font-medium">Carrier</th>
                  <th className="row-pad-y px-4 font-medium">Issued</th>
                  <th className="row-pad-y px-4 font-medium">Status</th>
                  <th className="row-pad-y px-4 text-right font-medium">Amount</th>
                  <th className="row-pad-y px-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="transition hover:bg-slate-50">
                    <td className="row-pad-y px-4 font-semibold text-slate-900">{inv.number}</td>
                    <td className="row-pad-y px-4 text-slate-600">{inv.reference}</td>
                    <td className="row-pad-y px-4 text-slate-600">{inv.carrierName}</td>
                    <td className="row-pad-y px-4 text-slate-600">
                      {inv.issuedAt ? formatDate(inv.issuedAt) : "—"}
                    </td>
                    <td className="row-pad-y px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                          STATUS_TONE[inv.status] ?? STATUS_TONE.draft
                        }`}
                      >
                        {inv.status === "paid" && <CheckCircle2 size={12} />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="row-pad-y px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(inv.amount.amount)}
                    </td>
                    <td className="row-pad-y px-4 text-right">
                      {inv.status === "issued" ? (
                        <Button size="sm" disabled={paying === inv.id} onClick={() => pay(inv.id)}>
                          {paying === inv.id ? <Loader2 size={14} className="animate-spin" /> : "Pay"}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
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
