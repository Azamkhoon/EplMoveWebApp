import { useState } from "react";
import { Plus, Search, Truck, Wrench, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/Misc";

type VehicleStatus = "active" | "idle" | "maintenance" | "decommissioned";
type VehicleType = "Truck" | "Trailer" | "Reefer" | "Rail Wagon" | "Air Cargo" | "Ocean Container" | "Courier Van";

interface Vehicle {
  id: string;
  plate: string;
  vin: string;
  type: VehicleType;
  capacityT: number;
  capacityM3: number;
  tempRange: string | null;
  gpsId: string;
  insurance: string;
  status: VehicleStatus;
  nextService: string;
  assignedTo: string | null;
}

const INITIAL: Vehicle[] = [
  { id: "V-001", plate: "TX-4821", vin: "1HGCM82633A123456", type: "Ocean Container", capacityT: 28, capacityM3: 67,  tempRange: null,        gpsId: "GPS-8821", insurance: "AXA-2024-881",  status: "active",      nextService: "Aug 15", assignedTo: "Marcus Webb"    },
  { id: "V-002", plate: "CA-9034", vin: "2T3ZFREV0JW112233", type: "Truck",           capacityT: 40, capacityM3: 90,  tempRange: null,        gpsId: "GPS-9034", insurance: "Zurich-2024-44", status: "active",      nextService: "Jul 01", assignedTo: "Jin Soo Park"   },
  { id: "V-003", plate: "FL-2210", vin: "3VWFE21C04M000099", type: "Reefer",          capacityT: 22, capacityM3: 58,  tempRange: "-25°C / +5°C", gpsId: "GPS-2210", insurance: "AXA-2024-992",  status: "maintenance", nextService: "Jun 16", assignedTo: null             },
  { id: "V-004", plate: "NY-7753", vin: "4S3BMHB68B3286050", type: "Rail Wagon",      capacityT: 60, capacityM3: 120, tempRange: null,        gpsId: "GPS-7753", insurance: "Lloyd's-881",   status: "idle",        nextService: "Sep 10", assignedTo: "Elena Sorokina" },
  { id: "V-005", plate: "TX-6612", vin: "5YJSA1CN5DFP12345", type: "Air Cargo",       capacityT: 12, capacityM3: 35,  tempRange: null,        gpsId: "GPS-6612", insurance: "Allianz-2024",  status: "active",      nextService: "Jul 22", assignedTo: "Tariq Al-Rashid"},
  { id: "V-006", plate: "LA-3391", vin: "6G1MK5239G8109999", type: "Courier Van",     capacityT: 1,  capacityM3: 8,   tempRange: null,        gpsId: "GPS-3391", insurance: "AXA-2024-110",  status: "idle",        nextService: "Oct 01", assignedTo: null             },
];

const STATUS_META: Record<VehicleStatus, { label: string; tone: "green" | "slate" | "amber" | "red"; dot: string }> = {
  active:          { label: "Active",          tone: "green", dot: "bg-emerald-500" },
  idle:            { label: "Idle",            tone: "slate", dot: "bg-slate-400"   },
  maintenance:     { label: "Maintenance",     tone: "amber", dot: "bg-amber-500"   },
  decommissioned:  { label: "Decommissioned",  tone: "red",   dot: "bg-red-400"     },
};

const VEHICLE_TYPES: VehicleType[] = ["Truck", "Trailer", "Reefer", "Rail Wagon", "Air Cargo", "Ocean Container", "Courier Van"];

export function Fleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");
  const [editing, setEditing]   = useState<Vehicle | null>(null);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState<Partial<Vehicle>>({});

  const shown = vehicles.filter((v) => {
    const matchSearch = !search || v.plate.toLowerCase().includes(search.toLowerCase()) || v.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const active      = vehicles.filter((v) => v.status === "active").length;
  const utilPct     = Math.round((active / vehicles.length) * 100);
  const maintenance = vehicles.filter((v) => v.status === "maintenance").length;

  function openEdit(v: Vehicle) { setEditing(v); setForm({ ...v }); }
  function openAdd() { setAdding(true); setForm({ status: "idle", type: "Truck" }); }

  function save() {
    if (editing) {
      setVehicles((prev) => prev.map((v) => v.id === editing.id ? { ...v, ...form } as Vehicle : v));
      setEditing(null);
    } else {
      const newV: Vehicle = {
        id: `V-00${vehicles.length + 1}`,
        plate: form.plate ?? "",
        vin: form.vin ?? "",
        type: (form.type ?? "Truck") as VehicleType,
        capacityT: form.capacityT ?? 0,
        capacityM3: form.capacityM3 ?? 0,
        tempRange: form.tempRange ?? null,
        gpsId: form.gpsId ?? "",
        insurance: form.insurance ?? "",
        status: (form.status ?? "idle") as VehicleStatus,
        nextService: form.nextService ?? "",
        assignedTo: null,
      };
      setVehicles((prev) => [...prev, newV]);
      setAdding(false);
    }
  }

  function f(k: keyof Vehicle, val: string | number) {
    setForm((p) => ({ ...p, [k]: val }));
  }

  const isOpen = !!editing || adding;
  function closeModal() { setEditing(null); setAdding(false); }

  return (
    <div className="space-y-5">
      {/* Fleet summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-2xl font-bold text-slate-900">{vehicles.length}</p>
          <p className="text-xs text-slate-500">Total vehicles</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-2xl font-bold text-emerald-600">{active}</p>
          <p className="text-xs text-slate-500">Active</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-2xl font-bold text-amber-600">{maintenance}</p>
          <p className="text-xs text-slate-500">In maintenance</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="mb-1 flex items-end justify-between">
            <p className="text-2xl font-bold text-slate-900">{utilPct}%</p>
            <Truck size={16} className="text-slate-300" />
          </div>
          <ProgressBar value={utilPct} tone="emerald" />
          <p className="mt-1 text-xs text-slate-500">Fleet utilisation</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Plate or type…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(["all", "active", "idle", "maintenance"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                statusFilter === s ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "All" : STATUS_META[s]?.label ?? s}
            </button>
          ))}
        </div>
        <Button className="ml-auto" size="sm" onClick={openAdd}>
          <Plus size={15} /> Add vehicle
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((v) => {
          const meta = STATUS_META[v.status];
          return (
            <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{v.plate}</p>
                  <p className="text-xs text-slate-400">{v.type} · {v.id}</p>
                </div>
                <Badge tone={meta.tone}>
                  <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </Badge>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between"><span className="text-slate-400">Capacity</span><span>{v.capacityT}t / {v.capacityM3}m³</span></div>
                {v.tempRange && <div className="flex justify-between"><span className="text-slate-400">Temp range</span><span>{v.tempRange}</span></div>}
                <div className="flex justify-between"><span className="text-slate-400">GPS</span><span>{v.gpsId}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Next service</span><span>{v.nextService}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Driver</span><span>{v.assignedTo ?? "—"}</span></div>
              </div>
              {v.status === "maintenance" && (
                <div className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                  <Wrench size={12} /> In maintenance — expected return {v.nextService}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(v)}>Edit</Button>
                <Button
                  variant={v.status === "active" ? "ghost" : "subtle"}
                  size="sm"
                  onClick={() => setVehicles((prev) => prev.map((x) => x.id === v.id ? { ...x, status: x.status === "active" ? "idle" : "active" } : x))}
                >
                  {v.status === "active" ? "Set idle" : "Activate"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={isOpen}
        onClose={closeModal}
        title={editing ? `Edit ${editing.plate}` : "Add vehicle"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save changes" : "Add vehicle"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="License plate">
            <Input value={form.plate ?? ""} onChange={(e) => f("plate", e.target.value)} placeholder="TX-4821" />
          </Field>
          <Field label="VIN number">
            <Input value={form.vin ?? ""} onChange={(e) => f("vin", e.target.value)} placeholder="1HGCM82633A…" />
          </Field>
          <Field label="Vehicle type">
            <Select value={form.type ?? "Truck"} onChange={(e) => f("type", e.target.value)}>
              {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status ?? "idle"} onChange={(e) => f("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="maintenance">Maintenance</option>
              <option value="decommissioned">Decommissioned</option>
            </Select>
          </Field>
          <Field label="Capacity (tonnes)">
            <Input type="number" value={form.capacityT ?? ""} onChange={(e) => f("capacityT", Number(e.target.value))} placeholder="20" />
          </Field>
          <Field label="Capacity (m³)">
            <Input type="number" value={form.capacityM3 ?? ""} onChange={(e) => f("capacityM3", Number(e.target.value))} placeholder="67" />
          </Field>
          <Field label="Temp range (optional)">
            <Input value={form.tempRange ?? ""} onChange={(e) => f("tempRange", e.target.value)} placeholder="-25°C / +5°C" />
          </Field>
          <Field label="GPS device ID">
            <Input value={form.gpsId ?? ""} onChange={(e) => f("gpsId", e.target.value)} placeholder="GPS-8821" />
          </Field>
          <Field label="Insurance policy" className="col-span-2">
            <Input value={form.insurance ?? ""} onChange={(e) => f("insurance", e.target.value)} placeholder="AXA-2024-881" />
          </Field>
          <Field label="Next service date" className="col-span-2">
            <Input value={form.nextService ?? ""} onChange={(e) => f("nextService", e.target.value)} placeholder="Aug 15, 2025" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
