import { useState } from "react";
import { Search, Upload, CheckCircle2, Clock, FileText, Filter, type LucideIcon } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { DOCUMENTS, DECLARATIONS } from "@/data/mock";
import type { BrokerDocument, DocType } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const DOC_TYPE_LABELS: Record<DocType, string> = {
  commercial_invoice:    "Commercial Invoice",
  packing_list:          "Packing List",
  certificate_of_origin: "Certificate of Origin",
  bill_of_lading:        "Bill of Lading",
  air_waybill:           "Air Waybill",
  cmr:                   "CMR Note",
  import_permit:         "Import Permit",
  export_permit:         "Export Permit",
  customs_license:       "Customs License",
  declaration_form:      "Declaration Form",
  other:                 "Other",
};

const TYPE_COLORS: Partial<Record<DocType, string>> = {
  commercial_invoice: "bg-blue-100 text-blue-700",
  bill_of_lading:     "bg-violet-100 text-violet-700",
  air_waybill:        "bg-sky-100 text-sky-700",
  cmr:                "bg-orange-100 text-orange-700",
  certificate_of_origin:"bg-emerald-100 text-emerald-700",
  import_permit:      "bg-red-100 text-red-700",
  export_permit:      "bg-amber-100 text-amber-700",
  declaration_form:   "bg-teal-100 text-teal-700",
  packing_list:       "bg-slate-100 text-slate-600",
  customs_license:    "bg-pink-100 text-pink-700",
  other:              "bg-slate-100 text-slate-500",
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Documents() {
  const [docs, setDocs]       = useState<BrokerDocument[]>(DOCUMENTS);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<"all" | "verified" | "pending">("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", type: "commercial_invoice" as DocType, declarationId: "" });

  const visible = docs.filter((d) => {
    if (filter === "verified" && !d.verified) return false;
    if (filter === "pending"  && d.verified)  return false;
    if (search) {
      const q = search.toLowerCase();
      return d.name.toLowerCase().includes(q) || (d.declarationRef ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  function verify(id: string) {
    setDocs((p) => p.map((d) => d.id === id ? { ...d, verified: true } : d));
  }

  function upload() {
    const dec = DECLARATIONS.find((d) => d.id === uploadForm.declarationId);
    const newDoc: BrokerDocument = {
      id:            `doc-${Date.now()}`,
      name:          uploadForm.name,
      type:          uploadForm.type,
      declarationId: uploadForm.declarationId,
      declarationRef: dec?.reference ?? "—",
      clientId:      dec?.clientId ?? "",
      size:          Math.floor(Math.random() * 400000 + 50000),
      uploadedBy:    "Sara Mitchell",
      uploadedAt:    new Date().toISOString(),
      verified:      false,
    };
    setDocs((p) => [newDoc, ...p]);
    setShowUpload(false);
    setUploadForm({ name: "", type: "commercial_invoice", declarationId: "" });
  }

  const verified = docs.filter((d) => d.verified).length;
  const pending  = docs.filter((d) => !d.verified).length;

  return (
    <div className="space-y-5">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <Pill icon={CheckCircle2} cls="text-emerald-600 bg-emerald-50 border-emerald-200" count={verified} label="Verified" />
        <Pill icon={Clock}        cls="text-amber-600 bg-amber-50 border-amber-200"       count={pending}  label="Awaiting Verification" />
        <Pill icon={FileText}     cls="text-teal-600 bg-teal-50 border-teal-200"          count={docs.length} label="Total Documents" />
      </div>

      {/* Main card */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              placeholder="Search documents or declaration ref…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter size={13} className="text-slate-400" />
            {(["all","verified","pending"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                  filter === f ? "bg-teal-600 text-white" : "text-slate-500 hover:bg-slate-100")}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
            <Upload size={13} />
            Upload
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Document","Type","Declaration","Uploaded By","Date","Size","Status",""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="shrink-0 text-slate-400" />
                      <span className="max-w-xs truncate text-xs font-medium text-slate-700">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", TYPE_COLORS[doc.type] ?? "bg-slate-100 text-slate-500")}>
                      {DOC_TYPE_LABELS[doc.type]}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{doc.declarationRef}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{doc.uploadedBy}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{formatDateTime(doc.uploadedAt)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{fmtSize(doc.size)}</td>
                  <td className="px-5 py-3">
                    {doc.verified
                      ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={12} /> Verified</span>
                      : <span className="flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock size={12} /> Pending</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    {!doc.verified && (
                      <button onClick={() => verify(doc.id)}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-400">No documents found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
          {visible.length} document{visible.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Upload modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Document">
        <div className="space-y-4">
          <Field label="Document Name">
            <Input value={uploadForm.name} onChange={(e) => setUploadForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Commercial Invoice — SHP-0042.pdf" />
          </Field>
          <Field label="Document Type">
            <select value={uploadForm.type} onChange={(e) => setUploadForm((p) => ({ ...p, type: e.target.value as DocType }))} className="input-base">
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Link to Declaration">
            <select value={uploadForm.declarationId} onChange={(e) => setUploadForm((p) => ({ ...p, declarationId: e.target.value }))} className="input-base">
              <option value="">None</option>
              {DECLARATIONS.map((d) => <option key={d.id} value={d.id}>{d.reference} — {d.clientName}</option>)}
            </select>
          </Field>
          <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
            <Upload size={20} className="mr-2 opacity-50" /> Drop file or click to browse
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={upload} disabled={!uploadForm.name}>Upload Document</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Pill({ icon: Icon, cls, count, label }: { icon: LucideIcon; cls: string; count: number; label: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-full border px-4 py-2", cls)}>
      <Icon size={14} />
      <span className="text-sm font-bold">{count}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
