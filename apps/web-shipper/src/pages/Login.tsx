import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/api/AuthContext";
import { ApiError } from "@epl/sdk";
import { Logo } from "@/components/brand/Logo";
import { LANGUAGES } from "@/i18n/translations";
import { useI18n } from "@/i18n/LanguageContext";

type Mode = "login" | "register" | "otp";

export function Login() {
  const auth = useAuth();
  const { lang, setLang, t } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState<string | null>(null);

  const DEMO_EMAIL    = "demo@acme-logistics.test";
  const DEMO_PASSWORD = "demo12345";

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
    code: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="w-28" />
          <Logo variant="full" size={56} />
          <select
            value={lang}
            onChange={(event) => setLang(event.target.value as typeof lang)}
            aria-label={t("topbar.language")}
            className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.flag} {language.native}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <Tabs
            variant="pill"
            className="mb-5 w-full"
            active={mode}
            onChange={(m) => {
              setMode(m as Mode);
              setError(null);
              setOtpSent(null);
            }}
            items={[
              { id: "login", label: t("login.signIn") },
              { id: "register", label: t("login.createAccount") },
              { id: "otp", label: t("login.emailCode") },
            ]}
          />

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-3">
              <Field label={t("login.name")}>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label={t("login.company")}>
                <Input value={form.tenantName} onChange={(e) => set("tenantName", e.target.value)} />
              </Field>
              <Field label={t("login.vatNumber")} hint={t("login.vatHint")}>
                <Input
                  inputMode="numeric"
                  maxLength={9}
                  value={form.vatNumber}
                  onChange={(e) => set("vatNumber", e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("login.country")}>
                  <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
                </Field>
                <Field label={t("login.city")}>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
              </div>
              <Field label={t("login.address")}>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field label={t("login.email")}>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label={t("login.phone")}>
                <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label={t("login.password")} hint={t("login.passwordHint")}>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
              </Field>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() =>
                  run(() =>
                    auth.register({
                      email: form.email,
                      password: form.password,
                      name: form.name,
                      tenantName: form.tenantName,
                      vatNumber: form.vatNumber,
                      country: form.country,
                      city: form.city,
                      address: form.address,
                      phone: form.phone,
                    }),
                  )
                }
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {t("login.createAccount")}
              </Button>
              <p className="text-center text-xs text-slate-400">
                {t("login.verificationHint")}
              </p>
            </div>
          )}

          {mode === "login" && (
            <div className="space-y-3">
              <Field label={t("login.email")}>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={DEMO_EMAIL} />
              </Field>
              <Field label={t("login.password")}>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" />
              </Field>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => run(() => auth.login(form.email, form.password))}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {t("login.signIn")}
              </Button>
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
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {t("login.demo")}
              </Button>
              <p className="text-center text-xs text-slate-400">
                {t("login.demoHint")}
              </p>
            </div>
          )}

          {mode === "otp" && (
            <div className="space-y-3">
              <Field label={t("login.email")}>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              {!otpSent ? (
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const r = await auth.requestOtp(form.email);
                      setOtpSent(r.devCode ?? "sent");
                    })
                  }
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t("login.sendCode")}
                </Button>
              ) : (
                <>
                  {otpSent !== "sent" && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
                      {t("login.devCode")}: <span className="font-mono font-semibold">{otpSent}</span>
                    </p>
                  )}
                  <Field label={t("login.code")}>
                    <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
                  </Field>
                  <Button
                    className="w-full"
                    disabled={busy}
                    onClick={() => run(() => auth.verifyOtp(form.email, form.code))}
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                    {t("login.verify")}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
