import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Gavel,
  LayoutDashboard,
  LogOut,
  Settings,
  Ship,
  Store,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/api/AuthContext";
import { useTheme } from "@/theme/ThemeContext";

const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/dispatch", label: "Dispatch Board", icon: Zap },
      { to: "/shipments", label: "Shipments", icon: Ship },
    ],
  },
  {
    label: "Freight",
    items: [
      { to: "/marketplace", label: "Marketplace", icon: Store },
      { to: "/bids", label: "My Bids", icon: Gavel },
    ],
  },
  {
    label: "Fleet",
    items: [
      { to: "/fleet", label: "Fleet", icon: Truck },
      { to: "/drivers", label: "Drivers", icon: Users },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/financials", label: "Financials", icon: CircleDollarSign },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
];

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Operations overview" },
  "/dispatch": { title: "Dispatch Board", subtitle: "Assign drivers and vehicles to active loads" },
  "/shipments": { title: "Shipments", subtitle: "Manage shipment execution" },
  "/marketplace": { title: "Load Marketplace", subtitle: "Open loads from shippers — discover and bid" },
  "/bids": { title: "My Bids", subtitle: "Your quotes, outcomes, and bid history" },
  "/fleet": { title: "Fleet Management", subtitle: "Vehicles, availability, and maintenance" },
  "/drivers": { title: "Driver Management", subtitle: "Roster, status, and assignments" },
  "/financials": { title: "Financials", subtitle: "Revenue, invoices, and payments" },
  "/analytics": { title: "Analytics", subtitle: "Performance, utilization, and win rates" },
};

export function Shell() {
  const { pathname } = useLocation();
  const auth = useAuth();
  const { sidebarCollapsed, setSidebarCollapsed } = useTheme();
  const [collapsed, setCollapsed] = useState(sidebarCollapsed);

  const page = PAGE_META[pathname] ?? PAGE_META["/"];
  const w = collapsed ? "w-16" : "w-64";

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    setSidebarCollapsed(next);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-200 bg-white transition-all duration-200",
          w,
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-3">
          <Logo variant="mark" size={36} className="shrink-0" />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                EPL M<span className="text-[#c8a24a]">O</span>VE
              </p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Carrier Portal
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              {!collapsed && (
                <p className="mb-0.5 px-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
              )}
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "group relative mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                      collapsed && "justify-center px-0",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !collapsed && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-600" />
                      )}
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span className="flex-1 truncate">{label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-slate-100 px-2 py-2 space-y-0.5">
          <NavLink
            to="/settings"
            title={collapsed ? "Settings" : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                collapsed && "justify-center px-0",
              )
            }
          >
            <Settings size={17} />
            {!collapsed && <span>Settings</span>}
          </NavLink>
          <button
            onClick={() => void auth.logout()}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut size={17} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-slate-700"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </aside>

      {/* Main */}
      <div className={cn("flex min-h-screen flex-col transition-all duration-200", collapsed ? "pl-16" : "pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md">
          <div className="min-w-0 flex-1">
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
