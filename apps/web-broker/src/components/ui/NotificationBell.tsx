import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Notification } from "@epl/sdk";
import { api } from "@/api/client";

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (!api) return;
    const client = api;
    let active = true;
    const refresh = () =>
      client.listNotifications().then((next) => {
        if (active) setItems(next);
      }).catch(() => undefined);
    void refresh();
    const close = client.openNotificationStream((notification) => {
      if (!active) return;
      setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
    });
    const timer = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      close();
      window.clearInterval(timer);
    };
  }, []);

  const unread = useMemo(() => items.filter((item) => !item.read).length, [items]);

  async function show() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0 && api) {
      await api.markNotificationsRead().catch(() => undefined);
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => void show()}
        aria-label="Notifications"
        className={
          dark
            ? "relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/70 hover:bg-white/15"
            : "relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        }
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} aria-label="Close notifications" />
          <div className="absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-400">No notifications yet</p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setOpen(false);
                      if (item.link) navigate(item.link);
                    }}
                    className="block w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.body}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
