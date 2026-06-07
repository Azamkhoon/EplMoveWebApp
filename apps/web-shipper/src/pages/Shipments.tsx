import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  Boxes,
  Download,
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
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Shipment, ShipmentStatus, TransportMode } from "@/types";

type Filter = "all" | ShipmentStatus;
type SortKey = "reference" | "etaDate" | "valueUsd" | "progress";

const TABS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "posted", label: "Posted" },
  { id: "draft", label: "Draft" },
  { id: "in_transit", label: "In Transit" },
  { id: "delivered", label: "Delivered" },
];

const MODES: (TransportMode | "all")[] = ["all", "Ocean", "Air", "FTL", "LTL", "Rail"];

export function Shipments() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<TransportMode | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "etaDate",
    dir: "asc",
  });

  const rows = useMemo(() => {
    let list = SHIPMENTS.filter((s) => {
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
  }, [filter, query, mode, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  const tabItems = TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.id === "all" ? SHIPMENTS.length : STATUS_COUNTS[t.id as ShipmentStatus] ?? 0,
  }));

  return (
    <div className="space-y-5">
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
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="md" onClick={() => navigate("/post-load")}>
            <Plus size={15} />
            New Shipment
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="sm:w-80">
            <Input
              icon={<Search size={16} />}
              placeholder="Search reference, lane, carrier…"
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
                  {m === "all" ? "All modes" : m}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Boxes size={22} />}
            title="No shipments found"
            description="Try adjusting your filters or search terms."
            action={
              <Button variant="outline" size="sm" onClick={() => { setQuery(""); setMode("all"); setFilter("all"); }}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <Th onClick={() => toggleSort("reference")} active={sort.key === "reference"}>
                    Reference
                  </Th>
                  <th className="px-4 py-3 font-medium">Lane</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Carrier</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <Th onClick={() => toggleSort("progress")} active={sort.key === "progress"}>
                    Progress
                  </Th>
                  <Th onClick={() => toggleSort("etaDate")} active={sort.key === "etaDate"}>
                    ETA
                  </Th>
                  <Th onClick={() => toggleSort("valueUsd")} active={sort.key === "valueUsd"} className="text-right">
                    Value
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
    <th className={cn("px-4 py-3 font-medium", className)}>
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
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-900">{s.reference}</p>
        <p className="text-xs text-slate-400">{s.commodity}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="font-medium">{s.origin.code ?? s.origin.city}</span>
          <span className="text-slate-300">→</span>
          <span className="font-medium">{s.destination.code ?? s.destination.city}</span>
        </div>
        <p className="text-xs text-slate-400">
          {s.origin.city} → {s.destination.city}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {s.mode}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">{s.carrier}</td>
      <td className="px-4 py-3">
        <StatusPill status={s.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ProgressBar
            value={s.progress}
            tone={s.status === "delayed" ? "red" : s.status === "delivered" ? "emerald" : "brand"}
            className="w-20"
          />
          <span className="w-8 text-xs text-slate-500">{s.progress}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-600">
        <span className={cn(s.status === "delayed" && "text-red-600 font-medium")}>
          {formatDate(s.etaDate)}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-medium text-slate-900">
        {formatCurrency(s.valueUsd)}
      </td>
    </tr>
  );
}
