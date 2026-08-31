"use client";

import { Check, Sparkles } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    cadence: "14-day trial",
    desc: "For a single-location business getting started with AI.",
    features: [
      "1 AI employee",
      "Up to 500 AI messages / mo",
      "WhatsApp (Meta or WAAPI)",
      "Up to 3 modules active",
      "1 user seat",
      "Community support",
    ],
    cta: "Start trial",
    accent: false,
  },
  {
    name: "Pro",
    price: "GH₵ 450",
    cadence: "/ month",
    desc: "For growing businesses that need real automation.",
    features: [
      "1 AI employee",
      "Up to 10,000 AI messages / mo",
      "WhatsApp + Web + SMS channels",
      "Unlimited modules",
      "5 user seats",
      "Automation engine",
      "Knowledge base (RAG)",
      "Email support",
    ],
    cta: "Deploy A.R.E.S.",
    accent: true,
  },
  {
    name: "Business",
    price: "GH₵ 1,200",
    cadence: "/ month",
    desc: "For multi-location businesses with serious volume.",
    features: [
      "3 AI employees",
      "Up to 50,000 AI messages / mo",
      "All channels",
      "Unlimited modules + seats",
      "Proactive monitoring + alerts",
      "Action center + approvals",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Talk to sales",
    accent: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "annual",
    desc: "For groups, franchises, and regulated industries.",
    features: [
      "Unlimited AI employees",
      "Custom message volume",
      "SSO + advanced RBAC",
      "Dedicated infrastructure",
      "On-prem / private cloud option",
      "Custom SLAs",
      "Dedicated success manager",
      "Compliance + audit support",
    ],
    cta: "Contact us",
    accent: false,
  },
];

export function AresPricing() {
  return (
    <section id="pricing" className="relative py-24">
      <div className="absolute inset-0 ares-grid-bg opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-sea/20 bg-ares-foam px-3 py-1 text-xs font-medium text-ares-sea-deep">
            Pricing &amp; entitlements
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-ares-navy sm:text-4xl md:text-5xl">
            Pay for what your business{" "}
            <span className="ares-text-gradient">actually uses</span>
          </h2>
          <p className="mt-5 text-balance text-base text-muted-foreground sm:text-lg">
            A centralized entitlement system — no hardcoded limits sprinkled across the app. Upgrade
            or downgrade instantly; A.R.E.S. reconfigures available tools and channels per plan.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative overflow-hidden rounded-2xl border p-6 ${
                p.accent
                  ? "border-ares-sea/40 bg-white shadow-[0_24px_60px_-30px_rgba(14,165,199,0.45)]"
                  : "border-ares-line bg-white"
              }`}
            >
              {p.accent && (
                <>
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-ares-sea to-ares-sea-deep" />
                  <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-ares-sea-deep px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Sparkles className="h-2.5 w-2.5" />
                    Popular
                  </div>
                </>
              )}
              <div className="text-sm font-semibold text-ares-navy">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-bold text-ares-navy">{p.price}</span>
                <span className="text-xs text-muted-foreground">{p.cadence}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{p.desc}</p>
              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ares-navy">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ares-sea-deep" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  p.accent
                    ? "bg-ares-navy text-white hover:bg-ares-sea-deep"
                    : "border border-ares-line bg-white text-ares-navy hover:border-ares-sea/40"
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
