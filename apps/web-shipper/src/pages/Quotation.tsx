import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Leaf,
  Package,
  Sparkles,
  Star,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/Misc";
import { SAMPLE_QUOTES } from "@/data/quotes";
import { LIVE } from "@/api/client";
import { cn, formatCurrency } from "@/lib/utils";
import type { QuoteOption, TransportMode } from "@/types";

type SortKey = "price" | "speed" | "co2";

export function Quotation() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    origin: "Shanghai, CN",
    destination: "Rotterdam, NL",
    mode: "Any" as TransportMode | "Any",
    weight: "18400",
    volume: "58",
    ready: "",
    cargo: "Industrial machinery parts",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("price");
  const [accepting, setAccepting] = useState<QuoteOption | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    setLoading(true);
    setSubmitted(false);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  }

  const quotes = useMemo(() => {
    let list = SAMPLE_QUOTES.filter(
      (q) => form.mode === "Any" || q.mode === form.mode
    );
    list = [...list].sort((a, b) => {
      if (sort === "price") return a.priceUsd - b.priceUsd;
      if (sort === "speed") return a.transitDays - b.transitDays;
      return a.co2Kg - b.co2Kg;
    });
    return list;
  }, [form.mode, sort]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {LIVE && (
        <div className="xl:col-span-3">
          <Card>
            <CardBody className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Live mode:</span> request real carrier
                bids from your posted loads in the Marketplace — compare rates, transit and ratings,
                then accept to create a shipment.
              </p>
              <Button size="sm" onClick={() => navigate("/marketplace")}>
                Go to Marketplace
                <ArrowRight size={14} />
              </Button>
            </CardBody>
          </Card>
        </div>
      )}
      {/* Request form */}
      <Card className="xl:col-span-1">
        <CardHeader title="Request a quote" subtitle="Compare carrier rates instantly" />
        <CardBody className="space-y-4">
          <Field label="Origin">
            <Input value={form.origin} onChange={(e) => set("origin", e.target.value)} />
          </Field>
          <Field label="Destination">
            <Input
              value={form.destination}
              onChange={(e) => set("destination", e.target.value)}
            />
          </Field>
          <Field label="Transport mode">
            <Select value={form.mode} onChange={(e) => set("mode", e.target.value)}>
              {["Any", "Ocean", "Air", "FTL", "LTL", "Rail"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (kg)">
              <Input
                type="number"
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
              />
            </Field>
            <Field label="Volume (m³)">
              <Input
                type="number"
                value={form.volume}
                onChange={(e) => set("volume", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Cargo ready date">
            <Input
              type="date"
              value={form.ready}
              onChange={(e) => set("ready", e.target.value)}
            />
          </Field>
          <Field label="Commodity">
            <Input value={form.cargo} onChange={(e) => set("cargo", e.target.value)} />
          </Field>
          <Button className="w-full" onClick={submit} disabled={loading}>
            {loading ? (
              <>
                <Sparkles size={16} className="animate-pulse" />
                Finding rates…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Get quotes
              </>
            )}
          </Button>
        </CardBody>
      </Card>

      {/* Results */}
      <div className="xl:col-span-2">
        {!submitted && !loading ? (
          <Card className="h-full">
            <EmptyState
              icon={<Package size={22} />}
              title="Your quotes will appear here"
              description="Fill in the shipment details and request quotes to compare carriers by price, speed and emissions."
            />
          </Card>
        ) : loading ? (
          <Card className="h-full">
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{quotes.length}</span>{" "}
                carrier quotes · {form.origin} → {form.destination}
              </p>
              <Tabs
                variant="pill"
                active={sort}
                onChange={(s) => setSort(s as SortKey)}
                items={[
                  { id: "price", label: "Cheapest" },
                  { id: "speed", label: "Fastest" },
                  { id: "co2", label: "Greenest" },
                ]}
              />
            </div>
            {quotes.map((q, i) => (
              <QuoteCard
                key={q.id}
                quote={q}
                cheapest={i === 0 && sort === "price"}
                onAccept={() => setAccepting(q)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Accept modal */}
      <Modal
        open={!!accepting}
        onClose={() => {
          setAccepting(null);
          setConfirmed(false);
        }}
        title={confirmed ? "Shipment created" : "Confirm booking"}
        subtitle={
          confirmed
            ? undefined
            : accepting
            ? `${accepting.carrier} · ${accepting.mode}`
            : undefined
        }
        footer={
          confirmed ? (
            <Button onClick={() => navigate("/shipments")}>
              View shipments
              <ArrowRight size={15} />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setAccepting(null)}>
                Cancel
              </Button>
              <Button onClick={() => setConfirmed(true)}>Confirm & book</Button>
            </>
          )
        }
      >
        {confirmed ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={30} />
            </span>
            <p className="mt-4 text-sm text-slate-600">
              Your shipment has been booked with{" "}
              <span className="font-semibold text-slate-900">
                {accepting?.carrier}
              </span>{" "}
              and added to your shipments as a posted load.
            </p>
          </div>
        ) : accepting ? (
          <div className="space-y-3 text-sm">
            <Row label="Lane" value={`${form.origin} → ${form.destination}`} />
            <Row label="Carrier" value={accepting.carrier} />
            <Row label="Mode" value={accepting.mode} />
            <Row label="Transit time" value={`${accepting.transitDays} days`} />
            <Row label="Cargo" value={form.cargo} />
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-slate-500">Total rate</span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(accepting.priceUsd)}
              </span>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function QuoteCard({
  quote,
  cheapest,
  onAccept,
}: {
  quote: QuoteOption;
  cheapest: boolean;
  onAccept: () => void;
}) {
  return (
    <Card
      className={cn(
        "transition hover:shadow-card-hover",
        quote.recommended && "ring-1 ring-brand-200"
      )}
    >
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-sm font-bold text-navy-700">
            {quote.carrier.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{quote.carrier}</p>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {quote.mode}
              </span>
              {quote.recommended && (
                <Badge tone="blue">
                  <Sparkles size={11} /> Recommended
                </Badge>
              )}
              {cheapest && !quote.recommended && (
                <Badge tone="green">Best price</Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {quote.transitDays} days
              </span>
              <span className="flex items-center gap-1">
                <Leaf size={12} /> {quote.co2Kg.toLocaleString()} kg CO₂
              </span>
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-amber-400 text-amber-400" />{" "}
                {quote.rating} · {quote.reliability}% on-time
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(quote.priceUsd)}
            </p>
            <p className="text-xs text-slate-400">all-in rate</p>
          </div>
          <Button size="sm" onClick={onAccept}>
            Accept
            <ArrowRight size={14} />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
