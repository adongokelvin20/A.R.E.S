"use client";

import { AresLogo } from "../logo";
import { LayoutDashboard, Package, ShoppingBag, MessageSquare, Sparkles, Plug, ScrollText, Settings, LogOut, X, Workflow, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const ICONS: Record<string, any> = {
  layout: LayoutDashboard,
  package: Package,
  "shopping-bag": ShoppingBag,
  message: MessageSquare,
  sparkles: Sparkles,
  workflow: Workflow,
  brain: Brain,
  plug: Plug,
  scroll: ScrollText,
  settings: Settings,
};

export function AresSidebar({
  nav,
  active,
  onSelect,
  businessName,
  businessType,
  ownerName,
  open,
  onClose,
  onLogout,
}: {
  nav: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  businessName: string;
  businessType: string;
  ownerName: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ares-navy/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ares-line bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-ares-line p-5">
          <div className="flex items-center gap-2.5">
            <AresLogo className="h-9 w-9" />
            <div>
              <div className="font-mono text-sm font-bold tracking-[0.18em] text-ares-navy">A.R.E.S.</div>
              <div className="text-[10px] tracking-wide text-muted-foreground">A.R.E.S. Dashboard</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-ares-mist lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Business info */}
        <div className="border-b border-ares-line px-5 py-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-ares-navy">{businessName}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="rounded-md bg-ares-foam px-1.5 py-0.5 text-[10px] font-medium text-ares-sea-deep">
              {businessType.replace(/_/g, " ")}
            </span>
            <span className="text-[11px] text-muted-foreground">· {ownerName}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto ares-scroll p-3">
          <div className="space-y-0.5">
            {nav.map((item) => {
              const Icon = ICONS[item.icon] ?? LayoutDashboard;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-ares-navy text-white shadow-sm"
                      : "text-muted-foreground hover:bg-ares-mist hover:text-ares-navy"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-muted-foreground group-hover:text-ares-sea-deep")} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-ares-line p-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
