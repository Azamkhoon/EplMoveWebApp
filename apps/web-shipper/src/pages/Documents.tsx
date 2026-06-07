import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Receipt,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Misc";
import { api, LIVE, API_URL } from "@/api/client";
import { ApiError, type ShipmentDocument } from "@epl/sdk";
import { formatDateTime } from "@/lib/utils";

type Filter = "all" | "customs" | "invoices" | "pod";

const FILTER_TYPE: Record<Filter, string | undefined> = {
  all: undefined,
  customs: "Customs Declaration",
  invoices: "Commercial Invoice",
  pod: "Proof of Delivery",
};

const STATUS_TONE = { verified: "green", pending: "amber", rejected: "red" } as const;

export function Documents() {
  const [docs, setDocs] = useState<ShipmentDocument[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(LIVE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(f: Filter = filter) {
    if (!api) return;
    setLoading(true);
    try {
      setDocs(await api.listDocuments({ type: FILTER_TYPE[f] }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (LIVE) void refresh("all");
  }, []);

  async function upload() {
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      // Minimal demo upload (a tiny inline PDF-ish blob).
      const contentBase64 = btoa("%PDF-1.4 EPL Move demo document");
      await api.uploadDocument({
        type: "Commercial Invoice",
        name: `invoice-${Date.now()}.pdf`,
        contentType: "application/pdf",
        contentBase64,
        amount: 8650,
        currency: "USD",
      });
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function verify(id: string) {
    if (!api) return;
    await api.verifyDocument(id).catch(() => undefined);
    await refresh();
  }

  if (!LIVE) {
    return (
      <Card>
        <EmptyState
          icon={<FileText size={22} />}
          title="Documents require the backend"
          description="Set VITE_API_URL and sign in to upload, download and verify customs documents, invoices and proofs of delivery."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Tabs
          variant="pill"
          active={filter}
          onChange={(f) => {
            setFilter(f as Filter);
            void refresh(f as Filter);
          }}
          items={[
            { id: "all", label: "All", icon: <FileText size={14} /> },
            { id: "customs", label: "Customs", icon: <ShieldCheck size={14} /> },
            { id: "invoices", label: "Invoices", icon: <Receipt size={14} /> },
            { id: "pod", label: "Proof of delivery", icon: <CheckCircle2 size={14} /> },
          ]}
        />
        <Button size="md" disabled={busy} onClick={upload}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          Upload
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      <Card>
        <CardHeader title="Documents" subtitle="Customs declarations, invoices, BoL and PODs" />
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <EmptyState icon={<FileText size={22} />} title="No documents yet" description="Upload a document to get started." />
          ) : (
            <div className="divide-y divide-slate-100">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{d.name}</p>
                    <p className="text-xs text-slate-500">
                      {d.type}
                      {d.amount != null ? ` · ${d.currency} ${d.amount.toLocaleString()}` : ""} ·{" "}
                      {formatDateTime(d.uploadedAt)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[d.status]}>
                    {d.status === "verified" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                    {d.status}
                  </Badge>
                  {d.status !== "verified" && (
                    <Button variant="ghost" size="sm" onClick={() => verify(d.id)}>
                      Verify
                    </Button>
                  )}
                  <a href={`${API_URL}/documents/${d.id}/download`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      <Download size={14} />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
