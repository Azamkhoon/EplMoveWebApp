import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/api/AuthContext";
import { ApiError } from "@epl/sdk";

type Mode = "login" | "register";

export function Login() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="mb-2 flex justify-center">
          <Logo variant="full" size={56} />
        </div>
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
          Carrier Portal
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
              { id: "login", label: "Sign in" },
              { id: "register", label: "Register fleet" },
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
                <Field label="Your name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Operations lead" />
                </Field>
                <Field label="Carrier company">
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. OceanFlex Lines"
                  />
                </Field>
              </>
            )}
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@carrier.com"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button
              className="w-full"
              disabled={busy}
              onClick={() =>
                run(() =>
                  mode === "login"
                    ? auth.login(email, password)
                    : auth.register({ email, password, name, tenantName: company }),
                )
              }
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : mode === "login" ? "Sign in" : "Create carrier account"}
            </Button>
            {mode === "register" && (
              <p className="text-center text-xs text-slate-400">
                Registers your company as a carrier — you can browse the marketplace and bid immediately.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
