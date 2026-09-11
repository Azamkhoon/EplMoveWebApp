import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  ListChecks,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  RefreshCw,
  Ship,
  Upload,
  UserPlus,
} from "lucide-react";
import {
  ApiError,
  type DocumentRequest,
  type Shipment as DomainShipment,
  type ShipmentDocument as DomainDocument,
} from "@epl/sdk";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/Misc";
import { StatusTimeline } from "@/components/shipment/StatusTimeline";
import { ShipmentTracking } from "@/components/shipment/ShipmentTracking";
import { ChatPanel } from "@/components/shipment/ChatPanel";
import { getShipment } from "@/data/shipments";
import { api, LIVE } from "@/api/client";
import { toViewShipment } from "@/data/live-adapters";
import { cn, formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import type { Shipment } from "@/types";
import { NotFound } from "./NotFound";

type Tab = "overview" | "docs" | "status" | "tracking" | "chat";
type BrokerCompany = { id: string; name: string; slug: string; kind: string; country?: string; city?: string };

export function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [liveShipment, setLiveShipment] = useState<Shipment | null>(null);
  const [domainShipment, setDomainShipment] = useState<DomainShipment | null>(null);
  const [documents, setDocuments] = useState<DomainDocument[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [brokers, setBrokers] = useState<BrokerCompany[]>([]);
  const [brokerId, setBrokerId] = useState("");
  const [showBroker, setShowBroker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(LIVE);
  const [notFound, setNotFound] = useState(false);

  const loadShipment = useCallback(async (withSpinner = false) => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const mock = getShipment(id);
    if (!LIVE || !api) {
      setNotFound(!mock);
      setLoading(false);
      return;
    }

    if (withSpinner) setLoading(true);
    setNotFound(false);
    setError(null);
    try {
      const shipment = await api.getShipment(id);
      const [load, docs, documentRequests, brokerCompanies] = await Promise.all([
        api.getLoad(shipment.loadId).catch(() => undefined),
        api.listDocuments({ shipmentId: id }).catch(() => []),
        api.listDocumentRequests(id).catch(() => []),
        api.listCompanies("broker").catch(() => []),
      ]);
      const view = toViewShipment(shipment, load);
      view.documents = docs.map((document) => ({
        id: document.id,
        name: document.name,
        type: document.type as Shipment["documents"][number]["type"],
        status: document.status === "verified" ? "verified" : "pending",
        uploadedAt: document.uploadedAt,
        uploadedBy: "EPL Move user",
        sizeKb: Math.max(1, Math.round(document.sizeBytes / 1024)),
      }));
      setDomainShipment(shipment);
      setLiveShipment(view);
      setDocuments(docs);
      setRequests(documentRequests);
      setBrokers(brokerCompanies);
      setBrokerId(shipment.brokerTenantId ?? brokerCompanies[0]?.id ?? "");
    } catch (reason) {
      // Backend unavailable or shipment missing — fall back to demo data when possible.
      if (mock) {
        setLiveShipment(null);
        setDomainShipment(null);
        setDocuments([]);
        setRequests([]);
        setNotFound(false);
        setError(
          reason instanceof ApiError
            ? `${reason.message} — showing demo shipment data.`
            : "Backend unavailable — showing demo shipment data.",
        );
      } else {
        setNotFound(true);
        setError(reason instanceof ApiError ? reason.message : "Shipment could not be loaded");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadShipment(true);
  }, [loadShipment]);

  async function assignBroker() {
    if (!api || !domainShipment || !brokerId) return;
    const broker = brokers.find((company) => company.id === brokerId);
    if (!broker) return;
    setBusy(true);
    setError(null);
    try {
      await api.assignBroker(domainShipment.id, { brokerTenantId: broker.id, brokerName: broker.name });
      setShowBroker(false);
      setFeedback(`${broker.name} can now access this shipment.`);
      await loadShipment();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Broker assignment failed");
    } finally {
      setBusy(false);
    }
  }

  const shipment = liveShipment ?? (id ? getShipment(id) : undefined);
  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading shipment…</div>;
  }
  if (notFound || !shipment) return <NotFound />;

  const tabs = [
    { id: "overview", label: "Overview", icon: <Package size={15} /> },
    { id: "docs", label: "Documents", icon: <FileText size={15} />, count: documents.length + requests.length || undefined },
    { id: "status", label: "Activity", icon: <ListChecks size={15} /> },
    { id: "tracking", label: "Tracking", icon: <Navigation size={15} /> },
    { id: "chat", label: "Messages", icon: <MessageSquare size={15} /> },
  ];

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}
      {feedback && <div className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">{feedback}</div>}
      <div>
        <button onClick={() => navigate("/shipments")} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800">
          <ArrowLeft size={15} /> Back to shipments
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-white"><Ship size={22} /></span>
            <div>
              <div className="flex items-center gap-3"><h1 className="text-xl font-bold text-slate-900">{shipment.reference}</h1><StatusPill status={shipment.status} /></div>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={14} />{shipment.origin.city} → {shipment.destination.city} · {shipment.mode} · {shipment.commodity}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {domainShipment && (
              <Button variant="outline" size="md" onClick={() => setShowBroker(true)}>
                <UserPlus size={15} /> {domainShipment.brokerName ? "Reassign broker" : "Assign broker"}
              </Button>
            )}
            <Button size="md" onClick={() => setTab("chat")}><MessageSquare size={15} /> Message participants</Button>
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Carrier" value={shipment.carrier} />
          <Stat label="Broker" value={domainShipment?.brokerName ?? "Not assigned"} />
          <Stat label="Pickup" value={formatDate(shipment.pickupDate)} icon={<CalendarDays size={13} />} />
          <Stat label="ETA" value={formatDate(shipment.etaDate)} icon={<CalendarDays size={13} />} highlight={shipment.status === "delayed"} />
          <Stat label="Weight" value={`${formatNumber(shipment.weightKg)} kg`} />
          <Stat label="Cargo value" value={formatCurrency(shipment.valueUsd)} />
          <div className="col-span-2 sm:col-span-4 lg:col-span-6">
            <div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-slate-600">Shipment progress</span><span className="font-semibold text-slate-900">{shipment.progress}%</span></div>
            <ProgressBar value={shipment.progress} tone={shipment.status === "delayed" ? "red" : ["delivered", "completed"].includes(shipment.status) ? "emerald" : "brand"} className="h-2" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <div className="px-4"><Tabs items={tabs} active={tab} onChange={(next) => setTab(next as Tab)} /></div>
        <CardBody>
          {tab === "overview" && <Overview shipment={shipment} domainShipment={domainShipment} onTab={setTab} requestCount={requests.length} />}
          {tab === "docs" && domainShipment && (
            <DocumentWorkspace
              shipment={domainShipment}
              documents={documents}
              requests={requests}
              onChanged={() => loadShipment()}
            />
          )}
          {tab === "status" && <StatusTimeline events={shipment.events} />}
          {tab === "tracking" && <ShipmentTracking shipment={shipment} />}
          {tab === "chat" && <ChatPanel initial={shipment.messages} carrier={shipment.carrier} shipmentId={domainShipment?.id} />}
        </CardBody>
      </Card>

      <Modal open={showBroker} onClose={() => setShowBroker(false)} title="Assign customs broker" subtitle="The selected broker company will immediately gain access to this shipment.">
        <div className="space-y-4">
          <Field label="Broker company">
            <Select value={brokerId} onChange={(event) => setBrokerId(event.target.value)}>
              <option value="">Select a broker</option>
              {brokers.map((broker) => <option key={broker.id} value={broker.id}>{broker.name}{broker.city ? ` — ${broker.city}` : ""}</option>)}
            </Select>
          </Field>
          {brokers.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">No registered Broker company is available yet. Create one from the Broker portal first.</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowBroker(false)}>Cancel</Button><Button disabled={!brokerId || busy} onClick={() => void assignBroker()}>{busy && <Loader2 size={14} className="animate-spin" />} Assign broker</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function Overview({ shipment, domainShipment, onTab, requestCount }: { shipment: Shipment; domainShipment: DomainShipment | null; onTab: (tab: Tab) => void; requestCount: number }) {
  const verifiedDocs = shipment.documents.filter((document) => document.status === "verified").length;
  const lastEvent = [...shipment.events].reverse().find((event) => event.completed);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2"><div><h3 className="mb-3 text-sm font-semibold text-slate-900">Route</h3><ShipmentTracking shipment={shipment} /></div></div>
      <div className="space-y-4">
        <Card className="shadow-none"><CardHeader title="Shipment details" /><CardBody className="space-y-3 text-sm">
          <DetailRow label="Reference" value={shipment.reference} /><DetailRow label="Mode" value={shipment.mode} /><DetailRow label="Commodity" value={shipment.commodity} /><DetailRow label="Pieces" value={String(shipment.pieces)} /><DetailRow label="Weight" value={`${formatNumber(shipment.weightKg)} kg`} /><DetailRow label="Volume" value={`${shipment.volumeM3} m³`} /><DetailRow label="Broker" value={domainShipment?.brokerName ?? "Not assigned"} /><DetailRow label="Created" value={formatDate(shipment.createdAt)} />
        </CardBody></Card>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onTab("docs")} className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40"><FileText size={16} className="text-brand-600" /><p className="mt-2 text-sm font-semibold text-slate-900">{requestCount} request{requestCount === 1 ? "" : "s"}</p><p className="text-xs text-slate-500">{verifiedDocs} verified files</p></button>
          <button onClick={() => onTab("status")} className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40"><ListChecks size={16} className="text-emerald-600" /><p className="mt-2 truncate text-sm font-semibold text-slate-900">{lastEvent?.status ?? "Pending"}</p><p className="text-xs text-slate-500">Latest activity</p></button>
        </div>
      </div>
    </div>
  );
}

function DocumentWorkspace({ shipment, documents, requests, onChanged }: { shipment: DomainShipment; documents: DomainDocument[]; requests: DocumentRequest[]; onChanged: () => Promise<void> | void }) {
  const genericFile = useRef<HTMLInputElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function upload(request: DocumentRequest | null, file: File) {
    if (!api) return;
    setBusyId(request?.id ?? "generic"); setError(null); setSuccess(null);
    try {
      await api.uploadDocument({
        shipmentId: shipment.id,
        documentRequestId: request?.id,
        type: request?.documentType ?? "Other",
        name: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentBase64: await fileBase64(file),
      });
      setSuccess(request ? `${request.documentType} uploaded for broker review.` : "Document added to the shipment.");
      await onChanged();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Document upload failed");
    } finally {
      setBusyId(null);
    }
  }

  async function download(document: DomainDocument) {
    if (!api) return;
    try {
      const blob = await api.downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url; anchor.download = document.name; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Download failed");
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">{success}</div>}
      <section>
        <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Document requests</h3><p className="text-xs text-slate-500">Requests sent by the assigned Customs Broker.</p></div></div>
        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">No document requests for this shipment.</div>
        ) : (
          <div className="space-y-2">
            {requests.map((request) => {
              const canUpload = ["REQUESTED", "VIEWED", "REVISION_REQUIRED"].includes(request.status);
              return (
                <div key={request.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><FileText size={16} /></span>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{request.title}</p><RequestStatus status={request.status} />{request.required && <span className="text-xs font-medium text-red-600">Required</span>}</div><p className="mt-1 text-xs text-slate-500">{request.documentType} · Requested by {request.brokerName} · {formatDateTime(request.createdAt)}</p>{request.comment && <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">{request.comment}</p>}{request.dueDate && <p className="mt-1 text-xs text-amber-600">Deadline: {formatDateTime(request.dueDate)}</p>}</div>
                    {canUpload && (
                      <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700">
                        {busyId === request.id ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload requested file
                        <input type="file" className="hidden" disabled={Boolean(busyId)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(request, file); event.currentTarget.value = ""; }} />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Shipment files</h3><p className="text-xs text-slate-500">Shared with authorized shipment participants.</p></div><Button size="sm" variant="outline" onClick={() => genericFile.current?.click()} disabled={Boolean(busyId)}>{busyId === "generic" ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload document</Button><input ref={genericFile} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(null, file); event.currentTarget.value = ""; }} /></div>
        {documents.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">No files uploaded yet.</p> : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
            {documents.map((document) => <div key={document.id} className="flex items-center gap-3 px-4 py-3"><FileText size={16} className="text-slate-400" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900">{document.name}</p><p className="text-xs text-slate-400">{document.type} · {Math.max(1, Math.round(document.sizeBytes / 1024))} KB · {formatDateTime(document.uploadedAt)}</p></div><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", document.status === "verified" ? "bg-emerald-100 text-emerald-700" : document.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{document.status}</span><button onClick={() => void download(document)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Download size={15} /></button></div>)}
          </div>
        )}
      </section>
    </div>
  );
}

function RequestStatus({ status }: { status: DocumentRequest["status"] }) {
  const approved = status === "APPROVED";
  const revision = status === "REJECTED" || status === "REVISION_REQUIRED";
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", approved ? "bg-emerald-100 text-emerald-700" : revision ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{approved ? <CheckCircle2 size={11} /> : revision ? <RefreshCw size={11} /> : null}{status.replace(/_/g, " ")}</span>;
}

function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
}

function Stat({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return <div><p className="flex items-center gap-1 text-xs text-slate-400">{icon}{label}</p><p className={`mt-0.5 truncate text-sm font-semibold ${highlight ? "text-red-600" : "text-slate-900"}`}>{value}</p></div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{label}</span><span className="truncate font-medium text-slate-900">{value}</span></div>;
}
