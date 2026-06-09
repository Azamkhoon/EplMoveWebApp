import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  ListChecks,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Ship,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Misc";
import { StatusTimeline } from "@/components/shipment/StatusTimeline";
import { ShipmentDocs } from "@/components/shipment/ShipmentDocs";
import { ShipmentTracking } from "@/components/shipment/ShipmentTracking";
import { ChatPanel } from "@/components/shipment/ChatPanel";
import { getShipment } from "@/data/shipments";
import { api, LIVE } from "@/api/client";
import { toViewShipment } from "@/data/live-adapters";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Shipment } from "@/types";
import { NotFound } from "./NotFound";

type Tab = "overview" | "docs" | "status" | "tracking" | "chat";

export function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [liveShipment, setLiveShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(LIVE);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!LIVE || !api || !id) return;
    let active = true;
    (async () => {
      try {
        const s = await api.getShipment(id);
        const view = toViewShipment(s);
        // Pull the shipment's documents from doc-svc and merge them in.
        try {
          const docs = await api.listDocuments({ shipmentId: id });
          view.documents = docs.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type as Shipment["documents"][number]["type"],
            status: (d.status === "verified" ? "verified" : "pending") as Shipment["documents"][number]["status"],
            uploadedAt: d.uploadedAt ?? view.createdAt,
            uploadedBy: "—",
            sizeKb: Math.max(1, Math.round((d.sizeBytes ?? 0) / 1024)),
          })) as Shipment["documents"];
        } catch {
          /* docs are optional for the detail view */
        }
        if (active) setLiveShipment(view);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const shipment = LIVE ? liveShipment : id ? getShipment(id) : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" /> Loading shipment…
      </div>
    );
  }
  if (notFound || !shipment) return <NotFound />;

  const tabs = [
    { id: "overview", label: "Overview", icon: <Package size={15} /> },
    { id: "docs", label: "Docs", icon: <FileText size={15} />, count: shipment.documents.length },
    { id: "status", label: "Status", icon: <ListChecks size={15} /> },
    { id: "tracking", label: "Tracking", icon: <Navigation size={15} /> },
    { id: "chat", label: "Chat", icon: <MessageSquare size={15} />, count: shipment.messages.filter((m) => m.role !== "system").length || undefined },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/shipments")}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          <ArrowLeft size={15} />
          Back to shipments
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-white">
              <Ship size={22} />
            </span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{shipment.reference}</h1>
                <StatusPill status={shipment.status} />
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin size={14} />
                {shipment.origin.city} → {shipment.destination.city} · {shipment.mode} ·{" "}
                {shipment.commodity}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/tracking">
              <Button variant="outline" size="md">
                <Navigation size={15} />
                Live track
              </Button>
            </Link>
            <Button size="md" onClick={() => setTab("chat")}>
              <MessageSquare size={15} />
              Message carrier
            </Button>
          </div>
        </div>
      </div>

      {/* Progress strip */}
      <Card>
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Carrier" value={shipment.carrier} />
          <Stat label="Pickup" value={formatDate(shipment.pickupDate)} icon={<CalendarDays size={13} />} />
          <Stat label="ETA" value={formatDate(shipment.etaDate)} icon={<CalendarDays size={13} />} highlight={shipment.status === "delayed"} />
          <Stat label="Weight" value={`${formatNumber(shipment.weightKg)} kg`} />
          <Stat label="Volume" value={`${shipment.volumeM3} m³`} />
          <Stat label="Cargo value" value={formatCurrency(shipment.valueUsd)} />
          <div className="col-span-2 sm:col-span-4 lg:col-span-6">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Shipment progress</span>
              <span className="font-semibold text-slate-900">{shipment.progress}%</span>
            </div>
            <ProgressBar
              value={shipment.progress}
              tone={shipment.status === "delayed" ? "red" : shipment.status === "delivered" ? "emerald" : "brand"}
              className="h-2"
            />
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Card>
        <div className="px-4">
          <Tabs items={tabs} active={tab} onChange={(t) => setTab(t as Tab)} />
        </div>
        <CardBody>
          {tab === "overview" && <Overview shipment={shipment} onTab={setTab} />}
          {tab === "docs" && <ShipmentDocs documents={shipment.documents} />}
          {tab === "status" && <StatusTimeline events={shipment.events} />}
          {tab === "tracking" && <ShipmentTracking shipment={shipment} />}
          {tab === "chat" && (
            <ChatPanel initial={shipment.messages} carrier={shipment.carrier} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Overview({
  shipment,
  onTab,
}: {
  shipment: Shipment;
  onTab: (t: Tab) => void;
}) {
  const verifiedDocs = shipment.documents.filter((d) => d.status === "verified").length;
  const lastEvent = [...shipment.events].reverse().find((e) => e.completed);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Route</h3>
          <ShipmentTracking shipment={shipment} />
        </div>
      </div>

      <div className="space-y-4">
        <Card className="shadow-none">
          <CardHeader title="Shipment details" />
          <CardBody className="space-y-3 text-sm">
            <DetailRow label="Reference" value={shipment.reference} />
            <DetailRow label="Mode" value={shipment.mode} />
            <DetailRow label="Commodity" value={shipment.commodity} />
            <DetailRow label="Pieces" value={String(shipment.pieces)} />
            <DetailRow label="Weight" value={`${formatNumber(shipment.weightKg)} kg`} />
            <DetailRow label="Volume" value={`${shipment.volumeM3} m³`} />
            <DetailRow label="Created" value={formatDate(shipment.createdAt)} />
          </CardBody>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onTab("docs")}
            className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <FileText size={16} className="text-brand-600" />
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {verifiedDocs}/{shipment.documents.length}
            </p>
            <p className="text-xs text-slate-500">Docs verified</p>
          </button>
          <button
            onClick={() => onTab("status")}
            className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <ListChecks size={16} className="text-emerald-600" />
            <p className="mt-2 truncate text-sm font-semibold text-slate-900">
              {lastEvent?.status ?? "Pending"}
            </p>
            <p className="text-xs text-slate-500">Latest status</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-slate-400">
        {icon}
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-sm font-semibold ${
          highlight ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-medium text-slate-900">{value}</span>
    </div>
  );
}
