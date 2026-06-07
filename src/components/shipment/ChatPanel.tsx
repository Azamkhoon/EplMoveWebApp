import { useEffect, useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import type { ChatMessage } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatPanel({
  initial,
  carrier,
}: {
  initial: ChatMessage[];
  carrier: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg: ChatMessage = {
      id: `M-${Date.now()}`,
      author: "You",
      role: "shipper",
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, msg]);
    setText("");
    // Simulate a carrier reply
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `M-${Date.now() + 1}`,
          author: carrier,
          role: "carrier",
          text: "Thanks for your message — our ops team will follow up shortly.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }, 1400);
  }

  return (
    <div className="flex h-[460px] flex-col overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <Avatar name={carrier === "—" ? "EPL Move" : carrier} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {carrier === "—" ? "EPL Move Support" : carrier}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 px-4 py-4 scrollbar-thin">
        {messages.map((m) => {
          if (m.role === "system") {
            return (
              <div key={m.id} className="flex justify-center">
                <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs text-slate-500">
                  {m.text}
                </span>
              </div>
            );
          }
          const mine = m.role === "shipper";
          return (
            <div
              key={m.id}
              className={cn("flex items-end gap-2", mine && "flex-row-reverse")}
            >
              <Avatar name={m.author} size="sm" />
              <div className={cn("max-w-[75%]", mine && "items-end")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-sm",
                    mine
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                  )}
                >
                  {m.text}
                </div>
                <p
                  className={cn(
                    "mt-1 text-[11px] text-slate-400",
                    mine ? "text-right" : "text-left"
                  )}
                >
                  {m.author} · {timeLabel(m.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-3">
        <button className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
          <Paperclip size={18} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          onClick={send}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
          disabled={!text.trim()}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
