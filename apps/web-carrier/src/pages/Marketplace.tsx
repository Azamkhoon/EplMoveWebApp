import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Filter, Gavel, Loader2, RefreshCw, Search, Store, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/Misc";
import { api } from "@/api/client";
import { ApiError, type MarketplaceQuote } from "@epl/sdk";
import { formatCurrency, relativeTime } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

const MODES = ["All", "Ocean", "Air", "Road", "Rail", "Multimodal"];

const MODE_TONE: Record<string, "blue" | "slate" | "amber" | "green" | "navy"> = {
  Ocean: "blue",
  Air:   "amber",
  Road:  "green",
  Rail:  "navy",
  Multimodal: "slate",
};

export function Marketplace() {
  const { t } = useI18n();
  const [quotes, setQuotes]   = useState<MarketplaceQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [modeFilter, setMode] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [bidding, setBidding] = useState<MarketplaceQuote | null>(null);
  const [price, setPrice]     = useState("");
  const [days, setDays]       = useState("");
  const [co2, setCo2]         = useState("");
  const [notes, setNotes]     = useState("");
  const [equipment, setEquipment] = useState("");
  const [truckInfo, setTruckInfo] = useState("");
  const [busy, setBusy]       = useState(false);
  const [placed, setPlaced]   = useState(false);
  const [bidErr, setBidErr]   = useState<string | null>(null);

  async function load() {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      setQuotes(await api.listOpenQuotes());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openBid(q: MarketplaceQuote) {
    setBidding(q);
    setPlaced(false);
    setBidErr(null);
    setPrice(q.bestPrice ? String(Math.round(q.bestPrice * 0.97)) : "");
    setDays("");
    setCo2("");
    setNotes("");
    setEquipment(q.equipmentCode ?? "");
    setTruckInfo("");
  }

  async function submit() {
    if (!api || !bidding) return;
    setBusy(true);
    setBidErr(null);
    try {
      await api.submitMarketplaceBid(bidding.id, {
        price: { amount: Number(price), currency: "USD" },
        transitDays: Number(days),
        equipment: equipment || undefined,
        truckInfo: truckInfo || undefined,
        comment: notes || undefined,
        co2Kg: co2 ? Number(co2) : undefined,
      });
      setPlaced(true);
      void load();
    } catch (e) {
      setBidErr(e instanceof ApiError ? e.message : "Bid submission failed");
    } finally {
      setBusy(false);
    }
  }

  const filtered = quotes.filter((q) => {
    const matchMode = modeFilter === "All" || q.mode === modeFilter;
    const needle = search.toLowerCase();
    const matchSearch =
      !search ||
      q.reference.toLowerCase().includes(needle) ||
      q.origin.toLowerCase().includes(needle) ||
      q.destination.toLowerCase().includes(needle) ||
      q.commodity.toLowerCase().includes(needle);
    return matchMode && matchSearch;
  });

  const myBidCount = quotes.reduce((s, q) => s + (q.myBidCount > 0 ? 1 : 0), 0);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("market.search")}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                modeFilter === m
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {m === "All" ? t("common.all") : m}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{filtered.length}</span> loads
            {myBidCount > 0 && <span className="ml-1.5 text-brand-600">· {myBidCount} with your bid</span>}
          </span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw size={14} /> {t("common.loading")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" /> {t("market.loading")}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Store size={22} />}
            title={t("market.noLoads")}
            description={t("market.noLoadsHint")}
            action={
              (search || modeFilter !== "All") ? (
                <Button variant="outline" size="sm" onClick={() => { setSearch(""); setMode("All"); }}>{t("common.all")}</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">{t("common.shipment")}</th>
                  <th className="px-4 py-3 font-medium">{t("shipments.mode")}</th>
                  <th className="px-4 py-3 font-medium">Posted</th>
                  <th className="px-4 py-3 font-medium">{t("nav.bids")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("market.price")}</th>
                  <th className="px-4 py-3 font-medium">{t("nav.bids")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((q) => (
                  <tr key={q.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{q.reference}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{q.origin} → {q.destination}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {q.commodity} · {q.weightKg.toLocaleString()} kg
                        {q.equipmentCode ? ` · ${q.equipmentCode}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={MODE_TONE[q.mode] ?? "slate"}>{q.mode}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{relativeTime(q.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Gavel size={13} className="text-slate-300" />
                        {q.bidCount}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                      {q.bestPrice != null ? formatCurrency(q.bestPrice) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {q.myBidCount > 0
                        ? <Badge tone="blue"><CheckCircle2 size={11} /> In</Badge>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant={q.myBidCount > 0 ? "outline" : "primary"}
                        onClick={() => openBid(q)}
                      >
                        {q.myBidCount > 0 ? t("market.quote") : t("market.submit")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Bid modal */}
      <Modal
        open={!!bidding}
        onClose={() => setBidding(null)}
        title={placed ? t("market.bidSubmitted") : `${t("market.quote")} · ${bidding?.reference ?? ""}`}
        subtitle={placed ? undefined : `${bidding?.mode} · ${bidding?.bidCount ?? 0} competing bid(s)`}
        size="md"
        footer={
          placed ? (
            <Button onClick={() => setBidding(null)}>{t("common.confirm")}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setBidding(null)}>{t("common.cancel")}</Button>
              <Button disabled={busy || !price || !days} onClick={() => void submit()}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : t("market.submit")}
              </Button>
            </>
          )
        }
      >
        {placed ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={30} />
            </span>
            <p className="mt-4 text-sm text-slate-600">
              Your bid of <span className="font-semibold text-slate-900">{formatCurrency(Number(price))}</span> for{" "}
              <span className="font-semibold">{bidding?.reference}</span> is live.
              Track it under <span className="font-semibold">My Bids</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bidding && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                <p className="font-semibold text-slate-800">{bidding.origin} → {bidding.destination}</p>
                <p className="mt-1">{bidding.commodity} · {bidding.weightKg.toLocaleString()} kg</p>
                <p className="mt-1">
                  Pickup {bidding.readyDate ? new Date(bidding.readyDate).toLocaleDateString() : "TBD"}
                  {bidding.requiredDeliveryDate ? ` · Delivery ${new Date(bidding.requiredDeliveryDate).toLocaleDateString()}` : ""}
                </p>
              </div>
            )}
            {bidding?.bestPrice != null && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-200">
                <Clock size={13} className="shrink-0" />
                Current best: <span className="font-semibold">{formatCurrency(bidding.bestPrice)}</span> — undercut to lead the board.
              </div>
            )}
            {bidErr && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{bidErr}</div>
            )}
            <Field label={t("market.price")}>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8200" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("market.transit")}>
                <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="28" />
              </Field>
              <Field label="CO₂ kg (optional)">
                <Input type="number" value={co2} onChange={(e) => setCo2(e.target.value)} placeholder="3400" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Equipment / trailer">
                <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Standard Tent" />
              </Field>
              <Field label="Truck information">
                <Input value={truckInfo} onChange={(e) => setTruckInfo(e.target.value)} placeholder="Plate / unit" />
              </Field>
            </div>
            <Field label={t("market.notes")} hint={t("market.notes")}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Includes customs brokerage, door-to-door service"
                className="input-base resize-none"
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
