import { useState } from "react";
import { FileText, Phone, Plus, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { useI18n } from "@/i18n/LanguageContext";

type DriverStatus = "available" | "assigned" | "driving" | "resting" | "inactive";

interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  licenseNo: string;
  licenseExpiry: string;
  passportNo: string;
  passportExpiry: string;
  vehicle: string | null;
  currentLoad: string | null;
  status: DriverStatus;
  totalLoads: number;
  onTime: number; // %
  joinedDate: string;
}

const INITIAL: Driver[] = [
  { id: "D-001", name: "Marcus Webb",      phone: "+1 713 555 0121", email: "m.webb@oceanflex.test",     licenseNo: "TX-DL-881234", licenseExpiry: "2026-08-01", passportNo: "US-998823411", passportExpiry: "2028-03-15", vehicle: "V-001 · TX-4821", currentLoad: "SHP-0041", status: "driving",   totalLoads: 142, onTime: 94, joinedDate: "2022-03-10" },
  { id: "D-002", name: "Elena Sorokina",   phone: "+49 30 555 9922",  email: "e.sorokina@oceanflex.test", licenseNo: "DE-DL-220981", licenseExpiry: "2027-01-20", passportNo: "RU-441982001", passportExpiry: "2027-11-05", vehicle: "V-004 · NY-7753", currentLoad: "SHP-0034", status: "available", totalLoads: 98,  onTime: 97, joinedDate: "2023-01-15" },
  { id: "D-003", name: "Tariq Al-Rashid", phone: "+1 832 555 4411",  email: "t.alrashid@oceanflex.test", licenseNo: "TX-DL-774512", licenseExpiry: "2025-12-01", passportNo: "AE-882001233", passportExpiry: "2026-06-30", vehicle: "V-005 · TX-6612", currentLoad: "SHP-0038", status: "resting",   totalLoads: 210, onTime: 91, joinedDate: "2021-07-22" },
  { id: "D-004", name: "Jin Soo Park",    phone: "+82 2 555 3310",   email: "j.park@oceanflex.test",     licenseNo: "KR-DL-119203", licenseExpiry: "2026-05-18", passportNo: "KR-201923881", passportExpiry: "2028-01-20", vehicle: "V-002 · CA-9034", currentLoad: "SHP-0039", status: "driving",   totalLoads: 167, onTime: 89, joinedDate: "2022-09-01" },
  { id: "D-005", name: "Amara Diallo",    phone: "+33 1 555 8876",   email: "a.diallo@oceanflex.test",   licenseNo: "FR-DL-882211", licenseExpiry: "2027-04-10", passportNo: "SN-441002992", passportExpiry: "2029-08-12", vehicle: null,              currentLoad: null,       status: "available", totalLoads: 55,  onTime: 98, joinedDate: "2024-02-18" },
];

const STATUS_META: Record<DriverStatus, { label: string; tone: "green" | "blue" | "amber" | "slate" | "red"; dot: string }> = {
  available: { label: "Available", tone: "green", dot: "bg-emerald-500" },
  assigned:  { label: "Assigned",  tone: "blue",  dot: "bg-blue-500"   },
  driving:   { label: "Driving",   tone: "blue",  dot: "bg-indigo-500" },
  resting:   { label: "Resting",   tone: "amber", dot: "bg-amber-500"  },
  inactive:  { label: "Inactive",  tone: "slate", dot: "bg-slate-400"  },
};

