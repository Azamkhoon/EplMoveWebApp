import { useEffect, useState } from "react";
import { CheckCircle2, CircleDollarSign, Clock, Download, Loader2, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { api } from "@/api/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

type InvStatus = "paid" | "pending" | "overdue" | "draft";

interface LocalInvoice {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: InvStatus;
  dueDate: string;
  issuedAt: string;
  paidAt: string | null;
}

const MOCK: LocalInvoice[] = [
  { id: "inv-001", reference: "INV-2026-0021", amount: 7768,  currency: "USD", status: "paid",    dueDate: "2026-06-20", issuedAt: "2026-06-12T07:57:20Z", paidAt: "2026-06-13T10:00:00Z" },
  { id: "inv-002", reference: "INV-2026-0018", amount: 9240,  currency: "USD", status: "pending", dueDate: "2026-06-25", issuedAt: "2026-06-10T09:12:00Z", paidAt: null                   },
  { id: "inv-003", reference: "INV-2026-0015", amount: 11500, currency: "USD", status: "pending", dueDate: "2026-06-22", issuedAt: "2026-06-08T14:35:00Z", paidAt: null                   },
  { id: "inv-004", reference: "INV-2026-0012", amount: 8200,  currency: "USD", status: "paid",    dueDate: "2026-06-15", issuedAt: "2026-06-03T11:00:00Z", paidAt: "2026-06-10T09:00:00Z" },
  { id: "inv-005", reference: "INV-2026-0009", amount: 14300, currency: "USD", status: "paid",    dueDate: "2026-05-28", issuedAt: "2026-05-18T08:20:00Z", paidAt: "2026-05-24T11:00:00Z" },
  { id: "inv-006", reference: "INV-2026-0007", amount: 6800,  currency: "USD", status: "overdue", dueDate: "2026-06-10", issuedAt: "2026-06-01T10:00:00Z", paidAt: null                   },
];

const STATUS_META: Record<InvStatus, { label: string; tone: "green" | "amber" | "red" | "slate" }> = {
  paid:    { label: "Paid",    tone: "green" },
  pending: { label: "Pending", tone: "amber" },
  overdue: { label: "Overdue", tone: "red"   },
  draft:   { label: "Draft",   tone: "slate" },
};

function toLocal(inv: Record<string, unknown>): LocalInvoice {
  const amount = typeof inv["amount"] === "object" && inv["amount"] !== null
    ? (inv["amount"] as { amount: number }).amount
    : Number(inv["amount"] ?? 0);
  return {
    id:        String(inv["id"] ?? ""),
    reference: String(inv["reference"] ?? ""),
    amount,
    currency:  String(inv["currency"] ?? "USD"),
    status:    (inv["status"] as InvStatus) ?? "pending",
    dueDate:   String(inv["dueAt"] ?? inv["dueDate"] ?? ""),
    issuedAt:  String(inv["issuedAt"] ?? inv["createdAt"] ?? ""),
    paidAt:    (inv["paidAt"] as string | null) ?? null,
  };
}

export function Financials() {
  const { t } = useI18n();
  const [invoices, setInvoices] = useState<LocalInvoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState<string | null>(null);
  const [tab, setTab]           = useState<"all" | "pending" | "paid" | "overdue">("all");

  useEffect(() => {
    if (!api) { setInvoices(MOCK); setLoading(false); return; }
    api.listInvoices()
      .then((inv) => setInvoices(inv.length > 0 ? inv.map((i) => toLocal(i as unknown as Record<string, unknown>)) : MOCK))
      .catch(() => setInvoices(MOCK))
      .finally(() => setLoading(false));
  }, []);

  async function pay(id: string) {
    if (!api) {
      setInvoices((prev) =>
        prev.map((i) => i.id === id ? { ...i, status: "paid" as const, paidAt: new Date().toISOString() } : i),
      );
      return;
    }
    setPaying(id);
    try {
      const updated = await api.payInvoice(id);
      const local = toLocal(updated as unknown as Record<string, unknown>);
      setInvoices((prev) => prev.map((i) => i.id === local.id ? local : i));
    } catch {
      /* ignore */
    } finally {
      setPaying(null);
    }
  }

  const pending  = invoices.filter((i) => i.status === "pending");
  const paid     = invoices.filter((i) => i.status === "paid");
  const overdue  = invoices.filter((i) => i.status === "overdue");
  const shown    = tab === "all" ? invoices : tab === "pending" ? pending : tab === "paid" ? paid : overdue;

  const totalRevenue = paid.reduce((s, i) => s + i.amount, 0);
  const totalPending = pending.reduce((s, i) => s + i.amount, 0);
  const totalOverdue = overdue.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label={t("financials.totalRevenue")} value={totalRevenue} format={formatCurrency} icon={<CircleDollarSign size={18} />} accent="emerald" hint={t("financials.paidInvoices")} />
        <StatCard label={t("status.pending")} value={totalPending} format={formatCurrency} icon={<Clock size={18} />} accent="amber" hint={`${pending.length} ${t("financials.invoices")}`} />
        <StatCard label={t("status.overdue")} value={totalOverdue} format={formatCurrency} icon={<TrendingUp size={18} />} accent="navy" hint={`${overdue.length} ${t("status.overdue")}`} />
        <StatCard label={t("financials.paidInvoices")} value={paid.length} icon={<CheckCircle2 size={18} />} accent="brand" hint={t("financials.paidInvoices")} />
      </div>

      <Card>
        <CardHeader
          title={t("financials.invoices")}
          subtitle={t("page.financials.subtitle")}
          action={<Button variant="outline" size="sm"><Download size={14} /> {t("common.actions")}</Button>}
        />

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-100 px-5">
          {(["all", "pending", "paid", "overdue"] as const).map((tabValue) => (
            <button
              key={tabValue}
              onClick={() => setTab(tabValue)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === tabValue
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tabValue === "all" ? t("common.all") : t(`status.${tabValue}`)}
              {tabValue !== "all" && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  {tabValue === "pending" ? pending.length : tabValue === "paid" ? paid.length : overdue.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">{t("financials.invoices")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("financials.dueDate")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("financials.amount")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {shown.map((inv) => {
                  const meta = STATUS_META[inv.status];
                  const isOverdue = inv.status === "overdue";
                  return (
                    <tr key={inv.id} className={`transition hover:bg-slate-50 ${isOverdue ? "bg-red-50/30" : ""}`}>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{inv.reference}</td>
                      <td className="px-4 py-3.5 text-slate-500">{formatDate(inv.issuedAt)}</td>
                      <td className="px-4 py-3.5">
                        <span className={isOverdue ? "font-medium text-red-600" : "text-slate-500"}>
                          {formatDate(inv.dueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={meta.tone}>{t(`status.${inv.status}`)}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {inv.status !== "paid" ? (
                          <Button
                            size="sm"
                            variant={isOverdue ? "primary" : "outline"}
                            disabled={paying === inv.id}
                            onClick={() => void pay(inv.id)}
                          >
                            {paying === inv.id ? <Loader2 size={13} className="animate-spin" /> : "Pay now"}
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Download size={13} /> Receipt
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
