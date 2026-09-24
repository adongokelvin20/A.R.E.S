"use client";

import { useState, useEffect } from "react";
import { Check, Crown, Calendar, Sparkles, Loader2, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AresPricing({ data, onChanged }: { data: any; onChanged: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState<"ANNUAL" | "MONTHLY">("ANNUAL");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then(setSubStatus)
      .catch(() => {});
  }, []);

  const isActive = subStatus?.status === "ACTIVE";
  const isExpired = subStatus?.status === "EXPIRED";
  const isTrial = subStatus?.status === "TRIAL";

  function applyPromo() {
    if (!promoCode.trim()) return;
    const normalized = promoCode.trim().toLowerCase();
    if (normalized === "kelvin" || normalized === "kratos") {
      setPromoApplied(true);
      setSelectedPlan("ANNUAL");
      toast({ title: "Promo applied!", description: normalized === "kratos" ? "Free annual plan activated!" : "Annual plan for GHC 600/year!" });
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
        body: JSON.stringify({ plan: selectedPlan, promoCode: promoApplied ? promoCode : undefined }),
      });
      const data = await res.json();

      if (data.free || data.ok) {
        toast({ title: "Subscription activated!", description: "Your plan is now active." });
        onChanged();
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast({ title: "Payment failed", description: data.error ?? "Could not start payment", variant: "destructive" });
        setLoading(false);
      }
    } catch {
      toast({ title: "Payment failed", variant: "destructive" });
      setLoading(false);
    }
  }

  const annualPrice = promoApplied && promoCode.trim().toLowerCase() === "kelvin" ? "GHC 600" : "GHC 1,300";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ares-navy">Plans & Billing</h2>
        <p className="text-xs text-muted-foreground">
          {isTrial && subStatus.daysLeft > 0
            ? `Free trial — ${subStatus.daysLeft} day${subStatus.daysLeft === 1 ? "" : "s"} left`
            : isActive
            ? `Active — ${subStatus.plan} plan${subStatus.currentPeriodEnd ? ` · renews ${new Date(subStatus.currentPeriodEnd).toLocaleDateString()}` : ""}`
            : isExpired
            ? "Your subscription has expired — choose a plan to continue"
            : "Choose a plan to continue"}
        </p>
      </div>

      {/* Current status — Trial */}
      {isTrial && (
        <div className="rounded-2xl border border-ares-sea/20 bg-ares-foam p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ares-sea-deep" />
            <span className="text-sm font-semibold text-ares-navy">Free trial active</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {subStatus.daysLeft > 0
              ? `You have ${subStatus.daysLeft} day${subStatus.daysLeft === 1 ? "" : "s"} left in your free trial. Choose a plan below to keep your assistant running after the trial ends.`
              : "Your trial has ended. Choose a plan below to continue."}
          </p>
        </div>
      )}

      {/* Current status — Active */}
      {isActive && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">Subscription active</span>
            <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              {subStatus?.promoCode?.toLowerCase() === "kratos" ? "FREE (KRATOS)" : subStatus?.promoCode?.toLowerCase() === "kelvin" ? "PROMO (KELVIN)" : subStatus?.plan}
            </span>
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            {subStatus?.currentPeriodEnd
              ? `Active until ${new Date(subStatus.currentPeriodEnd).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
              : "Active"}
          </p>
          {subStatus?.promoCode?.toLowerCase() === "kratos" && (
            <p className="mt-2 text-[11px] text-emerald-600">
              You&apos;re on the free Kratos plan for 1 year. When it expires, you&apos;ll need to use the code again or choose a paid plan.
            </p>
          )}
          {subStatus?.promoCode?.toLowerCase() === "kelvin" && (
            <p className="mt-2 text-[11px] text-emerald-600">
              You&apos;re on the Kelvin promo (GHC 600/year). When it expires, you can renew at the same rate.
            </p>
          )}
          <p className="mt-2 text-[11px] text-emerald-600">
            You can&apos;t subscribe again until your current plan expires. Your assistant will keep running.
          </p>
        </div>
      )}

      {/* Expired — locked */}
      {isExpired && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-rose-600" />
            <span className="text-sm font-semibold text-rose-800">Subscription expired</span>
          </div>
          <p className="mt-1 text-xs text-rose-700">
            Your subscription has ended. Choose a plan below to reactivate your assistant and unlock the dashboard.
          </p>
        </div>
      )}

      {/* Plans — disabled if already active */}
      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${isActive ? "opacity-50 pointer-events-none" : ""}`}>
        {[
          {
            name: "Annual",
            price: "GHC 1,300",
            period: "per year",
            description: "Best value — save 2 months vs monthly.",
            features: ["AI assistant handles all customer chats", "Unlimited orders + customers", "WhatsApp + store link integration", "Weekly performance archives", "Global brain — gets smarter over time", "Priority support"],
            plan: "ANNUAL" as const,
            highlight: true,
            icon: Crown,
          },
          {
            name: "Monthly",
            price: "GHC 115",
            period: "per month",
            description: "Flexible month-to-month. Cancel anytime.",
            features: ["Everything in annual", "Month-to-month flexibility", "Cancel anytime", "Weekly archives"],
            plan: "MONTHLY" as const,
            highlight: false,
            icon: Calendar,
          },
        ].map((plan) => (
          <div
            key={plan.name}
            className={`relative overflow-hidden rounded-2xl border-2 p-5 ${
              selectedPlan === plan.plan
                ? "border-ares-sea bg-ares-foam/20"
                : "border-ares-line bg-white"
            }`}
          >
            <button
              onClick={() => { setSelectedPlan(plan.plan); setPromoApplied(false); setPromoCode(""); }}
              className="w-full text-left"
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.highlight ? "bg-ares-foam text-ares-sea-deep" : "bg-ares-mist text-ares-navy"}`}>
                  <plan.icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-ares-navy">{plan.name}</div>
                {plan.highlight && (
                  <span className="ml-auto rounded-full bg-ares-sea px-2 py-0.5 text-[10px] font-semibold text-white">BEST VALUE</span>
                )}
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-bold text-ares-navy">
                  {plan.plan === "ANNUAL" && promoApplied && promoCode.trim().toLowerCase() === "kelvin" ? "GHC 600" : plan.price}
                </span>
                <span className="ml-1.5 text-xs text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ares-navy">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          </div>
        ))}
      </div>

      {/* Promo code — disabled if active */}
      {!isActive && (
        <div className="rounded-2xl border border-ares-line bg-white p-5">
          <label className="mb-1 block text-xs font-medium text-ares-navy">Promo code (optional)</label>
          <div className="flex gap-2">
            <input
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value); setPromoApplied(false); }}
              placeholder="Enter promo code"
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
            <p className="mt-2 text-[11px] text-emerald-600">
              {promoCode.trim().toLowerCase() === "kratos" ? "Free annual plan applied!" : "Promo applied — GHC 600/year!"}
            </p>
          )}
        </div>
      )}

      {/* Pay button — disabled if active */}
      {isActive ? (
        <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <Check className="h-4 w-4" />
          Your plan is active — no payment needed
        </div>
      ) : (
        <button
          onClick={pay}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-ares-navy px-4 py-3 text-sm font-semibold text-white hover:bg-ares-sea-deep disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isExpired ? <Lock className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
          {loading
            ? "Processing..."
            : isExpired
            ? "Reactivate subscription"
            : promoApplied && promoCode.trim().toLowerCase() === "kratos"
            ? "Activate free plan"
            : `Pay ${selectedPlan === "ANNUAL" ? (promoApplied && promoCode.trim().toLowerCase() === "kelvin" ? "GHC 600" : "GHC 1,300") : "GHC 115"} & activate`}
        </button>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        Secure payment via Paystack · Mobile Money accepted · Cancel anytime
      </p>
    </div>
  );
}
