import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  Boxes,
  Download,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, ProgressBar } from "@/components/ui/Misc";
import { SHIPMENTS, STATUS_COUNTS } from "@/data/shipments";
import { api, LIVE } from "@/api/client";
import { toViewShipment } from "@/data/live-adapters";
import { ApiError } from "@epl/sdk";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Shipment, ShipmentStatus, TransportMode } from "@/types";
import { useI18n } from "@/i18n/LanguageContext";

type Filter = "all" | ShipmentStatus;
type SortKey = "reference" | "etaDate" | "valueUsd" | "progress";

const TABS: { id: Filter; labelKey: string }[] = [
  { id: "all", labelKey: "shipments.all" },
  { id: "posted", labelKey: "shipments.posted" },
  { id: "draft", labelKey: "shipments.draft" },
  { id: "in_transit", labelKey: "shipments.inTransit" },
  { id: "delivered", labelKey: "shipments.delivered" },
];

const MODES: (TransportMode | "all")[] = ["all", "Ocean", "Air", "FTL", "LTL", "Rail"];

export function Shipments() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<TransportMode | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "etaDate",
    dir: "asc",
  });
  const [liveShipments, setLiveShipments] = useState<Shipment[] | null>(null);
  const [loading, setLoading] = useState(LIVE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!LIVE || !api) {
      setLoading(false);
      return;
    }
    api
      .listShipments()
      .then((list) => {
        // Preserve empty accounts.
        setLiveShipments(list.map((shipment) => toViewShipment(shipment)));
      })
      .catch(() => { setLiveShipments([]); setError("Shipments could not be loaded. Please try again."); })
      .finally(() => setLoading(false));
  }, [t]);

  const source = liveShipments ?? SHIPMENTS;

  const rows = useMemo(() => {
    let list = source.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (mode !== "all" && s.mode !== mode) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          s.reference.toLowerCase().includes(q) ||
          s.commodity.toLowerCase().includes(q) ||
          s.origin.city.toLowerCase().includes(q) ||
          s.destination.city.toLowerCase().includes(q) ||
          s.carrier.toLowerCase().includes(q)
        );
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return list;
  }, [source, filter, query, mode, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  const tabItems = TABS.map((tab) => ({
    id: tab.id,
    label: t(tab.labelKey),
    count:
      tab.id === "all"
        ? source.length
        : LIVE
          ? source.filter((s) => s.status === tab.id).length
          : STATUS_COUNTS[tab.id as ShipmentStatus] ?? 0,
  }));

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          items={tabItems}
          active={filter}
          onChange={(id) => setFilter(id as Filter)}
          variant="pill"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md">
            <Download size={15} />
            <span className="hidden sm:inline">{t("shipments.export")}</span>
          </Button>
          <Button size="md" onClick={() => navigate("/post-load")}>
            <Plus size={15} />
            {t("topbar.newShipment")}
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="sm:w-80">
            <Input
              icon={<Search size={16} />}
              placeholder={t("shipments.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <SlidersHorizontal size={15} className="text-slate-400" />
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as TransportMode | "all")}
              className="w-40"
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m === "all" ? t("shipments.allModes") : m}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" /> {t("shipments.loading")}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Boxes size={22} />}
            title={LIVE ? t("shipments.noneYet") : t("shipments.noneFound")}
            description={
              LIVE
                ? t("shipments.firstHint")
                : t("shipments.filterHint")
            }
            action={
              <Button variant="outline" size="sm" onClick={() => { setQuery(""); setMode("all"); setFilter("all"); }}>
                {t("shipments.clearFilters")}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <Th onClick={() => toggleSort("reference")} active={sort.key === "reference"}>
                    {t("shipments.reference")}
                  </Th>
                  <th className="row-pad-y px-4 font-medium">{t("shipments.lane")}</th>
                  <th className="row-pad-y px-4 font-medium">{t("shipments.mode")}</th>
                  <th className="row-pad-y px-4 font-medium">{t("shipments.carrier")}</th>
                  <th className="row-pad-y px-4 font-medium">{t("shipments.status")}</th>
                  <Th onClick={() => toggleSort("progress")} active={sort.key === "progress"}>
                    {t("shipments.progress")}
                  </Th>
                  <Th onClick={() => toggleSort("etaDate")} active={sort.key === "etaDate"}>
                    {t("shipments.eta")}
                  </Th>
                  <Th onClick={() => toggleSort("valueUsd")} active={sort.key === "valueUsd"} className="text-right">
                    {t("shipments.value")}
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((s) => (
                  <Row key={s.id} s={s} onClick={() => navigate(`/shipments/${s.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  className?: string;
}) {
  return (
    <th className={cn("row-pad-y px-4 font-medium", className)}>
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition hover:text-slate-700",
          active && "text-brand-600"
        )}
      >
        {children}
        <ArrowUpDown size={12} />
      </button>
    </th>
  );
}

function Row({ s, onClick }: { s: Shipment; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition hover:bg-slate-50"
    >
      <td className="row-pad-y px-4">
        <p className="font-semibold text-slate-900">{s.reference}</p>
        <p className="text-xs text-slate-400">{s.commodity}</p>
      </td>
      <td className="row-pad-y px-4">
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="font-medium">{s.origin.code ?? s.origin.city}</span>
          <span className="text-slate-300">→</span>
          <span className="font-medium">{s.destination.code ?? s.destination.city}</span>
        </div>
        <p className="text-xs text-slate-400">
          {s.origin.city} → {s.destination.city}
        </p>
      </td>
      <td className="row-pad-y px-4">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {s.mode}
        </span>
      </td>
      <td className="row-pad-y px-4 text-slate-600">{s.carrier}</td>
      <td className="row-pad-y px-4">
        <StatusPill status={s.status} />
      </td>
      <td className="row-pad-y px-4">
        <div className="flex items-center gap-2">
          <ProgressBar
            value={s.progress}
            tone={s.status === "delayed" ? "red" : s.status === "delivered" ? "emerald" : "brand"}
            className="w-20"
          />
          <span className="w-8 text-xs text-slate-500">{s.progress}%</span>
        </div>
      </td>
      <td className="row-pad-y px-4 text-slate-600">
        <span className={cn(s.status === "delayed" && "text-red-600 font-medium")}>
          {formatDate(s.etaDate)}
        </span>
      </td>
      <td className="row-pad-y px-4 text-right font-medium text-slate-900">
        {formatCurrency(s.valueUsd)}
      </td>
    </tr>
  );
}
