import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";
import { askGenius, GENIUS_SUGGESTIONS } from "@/data/genius";
import { useGenius } from "./GeniusContext";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  pending?: boolean;
}

let mid = 0;
const nextId = () => `g-${++mid}`;

export function GeniusAssistant() {
  const { t } = useI18n();
  const { isOpen, toggle, close } = useGenius();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const pendingId = nextId();
    setMessages((m) => [
      ...m,
      { id: nextId(), role: "user", text: q },
      { id: pendingId, role: "assistant", text: t("genius.searching"), pending: true },
    ]);
    setText("");
    setBusy(true);
    const res = await askGenius(q);
    setMessages((m) =>
      m.map((msg) =>
        msg.id === pendingId
          ? { ...msg, text: res.answer, sources: res.sources, pending: false }
          : msg
      )
    );
    setBusy(false);
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={toggle}
        aria-label={t("genius.open")}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-navy-700 text-white shadow-lg shadow-brand-600/40 transition hover:scale-105 active:scale-95"
      >
        {!isOpen && (
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/40" />
        )}
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 flex h-[600px] max-h-[calc(100vh-7rem)] w-[calc(100vw-3rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-hover"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-navy-800 to-navy-900 px-4 py-3.5 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/90">
                <Sparkles size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t("genius.title")}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {t("genius.subtitle")} · {t("genius.online")}
                </p>
              </div>
              <button
                onClick={close}
                className="rounded-md p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-4 scrollbar-thin">
              {/* Greeting (always live-translated) */}
              <Bubble role="assistant">{t("genius.greeting")}</Bubble>

              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("genius.suggestionsTitle")}
                  </p>
                  {GENIUS_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <Bubble key={m.id} role="user">
                    {m.text}
                  </Bubble>
                ) : (
                  <Bubble key={m.id} role="assistant">
                    {m.pending ? (
                      <span className="flex items-center gap-2 text-slate-500">
                        <Loader2 size={14} className="animate-spin" />
                        {m.text}
                      </span>
                    ) : (
                      <>
                        <span className="whitespace-pre-line">{m.text}</span>
                        {m.sources && m.sources.length > 0 && (
                          <div className="mt-2.5 border-t border-slate-100 pt-2">
                            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              <Globe size={11} />
                              {t("genius.sources")}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {m.sources.map((src) => (
                                <span
                                  key={src}
                                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                >
                                  {src}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </Bubble>
                )
              )}
              <div ref={endRef} />
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-white px-3 py-3">
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask(text)}
                  placeholder={t("genius.placeholder")}
                  className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  onClick={() => ask(text)}
                  disabled={!text.trim() || busy}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                {t("genius.disclaimer")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  const mine = role === "user";
  return (
    <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
      {!mine && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-navy-700 text-white">
          <Sparkles size={14} />
        </span>
      )}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm",
          mine
            ? "rounded-br-sm bg-brand-600 text-white"
            : "rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
        )}
      >
        {children}
      </div>
    </div>
  );
}
