import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GeniusAssistant } from "@/components/genius/GeniusAssistant";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          collapsed ? "pl-[76px]" : "pl-64"
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
