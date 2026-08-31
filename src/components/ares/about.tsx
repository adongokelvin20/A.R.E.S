"use client";

import { AresLogo } from "./logo";

export function AresAbout() {
  return (
    <section id="about" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left: the story */}
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-line bg-ares-foam/50 px-3 py-1 text-[11px] font-medium text-ares-sea-deep">
              The story
            </div>
            <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-ares-navy sm:text-4xl ares-serif">
              Kelvin Ayinbisa founded A.R.E.S. to give every business a digital employee.
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                It started with a simple frustration: small businesses in Ghana and across Africa were losing customers because they couldn't respond to WhatsApp messages fast enough. Owners were stretched thin. Inventory was guessed at. Orders got lost in chat threads.
              </p>
              <p>
                So Kelvin Ayinbisa — engineer, founder, and the architect behind the platform — built A.R.E.S., the Automated Routing and Execution System. It's not a chatbot bolted onto a dashboard. It's a complete digital employee that learns your business, talks to your customers, takes orders, manages inventory, and runs operations alongside you. Every business gets its own isolated environment with an assistant trained on its own catalog.
              </p>
              <p>
                Today A.R.E.S. serves clothing stores, restaurants, schools, real estate agencies, clinics, pharmacies, and service businesses across 8 industries. Tomorrow, it serves whatever you build on top of it. That's the vision — technology that works for everyone, designed and engineered under one roof.
              </p>
            </div>
          </div>

          {/* Right: showcase image + founder card */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-ares-line">
              <img
                src="/images/showcase.jpg"
                alt="A.R.E.S. platform showcase"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            {/* Founder card — Kelvin Ayinbisa */}
            <div className="relative overflow-hidden rounded-2xl border border-ares-line bg-gradient-to-br from-ares-navy to-ares-sea-deep p-6 text-white">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ares-sea/20 blur-3xl" />
              <div className="relative">
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">
                  Founded by
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-bold ares-serif">
                    KA
                  </div>
                  <div>
                    <div className="text-xl font-semibold ares-serif">Kelvin Ayinbisa</div>
                    <div className="text-[11px] text-white/60">Founder &amp; Lead Engineer, Kevtech Corporation</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/70">
                  Kelvin designed and engineered the entire A.R.E.S. platform — the multi-tenant architecture, the assistant core, the WhatsApp integration, and the operations layer. His mission is simple: build technology that levels the playing field for African businesses, then take it to the rest of the world.
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <AresLogo className="h-6 w-6" variant="mono-light" />
                  <span className="text-[11px] tracking-wide text-white/60">A.R.E.S. — Automated Routing &amp; Execution System</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
