import { Check, LogOut, Monitor, Palette, RotateCcw } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Badge";
import { useI18n } from "@/i18n/LanguageContext";
import { useAuth } from "@/api/AuthContext";
import { LANGUAGES } from "@/i18n/translations";
import { ACCENTS, DENSITIES, useTheme } from "@/theme/ThemeContext";
import { cn } from "@/lib/utils";

export function Settings() {
  const { t, lang, setLang } = useI18n();
  const auth = useAuth();
  const { accent, density, setAccent, setDensity, reset } = useTheme();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Palette size={16} className="text-brand-600" /> {t("settings.appearance")}
            </span>
          }
          subtitle={t("settings.appearanceHint")}
          action={
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw size={14} /> {t("settings.reset")}
            </Button>
          }
        />
        <CardBody className="space-y-6">
          {/* Accent */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">{t("settings.accent")}</p>
            <div className="flex flex-wrap gap-2.5">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAccent(a.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                    accent === a.id
                      ? "border-slate-300 bg-slate-50 text-slate-900 ring-2 ring-brand-500/30"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <span
                    className="h-4 w-4 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: a.swatch, boxShadow: `0 0 0 1px ${a.swatch}55` }}
                  />
                  {a.label}
                  {accent === a.id && <Check size={14} className="text-brand-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">{t("settings.density")}</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {DENSITIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDensity(d.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition",
                    density === d.id
                      ? "border-brand-300 bg-brand-50/50 ring-1 ring-brand-200"
                      : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{d.label}</span>
                    {density === d.id && <Check size={15} className="text-brand-600" />}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{d.hint}</p>
                  {/* mini density preview */}
                  <div className="mt-2.5 space-y-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded bg-slate-200/70"
                        style={{ height: d.id === "compact" ? 4 : d.id === "comfortable" ? 9 : 6 }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">{t("settings.preview")}</p>
            <Card className="bg-slate-50/60">
              <CardHeader title="EPL-2026-0001" subtitle="Shanghai → Rotterdam · Ocean" action={<StatusPill status="in_transit" />} />
              <CardBody className="flex items-center gap-3">
                <Button size="sm">{t("topbar.newShipment")}</Button>
                <Button size="sm" variant="outline">
                  {t("settings.preview")}
                </Button>
                <span className="ml-auto text-sm font-semibold text-brand-600">$8,348</span>
              </CardBody>
            </Card>
          </div>
        </CardBody>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Monitor size={16} className="text-brand-600" /> {t("settings.language")}
            </span>
          }
          subtitle={t("settings.languageHint")}
        />
        <CardBody>
          <div className="flex flex-wrap gap-2.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  lang === l.code
                    ? "border-brand-300 bg-brand-50/60 text-slate-900 ring-1 ring-brand-200"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                <span className="text-base leading-none">{l.flag}</span>
                {l.native}
                {lang === l.code && <Check size={15} className="text-brand-600" />}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Account */}
      {auth.live && (
        <Card>
          <CardHeader title={t("settings.account")} />
          <CardBody>
            <Button variant="danger" onClick={() => void auth.logout()}>
              <LogOut size={16} /> {t("settings.signOut")}
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
