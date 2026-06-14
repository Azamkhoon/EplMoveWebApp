import { useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAuth } from "@/api/AuthContext";

const DEMO_EMAIL    = "broker@clearance.test";
const DEMO_PASSWORD = "broker123";

export function Login() {
  const auth = useAuth();
  const [email, setEmail]       = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    try { await auth.login(email, password); }
    catch { setError("Invalid credentials. Use the demo account or check your details."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-teal-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo variant="full" size={52} />
          <span className="mt-1 rounded-full bg-teal-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-300 ring-1 ring-teal-700">
            Customs Broker Portal
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-teal-900/40 px-4 py-3 ring-1 ring-teal-700/50">
            <Shield size={15} className="shrink-0 text-teal-400" />
            <p className="text-xs text-teal-300">
              Demo account pre-filled — click <strong>Sign in</strong> to continue
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-900/30 px-3 py-2.5 text-sm text-red-300 ring-1 ring-red-700/50">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Field label={<span className="text-slate-300">Email</span>}>
              <Input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-white/10 text-white placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/30"
              />
            </Field>
            <Field label={<span className="text-slate-300">Password</span>}>
              <Input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-white/10 text-white placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/30"
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </Field>
            <Button className="w-full bg-teal-600 hover:bg-teal-700" disabled={busy} onClick={() => void submit()}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : "Sign in to Broker Portal"}
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            EPL Move · Customs Clearance Platform · Enterprise Edition
          </p>
        </div>
      </div>
    </div>
  );
}
