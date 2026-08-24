"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AresLogo } from "./logo";
import { AresSidebar, NavItem } from "./app-shell/sidebar";
import { AresOverview } from "./app-shell/overview";
import { AresProducts } from "./app-shell/products";
import { AresOrders } from "./app-shell/orders";
import { AresConversations } from "./app-shell/conversations";
import { AresAutomations } from "./app-shell/automations";
import { AresIntegrations } from "./app-shell/integrations";
import { AresAiChatPanel } from "./app-shell/ai-chat";
import { AresOwnerChat } from "./app-shell/owner-chat";
import { AresSettings } from "./app-shell/settings";
import { AresAudit } from "./app-shell/audit";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { signOut } from "next-auth/react";

interface AppShellProps {
  businessId: string;
  businessName: string;
  businessType: string;
  ownerName: string;
  needsOnboarding: boolean;
  onOnboarded: () => void;
}

type View =
  | "overview"
  | "products"
  | "orders"
  | "conversations"
  | "ai"
  | "owner-chat"
  | "automations"
  | "integrations"
  | "audit"
  | "settings";

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: "layout" },
  { id: "products", label: "Products", icon: "package" },
  { id: "orders", label: "Orders", icon: "shopping-bag" },
  { id: "conversations", label: "Conversations", icon: "message" },
  { id: "ai", label: "Customer Agent", icon: "sparkles" },
  { id: "owner-chat", label: "Business Analysis", icon: "brain" },
  { id: "automations", label: "Automations", icon: "workflow" },
  { id: "integrations", label: "Integrations", icon: "plug" },
  { id: "audit", label: "Audit log", icon: "scroll" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export function AresAppShell({
  businessId,
  businessName,
  businessType,
  ownerName,
  needsOnboarding,
  onOnboarded,
}: AppShellProps) {
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const seenNotifications = useRef<Set<string>>(new Set());

  // Poll for notifications every 30 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const json = await res.json();
        for (const n of json.notifications || []) {
          const key = `${n.type}-${n.timestamp}`;
          if (!seenNotifications.current.has(key)) {
            seenNotifications.current.add(key);
            toast({
              title: n.title,
              description: n.message,
            });
          }
        }
      } catch {}
    };

    // Initial poll after 5 seconds (let dashboard load first)
    const initialTimer = setTimeout(poll, 5000);
    const interval = setInterval(poll, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ares/dashboard?t=${Date.now()}`);
      if (res.status === 401) {
        // session expired
        window.location.reload();
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("dashboard load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (needsOnboarding) {
    return (
      <OnboardingGate
        businessId={businessId}
        ownerName={ownerName}
        onOnboarded={onOnboarded}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-ares-mist">
      {/* Sidebar */}
      <AresSidebar
        nav={NAV}
        active={view}
        onSelect={(v) => { setView(v as View); setSidebarOpen(false); }}
        businessName={businessName}
        businessType={businessType}
        ownerName={ownerName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => {
          signOut({ redirect: false }).then(() => {
            window.location.href = "/";
          });
        }}
      />

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-ares-line bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-ares-line p-2 text-ares-navy"
            aria-label="Open menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <AresLogo className="h-7 w-7" />
            <span className="font-mono text-sm font-bold tracking-wider text-ares-navy">A.R.E.S.</span>
          </div>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {loading || !data ? (
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-2xl" />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[1,2,3,4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          ) : (
            <>
              {view === "overview" && <AresOverview data={data} onNavigate={setView} />}
              {view === "products" && <AresProducts data={data} onChanged={load} />}
              {view === "orders" && <AresOrders data={data} onChanged={load} />}
              {view === "conversations" && <AresConversations data={data} />}
              {view === "ai" && <AresAiChatPanel data={data} />}
              {view === "owner-chat" && <AresOwnerChat data={data} />}
              {view === "automations" && <AresAutomations data={data} />}
              {view === "integrations" && <AresIntegrations data={data} onChanged={load} />}
              {view === "audit" && <AresAudit data={data} />}
              {view === "settings" && <AresSettings data={data} onChanged={load} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function OnboardingGate({
  businessId,
  ownerName,
  onOnboarded,
}: {
  businessId: string;
  ownerName: string;
  onOnboarded: () => void;
}) {
  // Lazy load to keep bundle smaller
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);
  useEffect(() => {
    import("./onboarding").then((m) => setComp(() => m.AresOnboarding));
  }, []);
  if (!Comp) return null;
  return (
    <Comp
      businessId={businessId}
      ownerName={ownerName}
      onComplete={onOnboarded}
    />
  );
}
