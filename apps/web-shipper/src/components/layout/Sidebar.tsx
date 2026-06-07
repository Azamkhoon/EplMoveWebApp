import { NavLink } from "react-router-dom";
import {
  Boxes,
  Calculator,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Navigation,
  Settings,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_COUNTS } from "@/data/shipments";
import { useI18n } from "@/i18n/LanguageContext";
import { useGenius } from "@/components/genius/GeniusContext";

const NAV = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  {
    to: "/shipments",
    labelKey: "nav.shipments",
    icon: Boxes,
    badge:
      (STATUS_COUNTS.in_transit ?? 0) + (STATUS_COUNTS.delayed ?? 0) || undefined,
  },
  { to: "/marketplace", labelKey: "nav.marketplace", icon: Store },
  { to: "/tracking", labelKey: "nav.tracking", icon: Navigation },
  { to: "/quotation", labelKey: "nav.quotation", icon: FileText },
  { to: "/load-calculator", labelKey: "nav.loadCalculator", icon: Calculator },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const { open: openGenius } = useGenius();
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-navy-800/60 bg-navy-900 text-slate-300 transition-all duration-300",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-navy-800/60 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 shadow-lg shadow-brand-600/30">
          <Navigation size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-white">EPL Move</p>
            <p className="truncate text-[11px] text-slate-400">
              {t("brand.portal")}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {t("nav.operations")}
          </p>
        )}
        {NAV.map(({ to, labelKey, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                  : "text-slate-300 hover:bg-navy-800 hover:text-white",
                collapsed && "justify-center"
              )
            }
            title={collapsed ? t(labelKey) : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{t(labelKey)}</span>}
            {!collapsed && badge && (
              <span className="rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-navy-800/60 px-3 py-3">
        <button
          onClick={openGenius}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-navy-800 hover:text-white",
            collapsed && "justify-center"
          )}
          title={t("nav.support")}
        >
          <LifeBuoy size={18} />
          {!collapsed && <span>{t("nav.support")}</span>}
        </button>
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-navy-800 hover:text-white",
            collapsed && "justify-center"
          )}
          title={t("nav.settings")}
        >
          <Settings size={18} />
          {!collapsed && <span>{t("nav.settings")}</span>}
        </button>
        <button
          onClick={onToggle}
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-navy-800 hover:text-white",
            collapsed && "justify-center"
          )}
        >
          <ChevronLeft
            size={18}
            className={cn("transition-transform", collapsed && "rotate-180")}
          />
          {!collapsed && <span>{t("nav.collapse")}</span>}
        </button>
      </div>
    </aside>
  );
}
