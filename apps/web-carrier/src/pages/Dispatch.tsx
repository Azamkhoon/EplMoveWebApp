import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, MapPin, Phone, RefreshCw, Truck, User, Zap } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Field";

type DispatchStatus = "pending_assign" | "pickup_scheduled" | "in_transit" | "at_border" | "delivered";

interface DispatchRow {
  ref: string;
  origin: string;
  dest: string;
  pickup: string;
  delivery: string;
  driver: string | null;
  vehicle: string | null;
  status: DispatchStatus;
  delayed: boolean;
  cargo: string;
  customer: string;
}

const MOCK_LOADS: DispatchRow[] = [
  { ref: "SHP-0041", origin: "Shanghai, CN",    dest: "Los Angeles, US", pickup: "Jun 10", delivery: "Jun 28", driver: "Marcus Webb",      vehicle: "V-001 · TX-4821", status: "in_transit",       delayed: false, cargo: "Electronics 22t",    customer: "Acme Logistics" },
  { ref: "SHP-0039", origin: "Rotterdam, NL",   dest: "Hamburg, DE",     pickup: "Jun 11", delivery: "Jun 14", driver: "Jin Soo Park",      vehicle: "V-002 · CA-9034", status: "in_transit",       delayed: true,  cargo: "Auto Parts 18t",     customer: "AutoFleet GmbH"  },
  { ref: "SHP-0038", origin: "Houston, US",     dest: "Miami, US",       pickup: "Jun 14", delivery: "Jun 15", driver: "Tariq Al-Rashid",   vehicle: "V-005 · TX-6612", status: "pickup_scheduled", delayed: false, cargo: "Chemicals 8t",       customer: "ChemCorp USA"    },
  { ref: "SHP-0036", origin: "Dubai, AE",       dest: "Singapore, SG",   pickup: "Jun 16", delivery: "Jun 20", driver: null,                vehicle: null,              status: "pending_assign",   delayed: false, cargo: "Consumer Goods 14t", customer: "Gulf Traders"    },
  { ref: "SHP-0034", origin: "Frankfurt, DE",   dest: "Warsaw, PL",      pickup: "Jun 12", delivery: "Jun 13", driver: "Elena Sorokina",    vehicle: "V-004 · NY-7753", status: "at_border",        delayed: false, cargo: "Machinery 30t",      customer: "PL Imports"      },
  { ref: "SHP-0031", origin: "Osaka, JP",       dest: "Sydney, AU",      pickup: "Jun 05", delivery: "Jun 12", driver: "Amara Diallo",      vehicle: "V-001 · TX-4821", status: "delivered",        delayed: false, cargo: "Raw Materials 25t",  customer: "AusTrade"        },
];

const DRIVERS = ["Marcus Webb", "Elena Sorokina", "Tariq Al-Rashid", "Jin Soo Park", "Amara Diallo"];
const VEHICLES = ["V-001 · TX-4821 (Ocean)", "V-002 · CA-9034 (Truck)", "V-004 · NY-7753 (Rail)", "V-005 · TX-6612 (Air)"];

const STATUS_META: Record<DispatchStatus, { label: string; tone: "slate" | "amber" | "blue" | "navy" | "green" }> = {
  pending_assign:   { label: "Pending Assign",   tone: "slate"  },
  pickup_scheduled: { label: "Pickup Scheduled", tone: "amber"  },
  in_transit:       { label: "In Transit",       tone: "blue"   },
  at_border:        { label: "At Border",        tone: "navy"   },
  delivered:        { label: "Delivered",        tone: "green"  },
};

