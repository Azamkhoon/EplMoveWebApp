import { useState } from "react";
import { DollarSign, FileText, Clock, CheckCircle2, AlertTriangle, type LucideIcon } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { DECLARATIONS, CLIENTS } from "@/data/mock";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/LanguageContext";

type InvStatus = "draft" | "sent" | "paid" | "overdue";

interface Invoice {
  id:          string;
  number:      string;
  clientId:    string;
  clientName:  string;
  declarationRef: string;
  issuedAt:    string;
  dueDate:     string;
  amount:      number;
  duties:      number;
  brokerage:   number;
  currency:    string;
  status:      InvStatus;
}

const INV_STATUS_CLS: Record<InvStatus, string> = {
  draft:   "bg-slate-100 text-slate-600",
  sent:    "bg-blue-100 text-blue-700",
  paid:    "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
};

const MOCK_INVOICES: Invoice[] = [];

const TABS = [
  { key: "all",     label: "All"     },
  { key: "draft",   label: "Draft"   },
  { key: "sent",    label: "Sent"    },
  { key: "paid",    label: "Paid"    },
  { key: "overdue", label: "Overdue" },
];

export function Financials() {
  return (
    <section role="status" className="rounded-xl border border-slate-200 bg-white p-8">
      <h1 className="text-lg font-semibold">Financials</h1>
      <p className="mt-2 text-slate-600">This feature is not yet connected to live records. Data entry is unavailable until activation is complete.</p>
    </section>
  );
}

export function FinancialsView() {
  const { t } = useI18n();
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [tab, setTab]           = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]         = useState<Partial<Invoice>>({ currency: "USD", status: "draft" });

  const visible = invoices.filter((i) => tab === "all" || i.status === tab);

  const totalPaid    = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const totalBrokerage = invoices.reduce((s, i) => s + i.brokerage, 0);

  function patch(f: Partial<Invoice>) { setForm((p) => ({ ...p, ...f })); }

  function createInvoice() {
    const dec = DECLARATIONS.find((d) => d.id === form.declarationRef);
    const client = CLIENTS.find((c) => c.id === form.clientId);
    const brokerage = 1500;
    const duties = dec ? dec.dutyAmount + dec.vatAmount : 0;
    const inv: Invoice = {
      id:             `i-${Date.now()}`,
      number:         `INV-2026-${String(invoices.length + 42).padStart(3,"0")}`,
      clientId:       form.clientId ?? "",
      clientName:     client?.name ?? "",
      declarationRef: dec?.reference ?? form.declarationRef ?? "—",
      issuedAt:       new Date().toISOString().slice(0,10),
      dueDate:        form.dueDate ?? "",
      amount:         duties + brokerage,
      duties,
      brokerage,
      currency:       form.currency ?? "USD",
      status:         "draft",
    };
    setInvoices((p) => [inv, ...p]);
    setShowCreate(false);
    setForm({ currency: "USD", status: "draft" });
  }

  function markPaid(id: string) {
    setInvoices((p) => p.map((i) => i.id === id ? { ...i, status: "paid" as const } : i));
  }

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={CheckCircle2} cls="text-emerald-600 bg-emerald-50" label={t("status.paid")} value={formatCurrency(totalPaid, "USD")} />
        <KpiCard icon={Clock} cls="text-blue-600 bg-blue-50" label={t("financials.outstanding")} value={formatCurrency(totalPending, "USD")} />
        <KpiCard icon={AlertTriangle} cls="text-red-600 bg-red-50" label={t("status.overdue")} value={formatCurrency(totalOverdue, "USD")} urgent={totalOverdue > 0} />
        <KpiCard icon={DollarSign} cls="text-teal-600 bg-teal-50" label={t("financials.totalFees")} value={formatCurrency(totalBrokerage, "USD")} />
      </div>

      {/* Invoice table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex gap-1">
            {TABS.map((tabItem) => (
              <button key={tabItem.key} onClick={() => setTab(tabItem.key)}
                className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  tab === tabItem.key ? "bg-teal-600 text-white" : "text-slate-500 hover:bg-slate-100")}>
                {tabItem.key === "all" ? t("common.all") : t(`status.${tabItem.key === "sent" ? "pending" : tabItem.key}`)}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
            <FileText size={13} />
            {t("financials.invoice")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {[t("financials.invoice"),t("common.client"),t("nav.declarations"),t("documents.uploaded"),t("financials.due"),t("duty.importDuty"),t("financials.totalFees"),t("common.total"),t("common.status"),""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{inv.number}</td>
                  <td className="px-5 py-3 text-xs text-slate-700">{inv.clientName}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{inv.declarationRef}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{formatDate(inv.issuedAt)}</td>
                  <td className={cn("px-5 py-3 text-xs font-medium", inv.status === "overdue" ? "text-red-600" : "text-slate-500")}>
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-700">{formatCurrency(inv.duties, inv.currency)}</td>
                  <td className="px-5 py-3 text-xs text-slate-700">{formatCurrency(inv.brokerage, inv.currency)}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900">{formatCurrency(inv.amount, inv.currency)}</td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize", INV_STATUS_CLS[inv.status])}>
                      {t(`status.${inv.status === "sent" ? "pending" : inv.status}`)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {inv.status !== "paid" && (
                      <button onClick={() => markPaid(inv.id)}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                        {t("status.paid")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={10} className="py-12 text-center text-sm text-slate-400">{t("financials.invoices")}: 0</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
          {visible.length} {t("financials.invoices").toLocaleLowerCase()}
        </div>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("financials.invoice")}>
        <div className="space-y-4">
          <Field label={t("common.client")}>
            <select value={form.clientId ?? ""} onChange={(e) => patch({ clientId: e.target.value })} className="input-base">
              <option value="">Select client…</option>
              {CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={t("nav.declarations")}>
            <select value={form.declarationRef ?? ""} onChange={(e) => patch({ declarationRef: e.target.value })} className="input-base">
              <option value="">Select declaration…</option>
              {DECLARATIONS.map((d) => <option key={d.id} value={d.id}>{d.reference} — {d.clientName}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("duty.currency")}>
              <select value={form.currency ?? "USD"} onChange={(e) => patch({ currency: e.target.value })} className="input-base">
                <option>USD</option><option>EUR</option><option>GBP</option>
              </select>
            </Field>
            <Field label={t("financials.due")}>
              <Input type="date" value={form.dueDate ?? ""} onChange={(e) => patch({ dueDate: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
            <Button onClick={createInvoice} disabled={!form.clientId}>{t("financials.invoice")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function KpiCard({ icon: Icon, cls, label, value, urgent }: {
  icon: LucideIcon; cls: string; label: string; value: string; urgent?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-white p-5", urgent ? "border-red-200" : "border-slate-200")}>
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", cls)}>
        <Icon size={20} />
      </div>
      <p className={cn("text-xl font-bold", urgent ? "text-red-600" : "text-slate-900")}>{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}
