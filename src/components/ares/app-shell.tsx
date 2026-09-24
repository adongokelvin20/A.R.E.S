"use client";

import { useState, useEffect, useCallback } from "react";
import { AresLogo } from "./logo";
import { AresSidebar, NavItem } from "./app-shell/sidebar";
import { AresOverview } from "./app-shell/overview";
import { AresProducts } from "./app-shell/products";
import { AresOrders } from "./app-shell/orders";
import { AresConversations } from "./app-shell/conversations";
import { AresAutomations } from "./app-shell/automations";
import { AresIntegrations } from "./app-shell/integrations";
import { AresAiChatPanel } from "./app-shell/ai-chat";
import { AresSettings } from "./app-shell/settings";
import { AresAudit } from "./app-shell/audit";
import { AresPricing as AresDashboardPricing } from "./app-shell/pricing";
import { AresArchives } from "./app-shell/archives";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "next-auth/react";
import { PricingModal } from "./pricing-modal";

interface AppShellProps {
  businessId: string;
  businessName: string;
  businessType: string;
  ownerName: string;
  needsOnboarding: boolean;
  onOnboarded: () => void;
  locked?: boolean;
}

type View =
  | "overview"
  | "products"
  | "orders"
  | "conversations"
  | "ai"
  | "automations"
  | "integrations"
  | "pricing"
  | "archives"
  | "audit"
  | "settings";

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: "layout" },
  { id: "products", label: "Products", icon: "package" },
  { id: "orders", label: "Orders", icon: "shopping-bag" },
  { id: "conversations", label: "Conversations", icon: "message" },
  { id: "ai", label: "Ask my AI", icon: "sparkles" },
  { id: "automations", label: "Automations", icon: "workflow" },
  { id: "integrations", label: "Integrations", icon: "plug" },
  { id: "pricing", label: "Plans", icon: "crown" },
  { id: "archives", label: "Archives", icon: "calendar" },
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
  locked = false,
}: AppShellProps) {
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [showPricing, setShowPricing] = useState(locked); // if locked server-side, show pricing immediately

  // Check subscription status on mount
  useEffect(() => {
    fetch("/api/subscription/status")
      .then((r) => {
        if (!r.ok) throw new Error("status " + r.status);
        return r.json();
      })
      .then((sub) => {
        if (sub && typeof sub === "object") {
          setSubscription(sub);
          // Show pricing if access is denied
          if (sub.hasAccess === false) {
            setShowPricing(true);
          }
        }
      })
      .catch(() => {
        // If the subscription check fails AND we're already locked (server-side),
        // stay locked. Don't override the server's lock decision.
        if (!locked) {
          setSubscription({ hasAccess: true, status: "TRIAL", daysLeft: 7 });
        }
      });
  }, [locked]);

  // ===== Browser notifications for new orders =====
  // Request permission on mount, then poll for new orders every 30 seconds
  useEffect(() => {
    // Request notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }

    let lastCheck = new Date(Date.now() - 5 * 60 * 1000); // start 5 min ago
    let seenOrderIds = new Set<string>();

    const checkNewOrders = async () => {
      try {
        const res = await fetch(`/api/notifications?since=${lastCheck.toISOString()}`);
        if (!res.ok) return;
        const data = await res.json();
        lastCheck = new Date(data.checkedAt);

        for (const order of data.orders ?? []) {
          if (!seenOrderIds.has(order.id)) {
            seenOrderIds.add(order.id);
            // Show browser notification
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              const symbol = order.currency === "GHS" ? "GH₵" : order.currency;
              new Notification("New order! 🎉", {
                body: `${order.customerName} ordered ${order.itemCount} item${order.itemCount === 1 ? "" : "s"} — ${symbol}${order.total.toFixed(2)} via ${order.channel === "WHATSAPP" ? "WhatsApp" : "Store"}`,
                icon: "/icon.svg",
                tag: order.id,
              });
            }
          }
        }
      } catch {}
    };

    // Check immediately, then every 30 seconds
    checkNewOrders();
    const interval = setInterval(checkNewOrders, 30 * 1000);
    return () => clearInterval(interval);
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
              {view === "automations" && <AresAutomations data={data} />}
              {view === "integrations" && <AresIntegrations data={data} onChanged={load} />}
              {view === "pricing" && <AresDashboardPricing data={data} onChanged={load} />}
              {view === "archives" && <AresArchives />}
              {view === "audit" && <AresAudit data={data} />}
              {view === "settings" && <AresSettings data={data} onChanged={load} />}
            </>
          )}
        </main>
      </div>

      {/* Trial banner */}
      {subscription?.status === "TRIAL" && subscription.daysLeft <= 3 && subscription.daysLeft > 0 && (
        <div className="fixed bottom-4 right-4 z-40 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-lg">
          <div className="text-xs font-semibold text-amber-800">
            Free trial ends in {subscription.daysLeft} day{subscription.daysLeft === 1 ? "" : "s"}
          </div>
          <button
            onClick={() => setShowPricing(true)}
            className="mt-1.5 text-[11px] font-medium text-amber-700 underline"
          >
            Choose a plan →
          </button>
        </div>
      )}

      {/* Pricing modal (when trial expired or user clicks upgrade) */}
      {showPricing && (
        <PricingModal
          onClose={() => {
            // Only allow closing if they have access AND not server-locked
            if (subscription?.hasAccess && !locked) setShowPricing(false);
          }}
          onSubscribed={() => {
            setShowPricing(false);
            window.location.reload();
          }}
        />
      )}
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
