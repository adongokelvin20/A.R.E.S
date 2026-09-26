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
  const [isKratos, setIsKratos] = useState(false);
  const [isKelvin, setIsKelvin] = useState(false);
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
    const code = promoCode.trim().toLowerCase();
    if (code === "kelvin") {
      setPromoApplied(true);
      setIsKelvin(true);
      setIsKratos(false);
      setPlan("ANNUAL");
      toast({ title: "Promo applied!", description: "Annual plan for GHC 600/year." });
    } else if (code === "kratos") {
      setPromoApplied(true);
      setIsKratos(true);
      setIsKelvin(false);
      setPlan("ANNUAL");
      toast({ title: "Free plan applied!", description: "Free annual plan — no payment needed!" });
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
        body: JSON.stringify({ plan, promoCode: promoApplied ? promoCode.trim() : undefined }),
      });
      const data = await res.json();

      // Free promo (kratos) or successful activation
      if (data.free || data.ok) {
        toast({ title: "Activated!", description: "Your plan is now active. Loading your dashboard..." });
        setLoading(false);
        // Wait 2 seconds for the DB write to complete, then redirect
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
        return;
      }

      // Paid plan — redirect to Paystack
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }

      // Error
      toast({ title: "Failed", description: data.error ?? "Could not start payment", variant: "destructive" });
      setLoading(false);
    } catch {
      toast({ title: "Failed", description: "Network error", variant: "destructive" });
      setLoading(false);
    }
  }

  // Determine button text
  let buttonText = "Pay & activate";
  if (loading) buttonText = "Processing...";
  else if (isKratos) buttonText = "Activate free plan";
  else if (isKelvin) buttonText = "Pay GHC 600 & activate";
  else if (plan === "ANNUAL") buttonText = "Pay GHC 1,300 & activate";
  else buttonText = "Pay GHC 115 & activate";

  // Determine price display
  const annualDisplay = isKratos ? "FREE" : isKelvin ? "GHC 600" : "GHC 1,300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ares-navy/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg my-8 rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
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

          {/* Plan toggle — disabled when kratos is applied */}
          <div className={`grid grid-cols-2 gap-3 ${isKratos ? "opacity-50 pointer-events-none" : ""}`}>
            <button
              onClick={() => { setPlan("ANNUAL"); setPromoApplied(false); setIsKratos(false); setIsKelvin(false); setPromoCode(""); }}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${plan === "ANNUAL" ? "border-ares-sea bg-ares-foam/30" : "border-ares-line"}`}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-ares-sea-deep" />
                <span className="text-xs font-semibold uppercase tracking-wide text-ares-sea-deep">Annual</span>
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-ares-navy">{annualDisplay}</div>
              <div className="text-[11px] text-muted-foreground">{isKratos ? "free for 1 year" : "per year"}</div>
            </button>

            <button
              onClick={() => { setPlan("MONTHLY"); setPromoApplied(false); setIsKratos(false); setIsKelvin(false); setPromoCode(""); }}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${plan === "MONTHLY" && !promoApplied ? "border-ares-sea bg-ares-foam/30" : "border-ares-line"}`}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-ares-sea-deep" />
                <span className="text-xs font-semibold uppercase tracking-wide text-ares-sea-deep">Monthly</span>
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-ares-navy">GHC 115</div>
              <div className="text-[11px] text-muted-foreground">per month</div>
            </button>
          </div>

          {/* Promo code */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ares-navy">Promo code (optional)</label>
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value); setPromoApplied(false); setIsKratos(false); setIsKelvin(false); }}
                placeholder=""
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
              <p className="mt-1 text-[11px] text-emerald-600">
                {isKratos ? "Free annual plan applied — no payment needed!" : "Promo applied — GHC 600/year!"}
              </p>
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

          {/* Activate/Pay button */}
          <button
            onClick={pay}
            disabled={loading}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 ${
              isKratos ? "bg-emerald-600 hover:bg-emerald-700" : "bg-ares-navy hover:bg-ares-sea-deep"
            }`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isKratos ? <Check className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
            {buttonText}
          </button>

          <p className="text-center text-[10px] text-muted-foreground">
            {isKratos ? "Free plan — no payment required" : "Secure payment via Paystack · Mobile Money accepted"}
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
