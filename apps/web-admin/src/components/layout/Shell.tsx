import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity, BarChart3, Bell, Building2, ChevronLeft, ChevronRight,
  ClipboardList, FileText, LayoutDashboard, LogOut, Settings, Shield, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/api/AuthContext";

const NAV = [
  {
    label: "Platform",
    items: [
      { to: "/",          label: "Overview",    icon: LayoutDashboard, end: true },
      { to: "/tenants",   label: "Tenants",     icon: Building2 },
      { to: "/users",     label: "Users",       icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/shipments", label: "Shipments",   icon: ClipboardList },
      { to: "/invoices",  label: "Invoices",    icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/health",    label: "Health",      icon: Activity },
      { to: "/audit",     label: "Audit Log",   icon: Shield },
      { to: "/analytics", label: "Analytics",   icon: BarChart3 },
    ],
  },
];

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/":           { title: "Platform Overview",   subtitle: "Real-time status of all tenants and services" },
  "/tenants":    { title: "Tenant Management",   subtitle: "All shipper and carrier accounts on the platform" },
  "/users":      { title: "User Management",     subtitle: "Members and their roles across all tenants" },
  "/shipments":  { title: "All Shipments",       subtitle: "Cross-tenant shipment visibility" },
  "/invoices":   { title: "All Invoices",        subtitle: "Platform-wide billing and revenue" },
  "/health":     { title: "Service Health",      subtitle: "Live status of all 12 microservices" },
  "/audit":      { title: "Audit Log",           subtitle: "Platform-wide event and action history" },
  "/analytics":  { title: "Platform Analytics",  subtitle: "Growth, revenue, and operational metrics" },
};

export function Shell() {
  const { pathname } = useLocation();
  const auth = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const page = PAGE_META[pathname] ?? PAGE_META["/"];
  const w = collapsed ? "w-16" : "w-60";

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className={cn("fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-200 bg-navy-950 transition-all duration-200", w)}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-3">
          <Logo size={34} className="shrink-0" />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-extrabold tracking-tight text-white">
                EPL M<span className="text-[#c8a24a]">O</span>VE
              </p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                Admin Console
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((group) => (
            <div key={group.label} className="mb-3">
              {!collapsed && (
                <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  {group.label}
                </p>
              )}
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) => cn(
                    "group mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive ? "bg-brand-600 text-white" : "text-white/60 hover:bg-white/10 hover:text-white",
                    collapsed && "justify-center px-0",
                  )}>
                  <Icon size={17} className="shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-2 py-2 space-y-0.5">
          <NavLink to="/settings" title={collapsed ? "Settings" : undefined}
            className={({ isActive }) => cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-brand-600 text-white" : "text-white/60 hover:bg-white/10 hover:text-white",
              collapsed && "justify-center px-0",
            )}>
            <Settings size={17} />
            {!collapsed && <span>Settings</span>}
          </NavLink>
          <button onClick={() => void auth.logout()}
            title={collapsed ? "Sign out" : undefined}
            className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-red-900/40 hover:text-red-300",
              collapsed && "justify-center px-0")}>
            <LogOut size={17} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-slate-700">
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </aside>

      <div className={cn("flex min-h-screen flex-col transition-all duration-200", collapsed ? "pl-16" : "pl-60")}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900">{page.title}</h1>
            <p className="hidden truncate text-xs text-slate-500 sm:block">{page.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700 sm:inline">
              platform_admin
            </span>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
              <Bell size={17} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
