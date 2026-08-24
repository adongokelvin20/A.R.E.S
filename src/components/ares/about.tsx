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
              Kevtech Corporation builds systems of immense value.
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Founded by <span className="font-semibold text-ares-navy">Kelvin Ayinbisa</span>, Kevtech Corporation builds technology that creates real, measurable value for businesses. We don't build apps -- we build systems that transform how businesses operate.
              </p>
              <p>
                A.R.E.S. is our flagship product. It's not a chatbot. It's a complete AI employee that learns your business, talks to your customers, takes orders, manages inventory, and runs operations alongside you. Every business gets its own isolated environment with an AI trained on its own catalog.
              </p>
              <p>
                Today A.R.E.S. serves clothing stores, restaurants, schools, clinics, pharmacies, real estate agencies, and service businesses across 12 industries. Tomorrow, it serves whatever you build on top of it. That's the Kevtech vision -- technology that works for everyone, not just the big players.
              </p>
            </div>
          </div>

          {/* Right: showcase image + company card */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-ares-line">
              <img
                src="/images/showcase.jpg"
                alt="A.R.E.S. platform showcase"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            {/* Company card */}
            <div className="relative overflow-hidden rounded-2xl border border-ares-line bg-gradient-to-br from-ares-navy to-ares-sea-deep p-6 text-white">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ares-sea/20 blur-3xl" />
              <div className="relative">
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">
                  A product of
                </div>
                <div className="mt-2 text-2xl font-semibold ares-serif">Kevtech Corporation</div>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  Building AI tools that level the playing field for African businesses. Kevtech Corporation designs technology that works the way you work -- fast, practical, and built for the real world.
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <AresLogo className="h-6 w-6" variant="mono-light" />
                  <span className="text-[11px] tracking-wide text-white/60">A.R.E.S. -- Automated Routing & Execution System</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
