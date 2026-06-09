import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GeniusAssistant } from "@/components/genius/GeniusAssistant";
import { useTheme } from "@/theme/ThemeContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const { sidebarCollapsed, setSidebarCollapsed } = useTheme();
  const [collapsed, setCollapsed] = useState(sidebarCollapsed);
  const { pathname } = useLocation();

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    setSidebarCollapsed(next); // persist the preference
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          collapsed ? "pl-[72px]" : "pl-64",
        )}
      >
        <Topbar pathname={pathname} />
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
      <GeniusAssistant />
    </div>
  );
}
