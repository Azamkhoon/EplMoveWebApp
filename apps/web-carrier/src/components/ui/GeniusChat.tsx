import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id:      string;
  role:    "user" | "assistant";
  text:    string;
  ts:      Date;
}

// Carrier-context mock responses when backend is offline
const MOCK_RESPONSES: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /bid|quote|price|rate/i,
    reply: "To place a competitive bid, navigate to **Marketplace** and click any open load. Review the shipper's requirements, then submit your rate including fuel surcharge. Bids under 15% above market average have the highest acceptance rate on EPL Move.",
  },
  {
    pattern: /marketplace|load|freight|cargo/i,
    reply: "The **Load Marketplace** shows all open quotes from shippers across tenants. Filter by mode (Ocean/Air/Road/Rail), origin, destination, or cargo type. You can save searches and get notified when matching loads appear.",
  },
  {
    pattern: /driver|roster|assign/i,
    reply: "Go to **Drivers** to manage your roster. You can set availability status, assign a driver to a shipment from the Dispatch Board, and view their active load history. Make sure driver documents are current before assignment.",
  },
  {
    pattern: /fleet|truck|vehicle|maintenance/i,
    reply: "The **Fleet** page shows all your vehicles with availability and maintenance status. Mark a vehicle as 'In Service' to make it available for dispatch. Schedule maintenance windows to avoid conflicts with active loads.",
  },
  {
    pattern: /dispatch|assign.*load|load.*assign/i,
    reply: "The **Dispatch Board** lets you assign drivers and vehicles to confirmed shipments in one view. Drag-and-drop or use the Assign button. The board shows ETAs, conflicts, and driver availability in real time.",
  },
  {
    pattern: /invoice|payment|revenue|finance|earn/i,
    reply: "**Financials** shows your revenue by period, outstanding invoices, and payment status. Invoices are auto-generated when a shipment is marked delivered. You can download PDFs and track which shippers have outstanding balances.",
  },
  {
    pattern: /shipment|tracking|status|delivery/i,
    reply: "Go to **Shipments** to see all your active and completed loads. Each shipment has a live status timeline — you can update milestones (picked up, in transit, at border, delivered) and the shipper is notified automatically.",
  },
  {
    pattern: /uzbekistan|tashkent|navoi|border|customs|uz/i,
    reply: "For Uzbekistan-bound freight: the main entry points are the **Tashkent dry port**, **Navoi FEZ**, and land borders at Gisht Kuprik (KZ) and Oybek (TJ). Transit time from China via rail (China–Kyrgyzstan–Uzbekistan) is typically 12–18 days. Customs clearance at Tashkent usually takes 2–5 working days.",
  },
  {
    pattern: /cis|russia|kazakhstan|kyrgyzstan/i,
    reply: "EPL Move supports CIS corridor freight. For Russia and Kazakhstan origins, CIS Free Trade Area rates apply — no customs duty on most goods. Transit through Kazakhstan to Uzbekistan is the most common rail route. Document requirements: CMR, invoice, packing list, and certificate of origin.",
  },
  {
    pattern: /document|paperwork|cmr|waybill|invoice/i,
    reply: "Required documents for a typical cross-border load: **Commercial Invoice**, **Packing List**, **CMR** (road) or **Bill of Lading** (ocean), and **Certificate of Origin**. For Uzbekistan imports, add a Phytosanitary cert for food goods and O'zstandart conformity cert for regulated products.",
  },
  {
    pattern: /analytic|performance|win rate|kpi/i,
    reply: "Check **Analytics** for your bid win rate, on-time delivery rate, revenue trends, and top shipper relationships. The win rate chart breaks down by freight mode so you can focus on your most competitive lanes.",
  },
  {
    pattern: /setting|profile|account|password/i,
    reply: "Go to **Settings** to update your company profile, contact details, and notification preferences. You can also manage API access tokens there if you're integrating with your TMS.",
  },
  {
    pattern: /hello|hi|hey|help|start/i,
    reply: "Hello! I'm **EPL Genius**, your AI assistant for the Carrier Portal. I can help you with:\n\n• Placing bids on the marketplace\n• Managing your fleet and drivers\n• Dispatch and shipment tracking\n• Financials and invoicing\n• Cross-border freight to Uzbekistan and CIS countries\n\nWhat would you like to know?",
  },
];

function getMockReply(text: string): string {
  for (const { pattern, reply } of MOCK_RESPONSES) {
    if (pattern.test(text)) return reply;
  }
  return "I can help with bidding, marketplace loads, fleet management, dispatch, financials, and cross-border freight to Uzbekistan and CIS countries. Could you rephrase your question or pick one of those topics?";
}

