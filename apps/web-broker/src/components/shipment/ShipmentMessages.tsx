import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { ApiError, type ShipmentMessage } from "@epl/sdk";
import { api } from "@/api/client";

export function ShipmentMessages({ shipmentId }: { shipmentId: string }) {
  const [messages, setMessages] = useState<ShipmentMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    let active = true;
    const refresh = () => api!.listShipmentMessages(shipmentId).then((next) => { if (active) setMessages(next); }).catch(() => undefined);
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [shipmentId]);

  async function send() {
    if (!api || !text.trim()) return;
    setBusy(true); setError(null);
    try {
      const sent = await api.sendShipmentMessage(shipmentId, { body: text.trim() });
      setMessages((current) => [...current, sent]);
      setText("");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Message could not be sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-7">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Shipment messages</h3>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="max-h-56 space-y-2 overflow-y-auto bg-slate-50/50 p-3">
          {messages.length === 0 && <p className="py-5 text-center text-xs text-slate-400">No messages yet.</p>}
          {messages.map((message) => {
            const mine = message.senderRole.startsWith("broker_");
            return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${mine ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}><p>{message.body}</p><p className={`mt-1 text-[10px] ${mine ? "text-white/60" : "text-slate-400"}`}>{message.senderName} · {new Date(message.createdAt).toLocaleString()}</p></div></div>;
          })}
        </div>
        <div className="flex gap-2 border-t border-slate-100 bg-white p-2"><input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void send()} placeholder="Message shipment participants…" className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs focus:border-teal-400 focus:outline-none" /><button disabled={busy || !text.trim()} onClick={() => void send()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button></div>
        {error && <p className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
