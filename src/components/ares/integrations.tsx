"use client";

import { MessageCircle, CreditCard, Mail, Smartphone, Calendar, BarChart3, Globe } from "lucide-react";

const INTEGRATIONS = [
  { name: "WhatsApp Cloud API", desc: "Official Meta Embedded Signup", icon: MessageCircle, status: "supported" },
  { name: "MTN MoMo", desc: "Ghana Mobile Money", icon: CreditCard, status: "supported" },
  { name: "Telecel Cash", desc: "Ghana Mobile Money", icon: CreditCard, status: "supported" },
  { name: "AirtelTigo Money", desc: "Ghana Mobile Money", icon: CreditCard, status: "supported" },
  { name: "Paystack", desc: "Africa-wide payments", icon: CreditCard, status: "supported" },
  { name: "SMS Gateway", desc: "Bulk + transactional SMS", icon: Smartphone, status: "supported" },
  { name: "Email (SMTP)", desc: "Receipts + notifications", icon: Mail, status: "supported" },
  { name: "Google Calendar", desc: "Appointments + scheduling", icon: Calendar, status: "supported" },
  { name: "Meta Analytics", desc: "Ad performance signals", icon: BarChart3, status: "supported" },
  { name: "Instagram DM", desc: "Social messaging channel", icon: MessageCircle, status: "planned" },
  { name: "Facebook Messenger", desc: "Social messaging channel", icon: MessageCircle, status: "planned" },
];

export function AresIntegrations() {
  return (
    <section id="integrations" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-sea/20 bg-ares-foam px-3 py-1 text-xs font-medium text-ares-sea-deep">
            Integration hub
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-ares-navy sm:text-4xl md:text-5xl">
            One normalized bus,{" "}
            <span className="ares-text-gradient">every channel</span> your customers use
          </h2>
          <p className="mt-5 text-balance text-base text-muted-foreground sm:text-lg">
            Each integration is a self-contained adapter: connection status, credentials, webhook
            verification, retries, and per-tenant isolation. Connect a service without touching
            code.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {INTEGRATIONS.map((i) => (
            <div
              key={i.name}
              className="group relative overflow-hidden rounded-2xl border border-ares-line bg-white p-5 ares-card-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ares-foam text-ares-sea-deep">
                  <i.icon className="h-5 w-5" />
                </div>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    i.status === "supported"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {i.status === "supported" ? "Supported" : "Planned"}
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold text-ares-navy">{i.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{i.desc}</div>
            </div>
          ))}
        </div>

        {/* Geographic coverage */}
        <div className="mt-10 rounded-3xl border border-ares-line bg-gradient-to-br from-ares-mist via-white to-ares-foam p-6 sm:p-8">
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-ares-sea/20 bg-white px-3 py-1 text-xs font-medium text-ares-sea-deep">
                <Globe className="h-3 w-3" />
                Ghana-first, global-ready
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-ares-navy">
                Built for African business workflows, scales anywhere
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A.R.E.S. ships first-class support for Mobile Money, Ghanaian phone formats, local
                payment providers, and the GHS currency -- but the same provider-agnostic
                architecture works for Nigeria, Kenya, South Africa, the US, the UK, and beyond.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { c: "Ghana", cur: "GHS", flag: "🇬🇭" },
                { c: "Nigeria", cur: "NGN", flag: "🇳🇬" },
                { c: "Kenya", cur: "KES", flag: "🇰🇪" },
                { c: "South Africa", cur: "ZAR", flag: "🇿🇦" },
                { c: "United Kingdom", cur: "GBP", flag: "🇬🇧" },
                { c: "United States", cur: "USD", flag: "🇺🇸" },
              ].map((g) => (
                <div
                  key={g.c}
                  className="rounded-xl border border-ares-line bg-white p-3 text-center"
                >
                  <div className="text-xl">{g.flag}</div>
                  <div className="mt-1 text-[11px] font-medium text-ares-navy">{g.c}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{g.cur}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
