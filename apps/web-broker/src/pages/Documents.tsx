import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Download,
  FileQuestion,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import {
  ApiError,
  type DocumentRequest,
  type DocumentType,
  type Shipment,
  type ShipmentDocument,
} from "@epl/sdk";
import { api } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { cn, formatDateTime } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

const DOCUMENT_TYPES: DocumentType[] = [
  "Commercial Invoice",
  "Packing List",
  "Sales Contract",
  "Certificate of Origin",
  "Export Declaration",
  "Import Declaration",
  "CMR",
  "AWB",
  "Bill of Lading",
  "Railway Bill",
  "Phytosanitary Certificate",
  "Veterinary Certificate",
  "Certificate of Conformity",
  "MSDS",
  "Product Specification",
  "HS Code confirmation",
  "Insurance Certificate",
  "Authorization Letter",
  "Other",
];

const STATUS_CLASS: Record<DocumentRequest["status"], string> = {
  REQUESTED: "bg-blue-100 text-blue-700",
  VIEWED: "bg-sky-100 text-sky-700",
  UPLOADED: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-violet-100 text-violet-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  REVISION_REQUIRED: "bg-orange-100 text-orange-700",
};

type FilterValue = "all" | "open" | "approved";

function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function Documents() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const requestedShipmentId = searchParams.get("shipmentId") ?? "";
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [documents, setDocuments] = useState<ShipmentDocument[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState(Boolean(requestedShipmentId));
  const [showUpload, setShowUpload] = useState(false);
  const [reviewing, setReviewing] = useState<DocumentRequest | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [requestForm, setRequestForm] = useState({
    shipmentId: requestedShipmentId,
    documentType: "Commercial Invoice" as DocumentType,
    title: "Commercial Invoice",
    description: "",
    required: true,
    dueDate: "",
    comment: "",
  });
  const [uploadForm, setUploadForm] = useState({
    shipmentId: requestedShipmentId,
    type: "Commercial Invoice" as DocumentType,
  });
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const [nextShipments, nextRequests, nextDocuments] = await Promise.all([
        api.listShipments(),
        api.listDocumentRequests(),
        api.listDocuments(),
      ]);
      setShipments(nextShipments);
      setRequests(nextRequests);
      setDocuments(nextDocuments);
      const fallback = requestedShipmentId || nextShipments[0]?.id || "";
      setRequestForm((current) => ({ ...current, shipmentId: current.shipmentId || fallback }));
      setUploadForm((current) => ({ ...current, shipmentId: current.shipmentId || fallback }));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Failed to load customs documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleRequests = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (filter === "approved" && request.status !== "APPROVED") return false;
      if (filter === "open" && ["APPROVED", "REJECTED"].includes(request.status)) return false;
      return !needle || [
        request.title,
        request.documentType,
        request.shipmentReference,
        request.status,
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [requests, search, filter]);

  const openCount = requests.filter((request) => !["APPROVED", "REJECTED"].includes(request.status)).length;
  const approvedCount = requests.filter((request) => request.status === "APPROVED").length;

  async function createRequest() {
    if (!api || !requestForm.shipmentId || !requestForm.title.trim()) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await api.createDocumentRequest({
        shipmentId: requestForm.shipmentId,
        documentType: requestForm.documentType,
        title: requestForm.title.trim(),
        description: requestForm.description.trim() || undefined,
        required: requestForm.required,
        dueDate: requestForm.dueDate ? new Date(requestForm.dueDate).toISOString() : undefined,
        comment: requestForm.comment.trim() || undefined,
      });
      setShowRequest(false);
      setSuccess("Document request sent to the shipper.");
      setRequestForm((current) => ({ ...current, description: "", comment: "", dueDate: "" }));
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Document request failed");
    } finally {
      setBusy(false);
    }
  }

  async function review(status: "APPROVED" | "REJECTED" | "REVISION_REQUIRED") {
    if (!api || !reviewing) return;
    setBusy(true);
    setError(null);
    try {
      await api.reviewDocumentRequest(reviewing.id, {
        status,
        comment: reviewComment.trim() || undefined,
      });
      setReviewing(null);
      setReviewComment("");
      setSuccess(status === "APPROVED" ? "Document approved." : "Review sent to the shipper.");
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Document review failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadSharedDocument() {
    if (!api || !pickedFile || !uploadForm.shipmentId) return;
    setBusy(true);
    setError(null);
    try {
      await api.uploadDocument({
        shipmentId: uploadForm.shipmentId,
        type: uploadForm.type,
        name: pickedFile.name,
        contentType: pickedFile.type || "application/octet-stream",
        sizeBytes: pickedFile.size,
        contentBase64: await fileBase64(pickedFile),
      });
      setPickedFile(null);
      setShowUpload(false);
      setSuccess("Document uploaded to the shared shipment file.");
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string, name: string) {
    if (!api) return;
    setError(null);
    try {
      const blob = await api.downloadDocument(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Download failed");
    }
  }

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">{success}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <Pill icon={Clock} cls="border-amber-200 bg-amber-50 text-amber-600" count={openCount} label="Open requests" />
        <Pill icon={CheckCircle2} cls="border-emerald-200 bg-emerald-50 text-emerald-600" count={approvedCount} label="Approved" />
        <Pill icon={FileText} cls="border-teal-200 bg-teal-50 text-teal-600" count={documents.length} label="Shared files" />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setShowUpload(true)} disabled={shipments.length === 0}>
            <Upload size={14} /> Upload
          </Button>
          <Button onClick={() => setShowRequest(true)} disabled={shipments.length === 0} className="bg-teal-600 hover:bg-teal-700">
            <FileQuestion size={14} /> Request document
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-48 flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              placeholder={t("documents.search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Filter size={13} className="text-slate-400" />
          {(["all", "open", "approved"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium capitalize",
                filter === value ? "bg-teal-600 text-white" : "text-slate-500 hover:bg-slate-100",
              )}
            >
              {value}
            </button>
          ))}
          <button onClick={() => void load()} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Request', 'Shipment', 'Type', 'Required', 'Deadline', 'Status', 'Updated', ''].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-left text-xs font-semibold text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="py-14 text-center text-sm text-slate-400"><Loader2 size={16} className="mr-2 inline animate-spin" />Loading</td></tr>
              ) : visibleRequests.length === 0 ? (
                <tr><td colSpan={8} className="py-14 text-center text-sm text-slate-400">No document requests found.</td></tr>
              ) : visibleRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <p className="max-w-xs truncate text-xs font-semibold text-slate-800">{request.title}</p>
                    {request.comment && <p className="mt-0.5 max-w-xs truncate text-[11px] text-slate-400">{request.comment}</p>}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{request.shipmentReference}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{request.documentType}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{request.required ? "Required" : "Optional"}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{request.dueDate ? formatDateTime(request.dueDate) : "—"}</td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_CLASS[request.status])}>
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{formatDateTime(request.updatedAt)}</td>
                  <td className="px-5 py-3 text-right">
                    {request.documentId ? (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => void download(request.documentId!, `${request.documentType}.pdf`)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600"
                          title="Download"
                        ><Download size={14} /></button>
                        {request.status !== "APPROVED" && (
                          <Button size="sm" onClick={() => setReviewing(request)}>Review</Button>
                        )}
                      </div>
                    ) : <span className="text-xs text-slate-400">Awaiting shipper</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Shared shipment documents</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-400">No documents have been uploaded for your assigned shipments.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((document) => (
              <button
                key={document.id}
                onClick={() => void download(document.id, document.name)}
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left hover:border-teal-300 hover:bg-teal-50/30"
              >
                <FileText size={17} className="shrink-0 text-teal-600" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-800">{document.name}</span>
                  <span className="block truncate text-[11px] text-slate-400">{document.type} · {document.status}</span>
                </span>
                <Download size={13} className="text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={showRequest} onClose={() => setShowRequest(false)} title="Request document">
        <div className="space-y-4">
          <Field label="Shipment">
            <Select value={requestForm.shipmentId} onChange={(event) => setRequestForm((current) => ({ ...current, shipmentId: event.target.value }))}>
              <option value="">Select an assigned shipment</option>
              {shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.reference} — {shipment.origin.city} → {shipment.destination.city}</option>)}
            </Select>
          </Field>
          <Field label="Document type">
            <Select value={requestForm.documentType} onChange={(event) => {
              const documentType = event.target.value as DocumentType;
              setRequestForm((current) => ({ ...current, documentType, title: documentType }));
            }}>
              {DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
            </Select>
          </Field>
          <Field label="Request title"><Input value={requestForm.title} onChange={(event) => setRequestForm((current) => ({ ...current, title: event.target.value }))} /></Field>
          <Field label="Description"><Textarea rows={3} value={requestForm.description} onChange={(event) => setRequestForm((current) => ({ ...current, description: event.target.value }))} placeholder="Explain what must be included." /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Deadline"><Input type="datetime-local" value={requestForm.dueDate} onChange={(event) => setRequestForm((current) => ({ ...current, dueDate: event.target.value }))} /></Field>
            <Field label="Requirement">
              <Select value={requestForm.required ? "required" : "optional"} onChange={(event) => setRequestForm((current) => ({ ...current, required: event.target.value === "required" }))}>
                <option value="required">Required</option><option value="optional">Optional</option>
              </Select>
            </Field>
          </div>
          <Field label="Broker comment"><Textarea rows={2} value={requestForm.comment} onChange={(event) => setRequestForm((current) => ({ ...current, comment: event.target.value }))} placeholder="Please provide signed commercial invoice for customs clearance." /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowRequest(false)}>Cancel</Button>
            <Button disabled={busy || !requestForm.shipmentId || !requestForm.title.trim()} onClick={() => void createRequest()} className="bg-teal-600 hover:bg-teal-700">
              {busy && <Loader2 size={14} className="animate-spin" />} Send request
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload shared document">
        <div className="space-y-4">
          <Field label="Shipment">
            <Select value={uploadForm.shipmentId} onChange={(event) => setUploadForm((current) => ({ ...current, shipmentId: event.target.value }))}>
              <option value="">Select an assigned shipment</option>
              {shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.reference}</option>)}
            </Select>
          </Field>
          <Field label="Document type">
            <Select value={uploadForm.type} onChange={(event) => setUploadForm((current) => ({ ...current, type: event.target.value as DocumentType }))}>
              {DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
            </Select>
          </Field>
          <input ref={fileInput} type="file" className="hidden" onChange={(event) => setPickedFile(event.target.files?.[0] ?? null)} />
          <button onClick={() => fileInput.current?.click()} className="flex h-28 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 hover:border-teal-300 hover:bg-teal-50/40">
            <Upload size={20} /><span className="mt-2 text-sm">{pickedFile?.name ?? "Choose a file"}</span>
          </button>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button disabled={busy || !pickedFile || !uploadForm.shipmentId} onClick={() => void uploadSharedDocument()}>{busy && <Loader2 size={14} className="animate-spin" />} Upload</Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(reviewing)} onClose={() => setReviewing(null)} title={`Review ${reviewing?.documentType ?? "document"}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Review the uploaded file, then approve it or send clear feedback to the shipper.</p>
          <Field label="Review comment"><Textarea rows={4} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Optional review notes" /></Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="danger" disabled={busy} onClick={() => void review("REJECTED")}>Reject</Button>
            <Button variant="outline" disabled={busy} onClick={() => void review("REVISION_REQUIRED")}><RefreshCw size={14} /> Request revision</Button>
            <Button disabled={busy} onClick={() => void review("APPROVED")} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 size={14} /> Approve</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Pill({ icon: Icon, cls, count, label }: { icon: typeof Clock; cls: string; count: number; label: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-full border px-4 py-2", cls)}>
      <Icon size={14} /><span className="text-sm font-bold">{count}</span><span className="text-xs">{label}</span>
    </div>
  );
}
