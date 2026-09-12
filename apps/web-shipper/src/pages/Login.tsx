import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Loader2,
  Package,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/api/AuthContext";
import { ApiError } from "@epl/sdk";
import { LANGUAGES } from "@/i18n/translations";
import { useI18n } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

type Role = "customer" | "carrier" | "broker";
type AuthMode = "signin" | "signup";

const GOLD = "#c8a24a";

const PORTAL_URLS: Record<Role, string> = {
  customer: "/",
  carrier: import.meta.env.VITE_PORTAL_CARRIER_URL ?? "http://localhost:5174",
  broker: import.meta.env.VITE_PORTAL_BROKER_URL ?? "http://localhost:5175",
};


const KIND_MAP: Record<Role, "shipper" | "carrier" | "broker"> = {
  customer: "shipper",
  carrier: "carrier",
  broker: "broker",
};

const ROLES = [
  {
    id: "customer" as Role,
    title: "Customer",
    subtitle: "Shipper Portal",
    description: "Post loads, track shipments and manage your logistics operations.",
    Icon: Package,
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-700",
    cardBorder: "border-blue-500/20 hover:border-blue-400/50",
    badge: "bg-blue-500/15 text-blue-300",
    tabActive: "bg-blue-500",
  },
  {
    id: "carrier" as Role,
    title: "Carrier",
    subtitle: "Freight Portal",
    description: "Browse available loads, manage your fleet and grow your earnings.",
    Icon: Truck,
    iconBg: "bg-gradient-to-br from-amber-500 to-amber-700",
    cardBorder: "border-amber-500/20 hover:border-amber-400/50",
    badge: "bg-amber-500/15 text-amber-300",
    tabActive: "bg-amber-500",
  },
  {
    id: "broker" as Role,
    title: "Customs Broker",
    subtitle: "Broker Portal",
    description: "Handle declarations, compliance checks and customs clearance.",
    Icon: FileText,
    iconBg: "bg-gradient-to-br from-teal-500 to-teal-700",
    cardBorder: "border-teal-500/20 hover:border-teal-400/50",
    badge: "bg-teal-500/15 text-teal-300",
    tabActive: "bg-teal-500",
  },
] as const;

export function Login() {
  const auth = useAuth();
  const { lang, setLang } = useI18n();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    tenantName: "",
    vatNumber: "",
    country: "Uzbekistan",
    city: "",
    address: "",
    phone: "",
  });

  function setField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function pickRole(r: Role) {
    setSelectedRole(r);
    setError(null);
    setAuthMode("signin");
    setForm({ email: "", password: "", name: "", tenantName: "", vatNumber: "", country: "Uzbekistan", city: "", address: "", phone: "" });
  }

  function goBack() {
    setSelectedRole(null);
    setError(null);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!selectedRole) return;
    await run(async () => {
      if (authMode === "signin") {
        await auth.login(form.email, form.password);
      } else {
        await auth.register({
          email: form.email,
          password: form.password,
          name: form.name,
          tenantName: form.tenantName,
          vatNumber: form.vatNumber,
          country: form.country,
          city: form.city,
          address: form.address,
          phone: form.phone,
          kind: KIND_MAP[selectedRole],
        });
      }
      if (selectedRole !== "customer") {
        window.location.href = PORTAL_URLS[selectedRole];
      }
    });
  }


  const activeRole = ROLES.find((r) => r.id === selectedRole);

  return (
    <div className="relative flex min-h-screen flex-col" style={{ backgroundColor: "#0b1a2e" }}>
      {/* Subtle dot-grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(${GOLD} 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
      {/* Soft radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full opacity-10"
        style={{ background: `radial-gradient(ellipse at center, ${GOLD}, transparent 70%)` }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <BrandMark />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as typeof lang)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} className="bg-slate-900 text-white">
              {l.flag} {l.native}
            </option>
          ))}
        </select>
      </header>

      {/* Content */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">

        {/* ── Step 1: Role selection ── */}
        {!selectedRole && (
          <div className="w-full max-w-3xl animate-fade-in">
            <div className="mb-12 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Global Logistics Platform
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Welcome to{" "}
                <span style={{ color: GOLD }}>EPL Move</span>
              </h1>
              <p className="mt-4 text-base text-slate-400 sm:text-lg">
                World Connected · Choose your portal to sign in or create an account
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => pickRole(role.id)}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border p-6 text-left",
                    "bg-white/[0.04] backdrop-blur-sm transition-all duration-200",
                    "hover:bg-white/[0.08] hover:scale-[1.02] hover:shadow-2xl",
                    role.cardBorder,
                  )}
                >
                  <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-xl", role.iconBg)}>
                    <role.Icon size={22} className="text-white" />
                  </div>
                  <span className={cn("mb-1 inline-block self-start rounded-full px-2.5 py-0.5 text-xs font-medium", role.badge)}>
                    {role.subtitle}
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-white">{role.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{role.description}</p>
                  <div className="mt-5 flex items-center gap-1 text-sm font-medium text-white/50 transition-colors group-hover:text-white">
                    Get started
                    <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Auth form ── */}
        {selectedRole && activeRole && (
          <div className="w-full max-w-md animate-fade-in">
            <button
              onClick={goBack}
              className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-white"
            >
              <ArrowLeft size={14} />
              Back to portal selection
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur-sm">
              {/* Role badge at top */}
              <div className="mb-6 flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", activeRole.iconBg)}>
                  <activeRole.Icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {activeRole.subtitle}
                  </p>
                  <p className="text-base font-bold text-white">{activeRole.title}</p>
                </div>
              </div>

              {/* Sign In / Sign Up toggle */}
              <div className="mb-6 flex rounded-xl bg-white/[0.06] p-1">
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setAuthMode(m); setError(null); }}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
                      authMode === m
                        ? "bg-white text-slate-900 shadow"
                        : "text-slate-500 hover:text-slate-300",
                    )}
                  >
                    {m === "signin" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {/* Sign Up extra fields */}
                {authMode === "signup" && (
                  <>
                    <DarkField
                      label="Full name"
                      value={form.name}
                      onChange={(v) => setField("name", v)}
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                    <DarkField
                      label="Company name"
                      value={form.tenantName}
                      onChange={(v) => setField("tenantName", v)}
                      placeholder="Company Ltd."
                      autoComplete="organization"
                    />
                    <DarkField
                      label="VAT / TIN"
                      value={form.vatNumber}
                      onChange={(v) => setField("vatNumber", v.replace(/\D/g, ""))}
                      placeholder="9-digit number"
                      inputMode="numeric"
                      maxLength={9}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <DarkField
                        label="Country"
                        value={form.country}
                        onChange={(v) => setField("country", v)}
                      />
                      <DarkField
                        label="City"
                        value={form.city}
                        onChange={(v) => setField("city", v)}
                      />
                    </div>
                    <DarkField
                      label="Address"
                      value={form.address}
                      onChange={(v) => setField("address", v)}
                      placeholder="Registered address"
                      autoComplete="street-address"
                    />
                    <DarkField
                      label="Phone"
                      type="tel"
                      value={form.phone}
                      onChange={(v) => setField("phone", v)}
                      placeholder="+998 XX XXX XX XX"
                      autoComplete="tel"
                    />
                  </>
                )}

                <DarkField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => setField("email", v)}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
                <DarkField
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(v) => setField("password", v)}
                  placeholder="••••••••"
                  autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                />

                <Button
                  className="mt-1 w-full"
                  disabled={busy}
                  onClick={handleSubmit}
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                  {authMode === "signin" ? "Sign In" : "Create Account"}
                </Button>


                {authMode === "signup" && (
                  <p className="text-center text-xs text-slate-600">
                    By creating an account you agree to our Terms of Service.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 py-4 text-center text-xs text-slate-700">
        © {new Date().getFullYear()} EPL Move · World Connected
      </footer>
    </div>
  );
}

