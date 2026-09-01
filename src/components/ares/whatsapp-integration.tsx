"use client";

import { MessageCircle, ShieldCheck, QrCode, RefreshCw } from "lucide-react";

const STEPS = [
  {
    label: "Click Connect WhatsApp",
    detail: "One button inside your dashboard. No developer console, no tokens, no webhook URLs.",
  },
  {
    label: "Approve on Meta",
    detail: "Log in to Facebook, pick your WhatsApp Business number, and approve — all on Meta's side.",
  },
  {
    label: "You're live",
    detail: "A.R.E.S. configures everything behind the scenes. You land back in your dashboard with WhatsApp connected.",
  },
];

export function AresWhatsApp() {
  return (
    <section id="whatsapp" className="relative py-24">
      <div className="absolute inset-0 ares-grid-bg opacity-30" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-sea/20 bg-ares-foam px-3 py-1 text-xs font-medium text-ares-sea-deep">
            WhatsApp, connected the right way
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-ares-navy sm:text-4xl md:text-5xl">
            One click to connect.{" "}
            <span className="ares-text-gradient">Zero technical setup.</span>
          </h2>
          <p className="mt-5 text-balance text-base text-muted-foreground sm:text-lg">
            Link your WhatsApp Business number with Meta's official Embedded Signup. Click connect,
            approve on Meta, and you're live — fully compliant, fully official.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-ares-line bg-white p-6 sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ares-sea via-ares-sea-deep to-ares-navy" />
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ares-foam text-ares-sea-deep">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ares-navy">
                From disconnected to live in under a minute
              </h3>
              <p className="text-xs text-muted-foreground">Three steps · no technical knowledge required</p>
            </div>
          </div>

          <ol className="mt-6 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.label} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ares-sea-deep font-mono text-xs font-bold text-white">
                    {i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="my-1 w-px flex-1 bg-gradient-to-b from-ares-sea/40 to-ares-sea/10" />
                  )}
                </div>
                <div className="pb-2">
                  <div className="text-sm font-semibold text-ares-navy">{s.label}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.detail}</div>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-ares-line pt-5">
            <Badge icon={ShieldCheck}>Official Meta Cloud API</Badge>
            <Badge icon={QrCode}>QR option for mobile</Badge>
            <Badge icon={RefreshCw}>Auto-reconnect</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}

function Badge({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-ares-line bg-ares-mist px-2.5 py-1.5 text-[11px] font-medium text-ares-navy">
      <Icon className="h-3 w-3 text-ares-sea-deep" />
      {children}
    </span>
  );
}
