"use client";

import { Check, Sparkles, Crown, Calendar } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    name: "Free Trial",
    price: "GHC 0",
    period: "7 days",
    description: "Try everything free for a week. No card needed.",
    features: [
      "Full AI assistant for 7 days",
      "Unlimited customer chats",
      "Store link + WhatsApp",
      "All features unlocked",
    ],
    cta: "Start free trial",
    href: "/auth",
    highlight: false,
    icon: Sparkles,
  },
  {
    name: "Annual",
    price: "GHC 1,300",
    period: "per year",
    description: "Best value — save 2 months vs monthly. Promo code Kelvin gets you GHC 600/year.",
    features: [
      "Everything in trial, forever",
      "Weekly performance archives",
      "Global brain — gets smarter over time",
      "Priority support",
      "Save GHC 860 vs monthly",
    ],
    cta: "Get annual",
    href: "/auth",
    highlight: true,
    icon: Crown,
  },
  {
    name: "Monthly",
    price: "GHC 115",
    period: "per month",
    description: "Flexible month-to-month. Cancel anytime.",
    features: [
      "Everything in annual",
      "Month-to-month flexibility",
      "Cancel anytime",
      "Weekly archives",
    ],
    cta: "Get monthly",
    href: "/auth",
    highlight: false,
    icon: Calendar,
  },
];

export function AresPricing() {
  return (
    <section id="pricing" className="relative py-24 bg-ares-mist">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-sea/20 bg-white px-3 py-1 text-xs font-medium text-ares-sea-deep">
            Pricing
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-ares-navy sm:text-4xl ares-serif">
            Simple, honest pricing.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Start free for 7 days. Then choose a plan that works for you. Use promo code <span className="font-semibold text-ares-sea-deep">Kelvin</span> for the annual plan at <span className="font-semibold text-ares-sea-deep">GHC 600/year</span> — that&apos;s GHC 860 off.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative overflow-hidden rounded-3xl border-2 p-6 ${
                plan.highlight
                  ? "border-ares-sea bg-white shadow-[0_8px_32px_-8px_rgba(2,132,166,0.2)]"
                  : "border-ares-line bg-white"
              }`}
            >
              {plan.highlight && (
                <div className="absolute right-4 top-4 rounded-full bg-ares-sea px-2.5 py-1 text-[10px] font-semibold text-white">
                  BEST VALUE
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.highlight ? "bg-ares-foam text-ares-sea-deep" : "bg-ares-mist text-ares-navy"}`}>
                  <plan.icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-ares-navy">{plan.name}</div>
              </div>

              <div className="mt-5">
                <span className="font-mono text-3xl font-bold text-ares-navy">{plan.price}</span>
                <span className="ml-1.5 text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{plan.description}</p>

              <ul className="mt-5 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ares-navy">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  plan.highlight
                    ? "bg-ares-navy text-white hover:bg-ares-sea-deep"
                    : "border border-ares-line bg-white text-ares-navy hover:bg-ares-mist"
                }`}
              >
                {plan.cta} →
              </Link>
            </div>
          ))}
        </div>

        {/* Promo banner */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-ares-sea/20 bg-gradient-to-br from-ares-navy to-ares-sea-deep p-6 text-center text-white">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-semibold">Promo: Use code KELVIN</span>
          </div>
          <p className="mt-2 text-xs text-white/70">
            Get the annual plan for <span className="font-semibold text-white">GHC 600/year</span> instead of GHC 1,300. That&apos;s GHC 860 off — forever.
          </p>
        </div>
      </div>
    </section>
  );
}
