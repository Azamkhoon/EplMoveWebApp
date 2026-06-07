import { useState } from "react";
import { Loader2, Sparkles, TrendingUp, Wand2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Misc";
import { api, LIVE } from "@/api/client";
import { ApiError, type RateEstimate, type RouteOptimizeResult } from "@epl/sdk";
import { formatCurrency } from "@/lib/utils";

const MODES = ["Ocean", "Air", "Road", "Rail", "Multimodal"] as const;

/** EPL Genius tools: freight rate estimation + route optimization. */
export function RateEstimator() {
  const [f, setF] = useState({
    origin: "Shanghai",
    destination: "Rotterdam",
    mode: "Ocean" as (typeof MODES)[number],
    weightKg: "18400",
    volumeM3: "58",
    priority: "cost" as "cost" | "speed" | "green",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [rate, setRate] = useState<RateEstimate | null>(null);
  const [routes, setRoutes] = useState<RouteOptimizeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      const [r, ro] = await Promise.all([
        api.estimateRate({
          origin: f.origin,
          destination: f.destination,
          mode: f.mode,
          weightKg: Number(f.weightKg),
          volumeM3: f.volumeM3 ? Number(f.volumeM3) : undefined,
        }),
        api.optimizeRoute({
          origin: f.origin,
          destination: f.destination,
          priority: f.priority,
          weightKg: Number(f.weightKg),
        }),
      ]);
      setRate(r);
      setRoutes(ro);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to estimate");
    } finally {
      setBusy(false);
    }
  }

  if (!LIVE) {
    return (
      <Card>
        <EmptyState
          icon={<Wand2 size={22} />}
          title="Genius tools require the backend"
          description="Set VITE_API_URL and sign in to use freight rate estimation and route optimization."
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-1">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-600" /> Genius rate &amp; route
            </span>
          }
          subtitle="AI freight estimate + best route"
        />
        <CardBody className="space-y-4">
          <Field label="Origin">
            <Input value={f.origin} onChange={(e) => set("origin", e.target.value)} />
          </Field>
          <Field label="Destination">
            <Input value={f.destination} onChange={(e) => set("destination", e.target.value)} />
          </Field>
          <Field label="Mode">
            <Select value={f.mode} onChange={(e) => set("mode", e.target.value)}>
              {MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (kg)">
              <Input type="number" value={f.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
            </Field>
            <Field label="Volume (m³)">
              <Input type="number" value={f.volumeM3} onChange={(e) => set("volumeM3", e.target.value)} />
            </Field>
          </div>
          <Field label="Optimize for">
            <Select value={f.priority} onChange={(e) => set("priority", e.target.value)}>
              <option value="cost">Lowest cost</option>
              <option value="speed">Fastest</option>
              <option value="green">Greenest</option>
            </Select>
          </Field>
          <Button className="w-full" disabled={busy} onClick={run}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Estimate
          </Button>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
          )}
        </CardBody>
      </Card>

      <div className="space-y-6 xl:col-span-2">
        {rate && (
          <Card>
            <CardHeader title="Freight rate estimate" subtitle={rate.basis} />
            <CardBody>
              <div className="flex items-end gap-6">
                <div>
                  <p className="text-xs text-slate-400">Estimated range</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(rate.lowUsd)} – {formatCurrency(rate.highUsd)}
                  </p>
                  <p className="text-xs text-slate-500">midpoint {formatCurrency(rate.midUsd)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Transit</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {rate.transitDaysLow}–{rate.transitDaysHigh} days
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Chargeable</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {rate.chargeableWeightKg.toLocaleString()} kg
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">{rate.disclaimer}</p>
            </CardBody>
          </Card>
        )}

        {routes && (
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-brand-600" /> Route options
                </span>
              }
              subtitle={`Ranked by ${routes.priority}`}
            />
            <CardBody className="space-y-2">
              {routes.options.map((o) => (
                <div
                  key={o.mode}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    o.recommended ? "border-brand-300 bg-brand-50/40" : "border-slate-200"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {o.mode} {o.recommended && <span className="text-brand-600">· Recommended</span>}
                    </p>
                    <p className="text-xs text-slate-500">{o.rationale}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(o.estCostUsd)}</p>
                    {o.transitDays}d · {o.co2Kg.toLocaleString()} kg CO₂
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {!rate && !routes && (
          <Card>
            <EmptyState
              icon={<Sparkles size={22} />}
              title="Estimate freight cost & best route"
              description="Enter shipment details and let EPL Genius estimate the rate and rank the optimal transport mode."
            />
          </Card>
        )}
      </div>
    </div>
  );
}
