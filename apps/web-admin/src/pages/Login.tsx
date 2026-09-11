import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAuth } from "@/api/AuthContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useI18n } from "@/i18n/LanguageContext";

const DEMO_EMAIL    = "admin@epl-move.internal";
const DEMO_PASSWORD = "admin123";

export function Login() {
  const auth = useAuth();
  const { t } = useI18n();
  const [email, setEmail]       = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    try { await auth.login(email, password); }
    catch { setError(t("login.error")); }
    finally { setBusy(false); }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-brand-900 p-4">
      <div className="absolute right-5 top-5"><LanguageSwitcher dark /></div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={56} />
          <span className="rounded-full bg-brand-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-300 ring-1 ring-brand-700">
            {t("login.portal")}
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-brand-900/40 px-4 py-3 ring-1 ring-brand-700/50">
            <ShieldCheck size={15} className="shrink-0 text-brand-400" />
            <p className="text-xs text-brand-300">
              {t("login.demo")}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-900/30 px-3 py-2.5 text-sm text-red-300 ring-1 ring-red-700/50">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Field label={<span className="text-slate-300">{t("login.email")}</span>}>
              <Input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-white/10 text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-brand-500/30"
              />
            </Field>
            <Field label={<span className="text-slate-300">{t("login.password")}</span>}>
              <Input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-white/10 text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-brand-500/30"
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </Field>
            <Button className="w-full bg-brand-600 hover:bg-brand-700" disabled={busy} onClick={() => void submit()}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : t("login.submit")}
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            {t("login.footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
