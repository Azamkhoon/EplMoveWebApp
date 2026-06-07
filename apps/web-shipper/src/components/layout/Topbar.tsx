import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Globe, Plus, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";

const PAGE_KEYS: Record<string, string> = {
  "/": "dashboard",
  "/shipments": "shipments",
  "/tracking": "tracking",
  "/quotation": "quotation",
  "/load-calculator": "loadCalculator",
};

export function Topbar({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [showNotifs, setShowNotifs] = useState(false);
  const key = pathname.startsWith("/shipments") ? "/shipments" : pathname;
  const page = PAGE_KEYS[key] ?? "dashboard";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-slate-900">
          {t(`page.${page}.title`)}
        </h1>
        <p className="hidden truncate text-xs text-slate-500 sm:block">
          {t(`page.${page}.subtitle`)}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="relative hidden md:block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            placeholder={t("topbar.search")}
            className="h-10 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <Button
          size="md"
          className="hidden sm:inline-flex"
          onClick={() => navigate("/quotation")}
        >
          <Plus size={16} />
          {t("topbar.newShipment")}
        </Button>

        <LanguageSwitcher />

        <div className="relative">
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <Bell size={18} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
          </button>
          {showNotifs && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifs(false)}
              />
              <div className="absolute right-0 top-12 z-20 w-80 animate-fade-in rounded-xl border border-slate-200 bg-white p-2 shadow-card-hover">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("topbar.notifications")}
                </p>
                {[
                  { t: "EPL-2026-0476 delayed", d: "Port congestion at Le Havre — ETA +1 day", tone: "text-red-600" },
                  { t: "New quote received", d: "Maersk Line responded to your Ocean RFQ", tone: "text-brand-600" },
                  { t: "POD uploaded", d: "EPL-2026-0455 delivered & signed", tone: "text-emerald-600" },
                ].map((n, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-50"
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.tone.replace("text", "bg")}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{n.t}</p>
                      <p className="text-xs text-slate-500">{n.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-3">
          <Avatar name="Acme Logistics" size="sm" />
          <div className="hidden leading-tight lg:block">
            <p className="text-sm font-medium text-slate-800">Acme Logistics</p>
            <p className="text-[11px] text-slate-400">Shipper · Pro</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={t("topbar.language")}
        className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
      >
        <Globe size={18} />
        <span className="text-sm font-semibold uppercase">{current.code}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-48 animate-fade-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-card-hover">
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t("topbar.language")}
            </p>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="flex-1 text-left font-medium">{l.native}</span>
                {l.code === lang && (
                  <Check size={15} className="text-brand-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