function renderMarkdown(text: string) {
  // Bold **text**, newlines, bullet points
  return text
    .split("\n")
    .map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g).map((part, j) =>
        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
      );
      if (line.startsWith("• ")) {
        return <li key={i} className="ml-3 list-disc">{parts}</li>;
      }
      return <p key={i} className={line === "" ? "h-2" : ""}>{parts}</p>;
    });
}

const SUGGESTIONS = [
  "How do I bid on a load?",
  "How does dispatch work?",
  "What documents do I need for Uzbekistan?",
  "How do I add a driver?",
];

export function GeniusChat() {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [busy, setBusy]           = useState(false);
  const [minimised, setMinimised] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !minimised) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, open, minimised]);

  // Greeting on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        text: "Hello! I'm **EPL Genius**, your AI assistant. Ask me anything about the Carrier Portal — bids, dispatch, fleet, Uzbekistan freight, or anything else.",
        ts: new Date(),
      }]);
    }
  }, [open]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: text.trim(), ts: new Date() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
      if (apiUrl) {
        const token = sessionStorage.getItem("epl-carrier-access") ?? sessionStorage.getItem("epl-carrier-mock-authed");
        const res = await fetch(`${apiUrl}/genius/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.text })),
            system: "You are EPL Genius, an AI assistant embedded in the EPL Move Carrier Portal. Help carriers with: placing bids on freight loads, managing fleet and drivers, dispatch operations, shipment tracking, financials and invoicing, and cross-border freight to Uzbekistan and CIS countries. Be concise, practical, and specific. Use markdown bold for key terms.",
          }),
        });
        if (res.ok) {
          const data = await res.json() as { reply: string };
          setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: data.reply, ts: new Date() }]);
          setBusy(false);
          return;
        }
      }
    } catch {
      // fall through to mock
    }

    // Mock response with slight delay for realism
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    setMessages((m) => [...m, {
      id: `a-${Date.now()}`,
      role: "assistant",
      text: getMockReply(text),
      ts: new Date(),
    }]);
    setBusy(false);
  }

  function reset() {
    setMessages([{
      id: "welcome",
      role: "assistant",
      text: "Hello! I'm **EPL Genius**, your AI assistant. Ask me anything about the Carrier Portal — bids, dispatch, fleet, Uzbekistan freight, or anything else.",
      ts: new Date(),
    }]);
    setInput("");
  }

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => { setOpen(true); setMinimised(false); }}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-gradient-to-br from-brand-500 to-brand-700 text-white hover:scale-105 hover:shadow-xl",
          open && "scale-0 opacity-0 pointer-events-none",
        )}
        title="EPL Genius — AI Assistant"
      >
        <Sparkles size={22} />
      </button>

      {/* Chat window */}
      <div className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 origin-bottom-right",
        open ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none",
        minimised ? "h-14 w-80 overflow-hidden" : "h-[520px] w-[380px]",
      )}>
        {/* Header */}
        <div className="flex items-center gap-2.5 rounded-t-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3 text-white shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Sparkles size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-none">EPL Genius</p>
            <p className="text-[11px] opacity-70 mt-0.5">AI Carrier Assistant</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={reset} title="New conversation"
              className="rounded-lg p-1.5 hover:bg-white/20 transition-colors">
              <RotateCcw size={13} />
            </button>
            <button onClick={() => setMinimised((v) => !v)} title={minimised ? "Expand" : "Minimise"}
              className="rounded-lg p-1.5 hover:bg-white/20 transition-colors">
              <ChevronDown size={15} className={cn("transition-transform", minimised && "rotate-180")} />
            </button>
            <button onClick={() => setOpen(false)} title="Close"
              className="rounded-lg p-1.5 hover:bg-white/20 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {!minimised && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100">
                      <Sparkles size={11} className="text-brand-600" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed space-y-1",
                    msg.role === "user"
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm bg-slate-100 text-slate-800",
                  )}>
                    {renderMarkdown(msg.text)}
                    <p className={cn("text-[10px] mt-1", msg.role === "user" ? "text-white/50 text-right" : "text-slate-400")}>
                      {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex gap-2 justify-start">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100">
                    <Sparkles size={11} className="text-brand-600" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3">
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions — show when only welcome message present */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => void send(s)}
                    className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="shrink-0 border-t border-slate-100 px-3 py-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/20 transition-all">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send(input)}
                  placeholder="Ask anything…"
                  disabled={busy}
                  className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => void send(input)}
                  disabled={busy || !input.trim()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
                >
                  <Send size={12} />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-slate-400">
                EPL Genius · Powered by Claude AI
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
