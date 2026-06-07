import { useMemo, useState } from "react";
import { Box, Container, Plus, Train, Trash2, Truck, Weight } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { cn, formatNumber } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

type EquipKind = "container" | "trailer" | "wagon";

interface Equipment {
  id: string;
  name: string;
  kind: EquipKind;
  innerL: number; // meters
  innerW: number;
  innerH: number;
  payloadKg: number;
}

const EQUIPMENT: Equipment[] = [
  // Containers
  { id: "20gp", name: "20ft Standard", kind: "container", innerL: 5.9, innerW: 2.35, innerH: 2.39, payloadKg: 28200 },
  { id: "40gp", name: "40ft Standard", kind: "container", innerL: 12.03, innerW: 2.35, innerH: 2.39, payloadKg: 26600 },
  { id: "40hc", name: "40ft High Cube", kind: "container", innerL: 12.03, innerW: 2.35, innerH: 2.69, payloadKg: 26500 },
  { id: "45hc", name: "45ft High Cube", kind: "container", innerL: 13.56, innerW: 2.35, innerH: 2.69, payloadKg: 27700 },
  { id: "20rf", name: "20ft Reefer", kind: "container", innerL: 5.44, innerW: 2.29, innerH: 2.27, payloadKg: 27700 },
  { id: "40rf", name: "40ft Reefer HC", kind: "container", innerL: 11.56, innerW: 2.29, innerH: 2.5, payloadKg: 27700 },
  { id: "20ot", name: "20ft Open Top", kind: "container", innerL: 5.9, innerW: 2.35, innerH: 2.35, payloadKg: 28100 },
  { id: "40fr", name: "40ft Flat Rack", kind: "container", innerL: 12.06, innerW: 2.4, innerH: 2.14, payloadKg: 39340 },
  // Road trailers
  { id: "tautliner", name: "Curtainside (Tautliner)", kind: "trailer", innerL: 13.62, innerW: 2.48, innerH: 2.7, payloadKg: 24000 },
  { id: "boxvan", name: "Box / Dry Van", kind: "trailer", innerL: 13.36, innerW: 2.48, innerH: 2.6, payloadKg: 24000 },
  { id: "mega", name: "Mega Trailer", kind: "trailer", innerL: 13.62, innerW: 2.48, innerH: 3.0, payloadKg: 24000 },
  { id: "reefertrl", name: "Reefer Trailer", kind: "trailer", innerL: 13.3, innerW: 2.46, innerH: 2.6, payloadKg: 22000 },
  { id: "flatbed", name: "Flatbed", kind: "trailer", innerL: 13.62, innerW: 2.48, innerH: 2.7, payloadKg: 24000 },
  { id: "jumbo", name: "Jumbo Trailer", kind: "trailer", innerL: 14.9, innerW: 2.48, innerH: 3.0, payloadKg: 22000 },
  { id: "swapbody", name: "Swap Body", kind: "trailer", innerL: 7.45, innerW: 2.48, innerH: 2.7, payloadKg: 16000 },
  { id: "boxtruck", name: "Box Truck (rigid 7.2m)", kind: "trailer", innerL: 7.2, innerW: 2.45, innerH: 2.45, payloadKg: 10000 },
  // Rail wagons
  { id: "flatwagon", name: "Container Flat Wagon", kind: "wagon", innerL: 18.4, innerW: 2.45, innerH: 2.69, payloadKg: 60000 },
  { id: "coveredwagon", name: "Covered Wagon", kind: "wagon", innerL: 21.7, innerW: 2.78, innerH: 2.95, payloadKg: 28000 },
  { id: "openwagon", name: "Open Wagon", kind: "wagon", innerL: 12.8, innerW: 2.95, innerH: 2.0, payloadKg: 57000 },
  { id: "slidingwall", name: "Sliding-Wall Wagon", kind: "wagon", innerL: 21.7, innerW: 2.78, innerH: 2.95, payloadKg: 27000 },
];

const KIND_ICON: Record<EquipKind, typeof Container> = {
  container: Container,
  trailer: Truck,
  wagon: Train,
};

