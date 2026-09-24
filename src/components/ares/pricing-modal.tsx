"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, Sparkles, Crown, Calendar, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { signOut } from "next-auth/react";

interface SubStatus {
  status: string;
  plan: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  hasAccess: boolean;
  daysLeft: number;
  pricing: any;
}

export function PricingModal({ onClose, onSubscribed }: { onClose: () => void; onSubscribed: () => void }) {
  const [plan, setPlan] = useState<"ANNUAL" | "MONTHLY">("ANNUAL");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then(setSubStatus)
      .catch(() => {});
  }, []);

  function applyPromo() {
    if (!promoCode.trim()) return;
    if (promoCode.trim().toLowerCase() === "kelvin") {
      setPromoApplied(true);
      setPlan("ANNUAL");
      toast({ title: "Promo applied!", description: "You get the annual plan for GHC 600/year." });
    } else if (promoCode.trim().toLowerCase() === "kratos") {
      setPromoApplied(true);
      setPlan("ANNUAL");
      toast({ title: "Promo applied!", description: "Free annual plan activated!" });
    } else {
      toast({ title: "Invalid promo code", variant: "destructive" });
    }
  }

  async function pay() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, promoCode: promoApplied ? promoCode : undefined }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else if (data.free || data.ok) {
        toast({ title: "Subscription activated!", description: "Your plan is now active." });
        onSubscribed();
      } else {
        toast({ title: "Payment failed", description: data.error ?? "Could not start payment", variant: "destructive" });
        setLoading(false);
      }
    } catch {
      toast({ title: "Payment failed", variant: "destructive" });
      setLoading(false);
    }
  }

  const annualPrice = promoApplied ? "GHC 600" : "GHC 1,300";
  const monthlyPrice = "GHC 115";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ares-navy/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg my-8 rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header — fixed at top */}
        <div className="flex items-center justify-between bg-gradient-to-br from-ares-navy to-ares-sea-deep p-5 text-white rounded-t-3xl shrink-0">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-semibold">Choose your plan</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="space-y-4 p-5 overflow-y-auto">
          {/* Trial status */}
          {subStatus && subStatus.status === "TRIAL" && (
            <div className="rounded-xl bg-ares-foam p-3 text-center text-xs text-ares-sea-deep">
              <Sparkles className="mx-auto mb-1 h-4 w-4" />
              Your free trial {subStatus.daysLeft > 0 ? `ends in ${subStatus.daysLeft} day${subStatus.daysLeft === 1 ? "" : "s"}` : "has ended"}. Choose a plan to continue.
            </div>
          )}

          {/* Plan toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setPlan("ANNUAL"); setPromoApplied(false); setPromoCode(""); }}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${plan === "ANNUAL" ? "border-ares-sea bg-ares-foam/30" : "border-ares-line"}`}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-ares-sea-deep" />
                <span className="text-xs font-semibold uppercase tracking-wide text-ares-sea-deep">Annual</span>
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-ares-navy">{annualPrice}</div>
              <div className="text-[11px] text-muted-foreground">per year</div>
            </button>

            <button
              onClick={() => { setPlan("MONTHLY"); setPromoApplied(false); setPromoCode(""); }}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${plan === "MONTHLY" && !promoApplied ? "border-ares-sea bg-ares-foam/30" : "border-ares-line"}`}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-ares-sea-deep" />
                <span className="text-xs font-semibold uppercase tracking-wide text-ares-sea-deep">Monthly</span>
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-ares-navy">{monthlyPrice}</div>
              <div className="text-[11px] text-muted-foreground">per month</div>
            </button>
          </div>

          {/* Promo code */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ares-navy">Promo code (optional)</label>
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value); setPromoApplied(false); }}
                placeholder="e.g. Kelvin"
                className="flex-1 rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none"
              />
              <button
                onClick={applyPromo}
                disabled={!promoCode.trim() || promoApplied}
                className="rounded-lg border border-ares-line bg-white px-3 py-2 text-xs font-semibold text-ares-navy hover:bg-ares-mist disabled:opacity-50"
              >
                {promoApplied ? <Check className="h-4 w-4 text-emerald-600" /> : "Apply"}
              </button>
            </div>
            {promoApplied && (
              <p className="mt-1 text-[11px] text-emerald-600">Promo "{promoCode}" applied — {promoCode.trim().toLowerCase() === "kratos" ? "Free plan!" : "GHC 600/year!"}</p>
            )}
          </div>

          {/* Features */}
          <div className="rounded-xl bg-ares-mist p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">What you get</div>
            <ul className="mt-2 space-y-1.5">
              {[
                "AI assistant handles all customer chats",
                "Unlimited orders + customers",
                "WhatsApp + store link integration",
                "Weekly performance archives",
                "Global brain — gets smarter over time",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-ares-navy">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pay button */}
          <button
            onClick={pay}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ares-navy px-4 py-3 text-sm font-semibold text-white hover:bg-ares-sea-deep disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            {loading ? "Redirecting to payment..." : `Pay ${plan === "ANNUAL" ? (promoApplied ? "GHC 600" : "GHC 1,300") : "GHC 115"} & activate`}
          </button>

          <p className="text-center text-[10px] text-muted-foreground">
            Secure payment via Paystack · Mobile Money accepted
          </p>

          {/* Log out button */}
          <button
            onClick={() => signOut({ callbackUrl: "/auth", redirect: true })}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-ares-line bg-white px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-ares-mist"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
