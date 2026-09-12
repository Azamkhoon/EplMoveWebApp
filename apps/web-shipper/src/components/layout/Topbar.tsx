import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Globe, LogOut, Plus, Search, Settings as SettingsIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PortalSwitcher } from "@/components/ui/PortalSwitcher";
import { useI18n } from "@/i18n/LanguageContext";
import { useAuth } from "@/api/AuthContext";
import { LANGUAGES } from "@/i18n/translations";
import { NotificationBell } from "@/components/ui/NotificationBell";

const PAGE_KEYS: Record<string, string> = {
  "/": "dashboard",
  "/shipments": "shipments",
  "/tracking": "tracking",
  "/marketplace": "marketplace",
  "/documents": "documents",
  "/invoices": "invoices",
  "/quotation": "quotation",
  "/load-calculator": "loadCalculator",
  "/rate-estimator": "rateEstimator",
  "/settings": "settings",
};

export function Topbar({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const key = pathname.startsWith("/shipments")
    ? "/shipments"
    : pathname.startsWith("/tracking")
      ? "/tracking"
      : pathname;
  const page = PAGE_KEYS[key] ?? "dashboard";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
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
          onClick={() => navigate("/post-load")}
        >
          <Plus size={16} />
          {t("topbar.newShipment")}
        </Button>

        <PortalSwitcher current="shipper" />

        <LanguageSwitcher />

        <NotificationBell />

        <AccountMenu />
      </div>
    </header>
  );
}

function AccountMenu() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const auth = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-2.5 transition hover:bg-slate-50"
      >
        <Avatar name="My account" size="sm" />
        <div className="hidden leading-tight lg:block">
          <p className="text-sm font-medium text-slate-800">My account</p>
          <p className="text-[11px] text-slate-400">Customer · Pro</p>
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-52 animate-fade-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-card-hover">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/settings");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <SettingsIcon size={15} className="text-slate-400" />
              {t("nav.settings")}
            </button>
            {auth.live && (
              <button
                onClick={async () => {
                  setOpen(false);
                  await auth.logout();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={15} />
                {t("settings.signOut")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
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