const CATEGORIES: { kind: EquipKind; labelKey: string }[] = [
  { kind: "container", labelKey: "loadcalc.containers" },
  { kind: "trailer", labelKey: "loadcalc.trailers" },
  { kind: "wagon", labelKey: "loadcalc.wagons" },
];

interface CargoItem {
  id: string;
  name: string;
  l: number; // cm
  w: number;
  h: number;
  weight: number; // kg
  qty: number;
}

let idc = 0;
const newItem = (over?: Partial<CargoItem>): CargoItem => ({
  id: `c-${++idc}`,
  name: `Pallet ${idc}`,
  l: 120,
  w: 100,
  h: 145,
  weight: 320,
  qty: 10,
  ...over,
});

export function LoadCalculator() {
  const { t } = useI18n();
  const [equipId, setEquipId] = useState("40hc");
  const [items, setItems] = useState<CargoItem[]>([
    newItem({ name: "Euro pallet", l: 120, w: 80, h: 144, weight: 280, qty: 14 }),
    newItem({ name: "Crate A", l: 110, w: 110, h: 120, weight: 450, qty: 6 }),
  ]);

  const equip = EQUIPMENT.find((e) => e.id === equipId)!;
  const equipVolume = equip.innerL * equip.innerW * equip.innerH; // m³

  const totals = useMemo(() => {
    let volume = 0;
    let weight = 0;
    let pieces = 0;
    for (const it of items) {
      const v = (it.l / 100) * (it.w / 100) * (it.h / 100) * it.qty;
      volume += v;
      weight += it.weight * it.qty;
      pieces += it.qty;
    }
    const volRatio = volume / equipVolume;
    const wtRatio = weight / equip.payloadKg;
    const unitsNeeded = Math.max(1, Math.ceil(Math.max(volRatio, wtRatio)));
    // utilization within the required units
    const volUtil = (volume / (equipVolume * unitsNeeded)) * 100;
    const wtUtil = (weight / (equip.payloadKg * unitsNeeded)) * 100;
    return { volume, weight, pieces, volRatio, wtRatio, unitsNeeded, volUtil, wtUtil };
  }, [items, equip, equipVolume]);

  const update = (id: string, key: keyof CargoItem, value: string) =>
    setItems((arr) =>
      arr.map((it) =>
        it.id === id
          ? { ...it, [key]: key === "name" ? value : Number(value) || 0 }
          : it
      )
    );

  const fillPct = Math.min(100, totals.volUtil);
  const overweight = totals.wtRatio > totals.unitsNeeded;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* Inputs */}
      <div className="space-y-6 xl:col-span-2">
        <Card>
          <CardHeader
            title={t("loadcalc.equipment")}
            subtitle={t("loadcalc.equipmentSub")}
          />
          <CardBody className="space-y-5">
            {CATEGORIES.map(({ kind, labelKey }) => {
              const Icon = KIND_ICON[kind];
              return (
                <div key={kind}>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <Icon size={13} />
                    {t(labelKey)}
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {EQUIPMENT.filter((e) => e.kind === kind).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setEquipId(e.id)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition",
                          equipId === e.id
                            ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-200"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            equipId === e.id
                              ? "bg-brand-600 text-white"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          <Icon size={16} />
                        </span>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {e.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {(e.innerL * e.innerW * e.innerH).toFixed(1)} m³ ·{" "}
                          {formatNumber(e.payloadKg)} kg
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Cargo items"
            subtitle="Dimensions in cm, weight per unit"
            action={
              <Button size="sm" variant="outline" onClick={() => setItems((a) => [...a, newItem()])}>
                <Plus size={14} />
                Add item
              </Button>
            }
          />
          <CardBody className="space-y-3">
            <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium text-slate-400 sm:grid">
              <span className="col-span-3">Item</span>
              <span className="col-span-2">L (cm)</span>
              <span className="col-span-2">W (cm)</span>
              <span className="col-span-2">H (cm)</span>
              <span className="col-span-1">Kg</span>
              <span className="col-span-1">Qty</span>
              <span className="col-span-1" />
            </div>
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                <div className="col-span-2 sm:col-span-3">
                  <Label className="sm:hidden">Item</Label>
                  <Input value={it.name} onChange={(e) => update(it.id, "name", e.target.value)} />
                </div>
                <NumCell label="L" value={it.l} onChange={(v) => update(it.id, "l", v)} />
                <NumCell label="W" value={it.w} onChange={(v) => update(it.id, "w", v)} />
                <NumCell label="H" value={it.h} onChange={(v) => update(it.id, "h", v)} />
                <NumCell label="Kg" value={it.weight} onChange={(v) => update(it.id, "weight", v)} span="sm:col-span-1" />
                <NumCell label="Qty" value={it.qty} onChange={(v) => update(it.id, "qty", v)} span="sm:col-span-1" />
                <div className="col-span-2 flex items-end sm:col-span-1">
                  <button
                    onClick={() => setItems((a) => a.filter((x) => x.id !== it.id))}
                    disabled={items.length === 1}
                    className="flex h-10 w-full items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Results */}
      <div className="space-y-6">
        <Card>
          <CardHeader title="Load summary" subtitle={equip.name} />
          <CardBody className="space-y-5">
            {/* Fill visualization */}
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">Volume utilization</span>
                <span className="font-semibold text-slate-900">
                  {totals.volUtil.toFixed(0)}%
                </span>
              </div>
              <div className="relative h-28 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
                <div
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-700"
                  style={{ height: `${fillPct}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-md bg-white/85 px-2.5 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
                    {totals.volume.toFixed(1)} / {(equipVolume * totals.unitsNeeded).toFixed(1)} m³
                  </span>
                </div>
              </div>
            </div>

            <Gauge
              icon={<Weight size={14} />}
              label="Weight utilization"
              pct={Math.min(100, totals.wtUtil)}
              value={`${formatNumber(Math.round(totals.weight))} / ${formatNumber(
                equip.payloadKg * totals.unitsNeeded
              )} kg`}
              tone={overweight ? "red" : totals.wtUtil > 90 ? "amber" : "emerald"}
            />

            <div className="grid grid-cols-2 gap-3">
              <Metric
                icon={(() => {
                  const Icon = KIND_ICON[equip.kind];
                  return <Icon size={16} />;
                })()}
                label={t(
                  equip.kind === "wagon"
                    ? "loadcalc.wagonsNeeded"
                    : equip.kind === "trailer"
                    ? "loadcalc.trailersNeeded"
                    : "loadcalc.containersNeeded"
                )}
                value={String(totals.unitsNeeded)}
              />
              <Metric
                icon={<Box size={16} />}
                label={t("loadcalc.totalPieces")}
                value={formatNumber(totals.pieces)}
              />
            </div>

            {overweight && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                Payload exceeds equipment limit — add another unit or reduce weight.
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Breakdown" />
          <CardBody className="space-y-2.5 text-sm">
            <Row label="Total volume" value={`${totals.volume.toFixed(2)} m³`} />
            <Row label="Total weight" value={`${formatNumber(Math.round(totals.weight))} kg`} />
            <Row label="Equipment volume" value={`${equipVolume.toFixed(1)} m³ / unit`} />
            <Row label="Equipment payload" value={`${formatNumber(equip.payloadKg)} kg / unit`} />
            <Row
              label="Constraint"
              value={totals.wtRatio > totals.volRatio ? "Weight-limited" : "Volume-limited"}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function NumCell({
  label,
  value,
  onChange,
  span = "sm:col-span-2",
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  span?: string;
}) {
  return (
    <div className={cn("col-span-1", span)}>
      <Label className="sm:hidden">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Gauge({
  icon,
  label,
  pct,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  pct: number;
  value: string;
  tone: "emerald" | "amber" | "red";
}) {
  const tones = { emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-slate-600">
          {icon}
          {label}
        </span>
        <span className="font-semibold text-slate-900">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all duration-700", tones[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-400">{value}</p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
        {icon}
      </span>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
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
