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
              Built to give every business an AI employee -- not just the big ones.
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Kevtech started with a simple frustration: small businesses in Ghana and across Africa were losing customers because they couldn't respond to WhatsApp messages fast enough. Owners were stretched thin. Inventory was guessed at. Orders got lost in chat threads.
              </p>
              <p>
                The platform isn't a chatbot bolted onto a dashboard. It's a multi-tenant operating system where every business gets its own isolated environment, its own AI trained on its own catalog, and its own automations. The AI doesn't hallucinate prices or make up products -- it only references what's actually in your database.
              </p>
              <p>
                Today Kevtech serves clothing stores, restaurants, schools, real estate agencies, and service businesses. Tomorrow, it serves whatever you build on top of it.
              </p>
            </div>
          </div>

          {/* Right: creator card + showcase image */}
          <div className="space-y-6">
            {/* Showcase image */}
            <div className="overflow-hidden rounded-2xl border border-ares-line">
              <img
                src="/images/showcase.jpg"
                alt="Kevtech platform showcase"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            {/* Creator card */}
            <div className="relative overflow-hidden rounded-2xl border border-ares-line bg-gradient-to-br from-ares-navy to-ares-sea-deep p-6 text-white">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ares-sea/20 blur-3xl" />
              <div className="relative">
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">
                  Created by
                </div>
                <div className="mt-2 text-2xl font-semibold ares-serif">Kelvin Ayinbisa</div>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  Designer and engineer of the Kevtech platform. Built from the ground up to give small businesses the same AI firepower that enterprises spend millions on -- at a fraction of the cost, with a focus on African business workflows first.
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <AresLogo className="h-6 w-6" variant="mono-light" />
                  <span className="text-[11px] tracking-wide text-white/60">Kevtech -- Automated Routing & Execution System</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