export function Drivers() {
  const { t } = useI18n();
  const [drivers, setDrivers]   = useState<Driver[]>(INITIAL);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "all">("all");
  const [selected, setSelected] = useState<Driver | null>(INITIAL[0]);
  const [editing, setEditing]   = useState(false);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState<Partial<Driver>>({});

  const shown = drivers.filter((d) => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const available = drivers.filter((d) => d.status === "available").length;
  const onDuty    = drivers.filter((d) => d.status === "driving" || d.status === "assigned").length;

  function openEdit(d: Driver) { setEditing(true); setForm({ ...d }); }
  function openAdd()           { setAdding(true);  setForm({ status: "available" }); }

  function save() {
    if (editing && selected) {
      setDrivers((prev) => prev.map((d) => d.id === selected.id ? { ...d, ...form } as Driver : d));
      setSelected((s) => s ? { ...s, ...form } as Driver : s);
      setEditing(false);
    } else {
      const newD: Driver = {
        id: `D-00${drivers.length + 1}`,
        name: form.name ?? "", phone: form.phone ?? "", email: form.email ?? "",
        licenseNo: form.licenseNo ?? "", licenseExpiry: form.licenseExpiry ?? "",
        passportNo: form.passportNo ?? "", passportExpiry: form.passportExpiry ?? "",
        vehicle: null, currentLoad: null,
        status: (form.status ?? "available") as DriverStatus,
        totalLoads: 0, onTime: 100, joinedDate: new Date().toISOString().split("T")[0],
      };
      setDrivers((prev) => [...prev, newD]);
      setAdding(false);
    }
  }

  function f(k: keyof Driver, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  function toggleActive(d: Driver) {
    const next = d.status === "inactive" ? "available" : "inactive";
    setDrivers((prev) => prev.map((x) => x.id === d.id ? { ...x, status: next } : x));
    if (selected?.id === d.id) setSelected((s) => s ? { ...s, status: next } : s);
  }

  const isModalOpen = editing || adding;
  function closeModal() { setEditing(false); setAdding(false); }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Pill label={t("nav.drivers")} value={drivers.length} color="text-slate-900" />
        <Pill label={t("status.available")} value={available} color="text-emerald-600" />
        <Pill label={t("status.driving")} value={onDuty} color="text-blue-600" />
        <Pill label={t("analytics.onTimeRate")} value={`${Math.round(drivers.reduce((s,d)=>s+d.onTime,0)/drivers.length)}%`} color="text-brand-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("drivers.search")}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(["all", "available", "driving", "resting", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                statusFilter === s ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? t("common.all") : t(`status.${s}`)}
            </button>
          ))}
        </div>
        <Button className="ml-auto" size="sm" onClick={openAdd}>
          <Plus size={15} /> {t("drivers.add")}
        </Button>
      </div>

      {/* Split pane */}
      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {/* List */}
        <div className="w-72 shrink-0 divide-y divide-slate-50 overflow-y-auto border-r border-slate-100">
          {shown.map((d) => {
            const meta = STATUS_META[d.status];
            return (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 ${selected?.id === d.id ? "bg-brand-50" : ""}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <User size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.currentLoad ?? "No active load"}</p>
                </div>
                <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
              </button>
            );
          })}
        </div>

        {/* Detail */}
        {selected && (() => {
          const meta = STATUS_META[selected.status];
          const expiringSoon = new Date(selected.licenseExpiry) < new Date(Date.now() + 90 * 86400000);
          return (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                  <p className="text-sm text-slate-500">{selected.id} · Joined {selected.joinedDate}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={meta.tone}>
                    <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {t(`status.${selected.status}`)}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => openEdit(selected)}>Edit</Button>
                  <Button variant={selected.status === "inactive" ? "subtle" : "ghost"} size="sm" onClick={() => toggleActive(selected)}>
                    {selected.status === "inactive" ? "Activate" : "Deactivate"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Contact */}
                <Section title={t("drivers.phone")}>
                  <Row label={t("drivers.phone")} value={<a href={`tel:${selected.phone}`} className="flex items-center gap-1 text-brand-600 hover:underline"><Phone size={12}/>{selected.phone}</a>} />
                  <Row label={t("login.email")} value={selected.email} />
                </Section>

                {/* Documents */}
                <Section title="Documents">
                  <Row label="License #"       value={selected.licenseNo} />
                  <Row label="License expiry"  value={
                    <span className={expiringSoon ? "font-semibold text-red-600" : ""}>{selected.licenseExpiry}</span>
                  } />
                  <Row label="Passport #"      value={selected.passportNo} />
                  <Row label="Passport expiry" value={selected.passportExpiry} />
                </Section>

                {/* Assignment */}
                <Section title={t("drivers.assignment")}>
                  <Row label={t("common.vehicle")} value={selected.vehicle ?? t("dispatch.unassigned")} />
                  <Row label="Active load"  value={selected.currentLoad ?? "None"} />
                </Section>

                {/* Performance */}
                <Section title="Performance">
                  <Row label="Total loads"   value={selected.totalLoads} />
                  <Row label={t("analytics.onTimeRate")} value={
                    <span className={selected.onTime >= 95 ? "text-emerald-600 font-semibold" : selected.onTime >= 85 ? "text-amber-600 font-semibold" : "text-red-600 font-semibold"}>
                      {selected.onTime}%
                    </span>
                  } />
                </Section>
              </div>

              {expiringSoon && (
                <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200">
                  <p className="text-sm font-medium text-red-700">
                    License expires {selected.licenseExpiry} — renewal required within 90 days.
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Modal */}
      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editing ? `${t("common.view")} ${selected?.name}` : t("drivers.add")}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={save}>{t("drivers.save")}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full name" className="col-span-2">
            <Input value={form.name ?? ""} onChange={(e) => f("name", e.target.value)} placeholder="Marcus Webb" />
          </Field>
          <Field label={t("drivers.phone")}><Input value={form.phone ?? ""} onChange={(e) => f("phone", e.target.value)} placeholder="+1 713 555 0121" /></Field>
          <Field label={t("login.email")}><Input type="email" value={form.email ?? ""} onChange={(e) => f("email", e.target.value)} placeholder="driver@carrier.com" /></Field>
          <Field label="License number"><Input value={form.licenseNo ?? ""} onChange={(e) => f("licenseNo", e.target.value)} /></Field>
          <Field label="License expiry"><Input type="date" value={form.licenseExpiry ?? ""} onChange={(e) => f("licenseExpiry", e.target.value)} /></Field>
          <Field label="Passport number"><Input value={form.passportNo ?? ""} onChange={(e) => f("passportNo", e.target.value)} /></Field>
          <Field label="Passport expiry"><Input type="date" value={form.passportExpiry ?? ""} onChange={(e) => f("passportExpiry", e.target.value)} /></Field>
          <Field label={t("common.status")} className="col-span-2">
            <Select value={form.status ?? "available"} onChange={(e) => f("status", e.target.value)}>
              <option value="available">{t("status.available")}</option>
              <option value="assigned">{t("status.assigned")}</option>
              <option value="resting">{t("status.resting")}</option>
              <option value="inactive">{t("status.inactive")}</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right text-xs font-medium text-slate-800">{value}</span>
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