export function Dispatch() {
  const [loads, setLoads]       = useState<DispatchRow[]>(MOCK_LOADS);
  const [assigning, setAssigning] = useState<DispatchRow | null>(null);
  const [selDriver, setSelDriver]  = useState("");
  const [selVehicle, setSelVehicle] = useState("");
  const [filter, setFilter]     = useState<"all" | "delayed" | "unassigned">("all");

  const counts = {
    inTransit:   loads.filter((l) => l.status === "in_transit").length,
    pending:     loads.filter((l) => l.status === "pending_assign").length,
    delayed:     loads.filter((l) => l.delayed).length,
    delivered:   loads.filter((l) => l.status === "delivered").length,
  };

  const shown = loads.filter((l) => {
    if (filter === "delayed")    return l.delayed;
    if (filter === "unassigned") return l.status === "pending_assign";
    return true;
  });

  function openAssign(row: DispatchRow) {
    setAssigning(row);
    setSelDriver(row.driver ?? "");
    setSelVehicle(row.vehicle ?? "");
  }

  function confirmAssign() {
    if (!assigning) return;
    setLoads((prev) =>
      prev.map((l) =>
        l.ref === assigning.ref
          ? { ...l, driver: selDriver || null, vehicle: selVehicle || null, status: selDriver ? "pickup_scheduled" : l.status }
          : l,
      ),
    );
    setAssigning(null);
  }

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "In Transit",    value: counts.inTransit,  color: "bg-blue-500"    },
          { label: "Unassigned",    value: counts.pending,    color: "bg-amber-500"   },
          { label: "Delayed",       value: counts.delayed,    color: "bg-red-500"     },
          { label: "Delivered",     value: counts.delivered,  color: "bg-emerald-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <span className={`h-3 w-3 rounded-full ${color}`} />
            <div>
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {(["all", "delayed", "unassigned"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === f
                ? "bg-brand-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All loads" : f === "delayed" ? "Delayed only" : "Unassigned"}
          </button>
        ))}
        <div className="ml-auto text-xs text-slate-400">{shown.length} of {loads.length} loads</div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Shipment</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Pickup</th>
                <th className="px-4 py-3 font-medium">Delivery</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shown.map((row) => {
                const meta = STATUS_META[row.status];
                return (
                  <tr key={row.ref} className={`transition hover:bg-slate-50 ${row.delayed ? "bg-red-50/30" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                        {row.ref}
                        {row.delayed && <AlertTriangle size={13} className="text-red-400" />}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">{row.cargo}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{row.customer}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={12} className="shrink-0 text-slate-300" />
                        <span className="truncate max-w-[160px]">{row.origin} → {row.dest}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{row.pickup}</td>
                    <td className="px-4 py-3.5 text-slate-500">{row.delivery}</td>
                    <td className="px-4 py-3.5">
                      {row.driver
                        ? <span className="flex items-center gap-1.5 text-slate-700"><User size={13} className="text-slate-300" />{row.driver}</span>
                        : <span className="text-xs text-red-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {row.vehicle
                        ? <span className="flex items-center gap-1.5 text-slate-700"><Truck size={13} className="text-slate-300" />{row.vehicle}</span>
                        : <span className="text-xs text-red-400">None</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {row.status !== "delivered" && (
                        <Button size="sm" variant="outline" onClick={() => openAssign(row)}>
                          {row.driver ? "Reassign" : "Assign"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Assign modal */}
      <Modal
        open={!!assigning}
        onClose={() => setAssigning(null)}
        title={`Assign · ${assigning?.ref ?? ""}`}
        subtitle={assigning ? `${assigning.origin} → ${assigning.dest}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button onClick={confirmAssign}>Confirm assignment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Assign driver">
            <Select value={selDriver} onChange={(e) => setSelDriver(e.target.value)}>
              <option value="">— Select driver —</option>
              {DRIVERS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Assign vehicle">
            <Select value={selVehicle} onChange={(e) => setSelVehicle(e.target.value)}>
              <option value="">— Select vehicle —</option>
              {VEHICLES.map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
          </Field>
          {assigning?.delayed && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 ring-1 ring-red-200">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-xs text-red-700">This shipment is behind schedule. Prioritise assignment.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
