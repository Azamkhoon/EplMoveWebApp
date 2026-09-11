import { NavLink } from "react-router-dom";
import {
  Boxes,
  Calculator,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  FolderArchive,
  Navigation,
  Receipt,
  Settings,
  Sparkles,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_COUNTS } from "@/data/shipments";
import { useI18n } from "@/i18n/LanguageContext";
import { Logo } from "@/components/brand/Logo";

const NAV = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  {
    to: "/shipments",
    labelKey: "nav.shipments",
    icon: Boxes,
    badge:
      (STATUS_COUNTS.in_transit ?? 0) + (STATUS_COUNTS.delayed ?? 0) || undefined,
  },
  {
    to: "/tracking",
    labelKey: "nav.tracking",
    icon: Navigation,
    badge:
      (STATUS_COUNTS.in_transit ?? 0) + (STATUS_COUNTS.delayed ?? 0) || undefined,
  },
  { to: "/marketplace", labelKey: "nav.marketplace", icon: Store },
  { to: "/documents", labelKey: "nav.documents", icon: FolderArchive },
  { to: "/invoices", labelKey: "nav.invoices", icon: Receipt },
  { to: "/quotation", labelKey: "nav.quotation", icon: FileText },
  { to: "/load-calculator", labelKey: "nav.loadCalculator", icon: Calculator },
  { to: "/rate-estimator", labelKey: "nav.rateEstimator", icon: Sparkles },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();

  const itemClass = (isActive: boolean) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg px-3 nav-pad-y text-sm font-medium transition-all",
      isActive
        ? "bg-brand-50 text-brand-700"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
      collapsed && "justify-center",
    );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-200 bg-white transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center gap-3 border-b border-slate-100 px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <Logo variant="mark" size={collapsed ? 34 : 38} className="shrink-0" />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-extrabold tracking-tight text-slate-900">
              EPL M<span className="text-[#c8a24a]">O</span>VE
            </p>
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {t("brand.portal")}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t("nav.operations")}
          </p>
        )}
        {NAV.map(({ to, labelKey, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => itemClass(isActive)}
            title={collapsed ? t(labelKey) : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && !collapsed && (
                  <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-600" />
                )}
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{t(labelKey)}</span>}
                {!collapsed && badge && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-0.5 border-t border-slate-100 px-3 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) => itemClass(isActive)}
          title={collapsed ? t("nav.settings") : undefined}
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span>{t("nav.settings")}</span>}
        </NavLink>
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 nav-pad-y text-sm font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700",
            collapsed && "justify-center",
          )}
        >
          <ChevronLeft
            size={18}
            className={cn("shrink-0 transition-transform", collapsed && "rotate-180")}
          />
          {!collapsed && <span>{t("nav.collapse")}</span>}
        </button>
      </div>
    </aside>
  );
}
