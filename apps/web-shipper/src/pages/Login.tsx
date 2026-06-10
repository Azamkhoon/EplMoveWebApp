import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/api/AuthContext";
import { ApiError } from "@epl/sdk";
import { Logo } from "@/components/brand/Logo";

type Mode = "login" | "register" | "otp";

export function Login() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    tenantName: "",
    code: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo variant="full" size={56} />
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
              { id: "login", label: "Sign in" },
              { id: "register", label: "Create account" },
              { id: "otp", label: "Email code" },
            ]}
          />

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-3">
              <Field label="Your name">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Company / tenant name">
                <Input value={form.tenantName} onChange={(e) => set("tenantName", e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Password" hint="At least 8 characters">
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
                    }),
                  )
                }
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                Create account
              </Button>
            </div>
          )}

          {mode === "login" && (
            <div className="space-y-3">
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Password">
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
              </Field>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => run(() => auth.login(form.email, form.password))}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                Sign in
              </Button>
            </div>
          )}

          {mode === "otp" && (
            <div className="space-y-3">
              <Field label="Email">
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
                  Send code
                </Button>
              ) : (
                <>
                  {otpSent !== "sent" && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
                      Dev code: <span className="font-mono font-semibold">{otpSent}</span>
                    </p>
                  )}
                  <Field label="6-digit code">
                    <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
                  </Field>
                  <Button
                    className="w-full"
                    disabled={busy}
                    onClick={() => run(() => auth.verifyOtp(form.email, form.code))}
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                    Verify & sign in
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
