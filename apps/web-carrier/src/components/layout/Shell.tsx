import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Gavel, LayoutDashboard, LogOut, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/api/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/bids", label: "My Bids", icon: Gavel },
];

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Your bidding activity at a glance" },
  "/marketplace": { title: "Marketplace", subtitle: "Open loads from shippers — bid to win" },
  "/bids": { title: "My Bids", subtitle: "Everything you've quoted, and how it went" },
};

export function Shell() {
  const { pathname } = useLocation();
  const auth = useAuth();
  const page = TITLES[pathname] ?? TITLES["/"];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-4">
          <Logo variant="mark" size={38} className="shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-extrabold tracking-tight text-slate-900">
              EPL M<span className="text-[#c8a24a]">O</span>VE
            </p>
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Carrier Portal
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Freight
          </p>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-600" />
                  )}
                  <Icon size={18} className="shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 px-3 py-3">
          <button
            onClick={() => void auth.logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900">{page.title}</h1>
            <p className="hidden truncate text-xs text-slate-500 sm:block">{page.subtitle}</p>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
