import { useState } from "react";
import { Check, Globe } from "lucide-react";
import { useI18n } from "@/i18n/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";

export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)}
        title={t("common.language")} aria-label={t("common.language")} aria-expanded={open}
        className={dark
          ? "flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 text-white transition hover:bg-white/15"
          : "flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"}>
        <Globe size={16} />
        <span className="text-xs font-bold uppercase">{lang}</span>
      </button>
      {open && (
        <>
          <button type="button" aria-label={t("common.close")} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl">
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t("common.language")}</p>
            {LANGUAGES.map((language) => (
              <button key={language.code} type="button"
                onClick={() => { setLang(language.code); setOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition hover:bg-slate-50">
                <span>{language.flag}</span>
                <span className="flex-1 text-left font-medium">{language.native}</span>
                {language.code === lang && <Check size={15} className="text-teal-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
