import { useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { ApiError } from "@epl/sdk";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/api/AuthContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useI18n } from "@/i18n/LanguageContext";

const DEMO_EMAIL = "broker@clearance.test";
const DEMO_PASSWORD = "broker123";

export function Login() {
  const auth = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(auth.live ? "" : DEMO_EMAIL);
  const [password, setPassword] = useState(auth.live ? "" : DEMO_PASSWORD);
  const [tenantSlug, setTenantSlug] = useState("");
  const [form, setForm] = useState({
    name: "",
    tenantName: "",
    vatNumber: "",
    country: "Uzbekistan",
    city: "Tashkent",
    address: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await auth.login(email, password, tenantSlug.trim() || undefined);
      } else {
        await auth.register({ email, password, ...form });
      }
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : t("login.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-teal-900 p-4">
      <div className="absolute right-5 top-5"><LanguageSwitcher dark /></div>
      <div className="w-full max-w-lg py-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo variant="full" size={52} />
          <span className="mt-1 rounded-full bg-teal-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-300 ring-1 ring-teal-700">
            {t("login.portal")}
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <Tabs
            variant="pill"
            className="mb-5"
            active={mode}
            onChange={(value) => { setMode(value as "login" | "register"); setError(null); }}
            items={[{ id: "login", label: "Sign in" }, { id: "register", label: "Create broker company" }]}
          />
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-teal-900/40 px-4 py-3 ring-1 ring-teal-700/50">
            <Shield size={15} className="shrink-0 text-teal-400" />
            <p className="text-xs text-teal-300">
              {auth.live ? "Uses the shared EPL Move identity and company directory." : t("login.demo")}
            </p>
          </div>

          {error && <div className="mb-4 rounded-lg bg-red-900/30 px-3 py-2.5 text-sm text-red-300 ring-1 ring-red-700/50">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            {mode === "register" && (
              <>
                <DarkField label="Your name"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></DarkField>
                <DarkField label="Broker company"><Input value={form.tenantName} onChange={(event) => setForm((current) => ({ ...current, tenantName: event.target.value }))} /></DarkField>
              </>
            )}
            <DarkField label={t("login.email")}><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></DarkField>
            <DarkField label={t("login.password")}><Input type="password" value={password} minLength={8} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void submit()} /></DarkField>
            {mode === "login" ? (
              <div className="sm:col-span-2">
                <DarkField label="Company slug (optional)"><Input value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)} placeholder="Required only if this email belongs to several companies" /></DarkField>
              </div>
            ) : (
              <>
                <DarkField label="VAT / TIN (9 digits)"><Input inputMode="numeric" maxLength={9} value={form.vatNumber} onChange={(event) => setForm((current) => ({ ...current, vatNumber: event.target.value.replace(/\D/g, "") }))} /></DarkField>
                <DarkField label="Phone"><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></DarkField>
                <DarkField label="Country"><Input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} /></DarkField>
                <DarkField label="City"><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></DarkField>
                <div className="sm:col-span-2"><DarkField label="Registered address"><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></DarkField></div>
              </>
            )}
            <Button className="w-full bg-teal-600 hover:bg-teal-700 sm:col-span-2" disabled={busy} onClick={() => void submit()}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : mode === "login" ? t("login.submit") : "Create broker company"}
            </Button>
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">{t("login.footer")}</p>
        </div>
      </div>
    </div>
  );
}

function DarkField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Field label={<span className="text-slate-300">{label}</span>}>
      <div className="[&_input]:border-white/10 [&_input]:bg-white/10 [&_input]:text-white [&_input]:placeholder:text-slate-500 [&_input:focus]:border-teal-500 [&_input:focus]:ring-teal-500/30">
        {children}
      </div>
    </Field>
  );
}