/* ── Helpers ── */

function BrandMark() {
  const NAVY = "#0b1a2e";
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* Emblem (reused from Logo component's SVG) */}
      <svg width={40} height={40} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke={GOLD} strokeWidth="1.5" fill="none" opacity="0.9">
          <circle cx="56" cy="50" r="33" />
          <ellipse cx="56" cy="50" rx="13" ry="33" />
          <ellipse cx="56" cy="50" rx="26" ry="33" />
          <line x1="23" y1="50" x2="89" y2="50" />
          <path d="M27 37 q29 -9 58 0" />
          <path d="M27 63 q29 9 58 0" />
        </g>
        <path d="M10 58 C 36 47, 50 69, 74 57 S 100 51, 112 55" stroke={NAVY} strokeWidth="6.5" strokeLinecap="round" fill="none" />
        <path d="M12 67 C 38 57, 54 78, 80 66 S 102 62, 110 64" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M24 34 l13 4 l5 -7 l3 1 l-2 8 l8 2 l3 -3 l2 1 l-4 6 l-6 1 l-8 -1 l-3 4 l-3 -1 l1 -5 l-10 -3 z" fill={NAVY} />
        <g fill={NAVY}>
          <rect x="50" y="38" width="15" height="10" rx="1.5" />
          <path d="M65 41 h5.5 l4 4 v3 h-9.5 z" />
          <circle cx="55.5" cy="49.5" r="2.4" fill={GOLD} />
          <circle cx="69" cy="49.5" r="2.4" fill={GOLD} />
        </g>
        <g fill={NAVY}>
          <rect x="86" y="64" width="14" height="6" rx="1" />
          <path d="M84 70 h19 l-3 6 h-13 z" />
          <rect x="89" y="58" width="2.4" height="6" />
          <rect x="93.5" y="58" width="2.4" height="6" />
        </g>
      </svg>
      <span className="leading-none">
        <span className="block text-xl font-extrabold tracking-tight text-white">
          EPL <span style={{ color: GOLD }}>M</span>
          <span className="text-white">OVE</span>
        </span>
        <span className="block text-[9px] font-medium uppercase tracking-[0.28em] text-slate-500">
          World Connected
        </span>
      </span>
    </span>
  );
}

function DarkField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  maxLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-sm text-white placeholder:text-slate-600 transition focus:border-white/25 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/20"
      />
    </div>
  );
}
