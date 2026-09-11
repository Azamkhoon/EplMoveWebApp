import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/api/AuthContext";
import { ApiError } from "@epl/sdk";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useI18n } from "@/i18n/LanguageContext";

const DEMO_EMAIL = "carrier@oceanflex.test";
const DEMO_PASSWORD = "carrier123";

type Mode = "login" | "register";

export function Login() {
  const auth = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState(auth.live ? "" : DEMO_EMAIL);
  const [password, setPassword] = useState(auth.live ? "" : DEMO_PASSWORD);
  const [tenantSlug, setTenantSlug] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [companyDetails, setCompanyDetails] = useState({
    vatNumber: "",
    country: "Uzbekistan",
    city: "Tashkent",
    address: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("login.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="absolute right-5 top-5"><LanguageSwitcher /></div>
      <div className="w-full max-w-md">
        <div className="mb-2 flex justify-center">
          <Logo variant="full" size={56} />
        </div>
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
          {t("brand.portal")}
        </p>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <Tabs
            variant="pill"
            className="mb-5 w-full"
            active={mode}
            onChange={(m) => {
              setMode(m as Mode);
              setError(null);
            }}
            items={[
              { id: "login", label: t("login.signIn") },
              { id: "register", label: t("login.register") },
            ]}
          />

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {mode === "register" && (
              <>
                <Field label={t("login.name")}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("login.namePlaceholder")} />
                </Field>
                <Field label={t("login.company")}>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder={t("login.companyPlaceholder")}
                  />
                </Field>
              </>
            )}
            <Field label={t("login.email")}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@carrier.com"
              />
            </Field>
            <Field label={t("login.password")}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {mode === "login" && (
              <Field label="Company slug (optional)">
                <Input
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="Only needed for multi-company users"
                />
              </Field>
            )}

            {mode === "register" && (
              <>
                <Field label="VAT / TIN (9 digits)">
                  <Input
                    inputMode="numeric"
                    maxLength={9}
                    value={companyDetails.vatNumber}
                    onChange={(e) => setCompanyDetails((current) => ({ ...current, vatNumber: e.target.value.replace(/\D/g, "") }))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Country"><Input value={companyDetails.country} onChange={(e) => setCompanyDetails((current) => ({ ...current, country: e.target.value }))} /></Field>
                  <Field label="City"><Input value={companyDetails.city} onChange={(e) => setCompanyDetails((current) => ({ ...current, city: e.target.value }))} /></Field>
                </div>
                <Field label="Registered address"><Input value={companyDetails.address} onChange={(e) => setCompanyDetails((current) => ({ ...current, address: e.target.value }))} /></Field>
                <Field label="Phone"><Input value={companyDetails.phone} onChange={(e) => setCompanyDetails((current) => ({ ...current, phone: e.target.value }))} /></Field>
              </>
            )}

            <Button
              className="w-full"
              disabled={busy}
              onClick={() =>
                run(() =>
                  mode === "login"
                    ? auth.login(email, password, tenantSlug.trim() || undefined)
                    : auth.register({ email, password, name, tenantName: company, ...companyDetails }),
                )
              }
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : mode === "login" ? t("login.signIn") : t("login.create")}
            </Button>

            {mode === "login" && !auth.live && (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs text-slate-400">{t("login.or")}</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={() => run(() => auth.login(DEMO_EMAIL, DEMO_PASSWORD))}
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : t("login.demo")}
                </Button>
                <p className="text-center text-xs text-slate-400">
                  {t("login.demoHint")}
                </p>
              </>
            )}

            {mode === "register" && (
              <p className="text-center text-xs text-slate-400">
                {t("login.registerHint")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
