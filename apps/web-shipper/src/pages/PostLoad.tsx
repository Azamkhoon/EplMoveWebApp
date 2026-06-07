import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, PackagePlus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { api, LIVE } from "@/api/client";
import { ApiError, type CreateLoadInput } from "@epl/sdk";

const MODES = ["Road", "Air", "Rail", "Ocean", "Multimodal"] as const;

/**
 * Post Load — captures shipment information and creates a real load via the
 * gateway (live mode). In mock mode it explains that a backend is required.
 */
export function PostLoad() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRef, setCreatedRef] = useState<string | null>(null);

  const [f, setF] = useState({
    mode: "Ocean" as (typeof MODES)[number],
    commodity: "Industrial machinery parts",
    pickupCity: "Shanghai",
    pickupCountry: "China",
    deliveryCity: "Rotterdam",
    deliveryCountry: "Netherlands",
    weightKg: "18400",
    volumeM3: "58",
    pieces: "12",
    equipmentCode: "40hc",
    incoterm: "FOB",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(asDraft: boolean) {
    if (!LIVE || !api) {
      setError("Posting a load requires the backend. Set VITE_API_URL and sign in.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input: CreateLoadInput = {
        mode: f.mode,
        commodity: f.commodity,
        equipmentKind: "container",
        equipmentCode: f.equipmentCode || undefined,
        pickup: { city: f.pickupCity, country: f.pickupCountry, lat: 0, lng: 0 },
        delivery: { city: f.deliveryCity, country: f.deliveryCountry, lat: 0, lng: 0 },
        weightKg: Number(f.weightKg),
        volumeM3: Number(f.volumeM3),
        pieces: f.pieces ? Number(f.pieces) : undefined,
        incoterm: f.incoterm || undefined,
        asDraft,
      };
      const load = await api.createLoad(input);
      setCreatedRef(load.reference);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.code}: ${e.message}` : "Failed to create load");
    } finally {
      setBusy(false);
    }
  }

  if (createdRef) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardBody className="flex flex-col items-center py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={30} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Load posted</h2>
          <p className="mt-1 text-sm text-slate-500">
            Reference <span className="font-semibold text-slate-900">{createdRef}</span> was created.
          </p>
          <div className="mt-5 flex gap-2">
            <Button variant="outline" onClick={() => setCreatedRef(null)}>
              Post another
            </Button>
            <Button onClick={() => navigate("/shipments")}>
              View shipments <ArrowRight size={15} />
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <PackagePlus size={16} className="text-brand-600" /> Post a load
            </span>
          }
          subtitle="Enter shipment information to post a load for carriers"
        />
        <CardBody className="space-y-5">
          {!LIVE && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-200">
              Running in mock mode — set <code>VITE_API_URL</code> and sign in to post real loads.
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Transport mode">
              <Select value={f.mode} onChange={(e) => set("mode", e.target.value)}>
                {MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Equipment type">
              <Input value={f.equipmentCode} onChange={(e) => set("equipmentCode", e.target.value)} />
            </Field>
          </div>

          <Field label="Commodity">
            <Input value={f.commodity} onChange={(e) => set("commodity", e.target.value)} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pickup city">
              <Input value={f.pickupCity} onChange={(e) => set("pickupCity", e.target.value)} />
            </Field>
            <Field label="Pickup country">
              <Input value={f.pickupCountry} onChange={(e) => set("pickupCountry", e.target.value)} />
            </Field>
            <Field label="Delivery city">
              <Input value={f.deliveryCity} onChange={(e) => set("deliveryCity", e.target.value)} />
            </Field>
            <Field label="Delivery country">
              <Input value={f.deliveryCountry} onChange={(e) => set("deliveryCountry", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Weight (kg)">
              <Input type="number" value={f.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
            </Field>
            <Field label="Volume (m³)">
              <Input type="number" value={f.volumeM3} onChange={(e) => set("volumeM3", e.target.value)} />
            </Field>
            <Field label="Pieces">
              <Input type="number" value={f.pieces} onChange={(e) => set("pieces", e.target.value)} />
            </Field>
          </div>

          <Field label="Incoterm">
            <Input value={f.incoterm} onChange={(e) => set("incoterm", e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" disabled={busy} onClick={() => submit(true)}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Save draft
            </Button>
            <Button disabled={busy} onClick={() => submit(false)}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Post load <ArrowRight size={15} />
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
