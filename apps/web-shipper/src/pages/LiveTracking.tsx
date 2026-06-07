import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation, Radio, Send } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, ProgressBar } from "@/components/ui/Misc";
import { api, LIVE } from "@/api/client";
import { ApiError, type Shipment, type TrackingState } from "@epl/sdk";
import { formatDateTime } from "@/lib/utils";

/**
 * Live tracking (Phase 3): subscribes to the tracking WebSocket and renders
 * real-time position + ETA. Includes a "simulate position" control that stands
 * in for the driver app / telematics feed.
 */
export function LiveTracking() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [state, setState] = useState<TrackingState | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(LIVE);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!LIVE || !api) return;
    api
      .listShipments()
      .then(setShipments)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  // Open the WS stream once (filters by selected shipment in the handler).
  useEffect(() => {
    if (!LIVE || !api) return;
    setConnected(true);
    closeRef.current = api.openTrackingStream((s) => {
      setState((prev) => (s.shipmentId === (selectedRef.current?.id ?? s.shipmentId) ? s : prev));
    });
    return () => {
      closeRef.current?.();
      setConnected(false);
    };
  }, []);

  // Keep the latest selection available to the WS handler.
  const selectedRef = useRef<Shipment | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  async function select(s: Shipment) {
    if (!api) return;
    setSelected(s);
    setState(null);
    try {
      setState(await api.getTrackingState(s.id));
    } catch {
      setState(null); // not tracked yet
    }
  }

  async function simulate() {
    if (!api || !selected || !state) return;
    // Nudge the position ~40% of the way toward the destination for the demo.
    const lat = state.lat + (selected.destination.lat - state.lat) * 0.4;
    const lng = state.lng + (selected.destination.lng - state.lng) * 0.4;
    await api.reportPosition(selected.id, { lat, lng, speedKph: 60 }).catch(() => undefined);
  }

  if (!LIVE) {
    return (
      <Card>
        <EmptyState
          icon={<Navigation size={22} />}
          title="Live tracking requires the backend"
          description="Set VITE_API_URL and sign in to see real-time GPS positions and ETAs over WebSocket."
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader
          title="Shipments"
          subtitle={
            <span className="flex items-center gap-1.5">
              <Radio size={12} className={connected ? "text-emerald-500" : "text-slate-400"} />
              {connected ? "live" : "offline"}
            </span>
          }
        />
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-8 text-slate-400">
              <Loader2 className="animate-spin" />
            </div>
          ) : shipments.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No shipments yet.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {shipments.map((s) => (
                <button
                  key={s.id}
                  onClick={() => select(s)}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition ${
                    selected?.id === s.id ? "bg-brand-50/60 ring-1 ring-inset ring-brand-200" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">{s.reference}</span>
                  <span className="text-xs text-slate-500">
                    {s.origin.city} → {s.destination.city} · {s.carrierName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader
            title={selected ? selected.reference : "Select a shipment"}
            subtitle={selected ? `${selected.origin.city} → ${selected.destination.city}` : "Live position & ETA"}
            action={
              selected && state ? (
                <Button size="sm" variant="outline" onClick={simulate}>
                  <Send size={14} /> Simulate move
                </Button>
              ) : undefined
            }
          />
          <CardBody>
            {!selected ? (
              <EmptyState icon={<MapPin size={22} />} title="No shipment selected" />
            ) : !state ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No tracking data yet for this shipment.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Metric label="Progress" value={`${state.progress}%`} />
                  <Metric label="Remaining" value={`${state.remainingKm.toLocaleString()} km`} />
                  <Metric label="Speed" value={state.speedKph ? `${Math.round(state.speedKph)} km/h` : "—"} />
                  <Metric label="ETA" value={state.etaDate ? formatDateTime(state.etaDate) : "—"} />
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium text-slate-600">Route progress</span>
                    <span className="font-semibold text-slate-900">{state.progress}%</span>
                  </div>
                  <ProgressBar value={state.progress} className="h-2" />
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                  Last position: {state.lat.toFixed(3)}, {state.lng.toFixed(3)} · updated{" "}
                  {formatDateTime(state.updatedAt)}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
