import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Upload,
} from "lucide-react";
import type { ShipmentDocument } from "@/types";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { cn, formatDate } from "@/lib/utils";

const STATUS_META = {
  verified: { icon: CheckCircle2, tone: "text-emerald-600", bg: "bg-emerald-50", label: "Verified" },
  pending: { icon: Clock, tone: "text-amber-600", bg: "bg-amber-50", label: "Pending" },
  missing: { icon: AlertCircle, tone: "text-red-600", bg: "bg-red-50", label: "Missing" },
};

export function ShipmentDocs({ documents }: { documents: ShipmentDocument[] }) {
  const verified = documents.filter((d) => d.status === "verified").length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{verified}</span> of{" "}
          {documents.length} documents verified
        </p>
        <Button size="sm" variant="outline">
          <Upload size={14} />
          Upload document
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="No documents yet"
          description="Upload shipping documents to keep everything in one place."
        />
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
          {documents.map((d) => {
            const meta = STATUS_META[d.status];
            const Icon = meta.icon;
            return (
              <div
                key={d.id}
                className="flex items-center gap-3 bg-white px-4 py-3 transition hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <FileText size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{d.type}</p>
                  <p className="truncate text-xs text-slate-400">
                    {d.status === "missing"
                      ? "Not uploaded"
                      : `${d.name} · ${(d.sizeKb / 1024).toFixed(1)} MB · ${formatDate(d.uploadedAt)}`}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                    meta.bg,
                    meta.tone
                  )}
                >
                  <Icon size={13} />
                  {meta.label}
                </span>
                {d.status !== "missing" ? (
                  <button className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                    <Download size={16} />
                  </button>
                ) : (
                  <Button size="sm" variant="subtle">
                    <Upload size={13} />
                    Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
