"use client";

import Link from "next/link";
import { AresLogo } from "./logo";

export function AresHero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Full-bleed video background */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
          onPlay={(e) => { (e.currentTarget as HTMLVideoElement).style.opacity = "1"; }}
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-ares-navy/85 via-ares-navy/75 to-ares-sea-deep/80" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 pt-24 pb-16 sm:px-6">
        <div className="max-w-2xl">
          {/* Brand */}
          <div className="ares-fade-up mb-8 flex items-center gap-3">
            <AresLogo className="h-12 w-12" />
            <div>
              <div className="text-lg font-bold tracking-[0.14em] text-white">A.R.E.S.</div>
              <div className="text-[10px] tracking-wide text-white/50">AUTOMATED ROUTING & EXECUTION</div>
            </div>
          </div>

          {/* Status pill */}
          <div className="ares-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm" style={{ animationDelay: "80ms" }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ares-sea opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ares-sea" />
            </span>
            The AI employee for your business
          </div>

          {/* Headline */}
          <h1 className="ares-fade-up text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl ares-serif" style={{ animationDelay: "160ms" }}>
            Hire an AI employee<br />that actually <span className="text-ares-sea italic">runs</span> your business.
          </h1>

          <p className="ares-fade-up mt-6 max-w-lg text-balance text-base leading-relaxed text-white/70 sm:text-lg" style={{ animationDelay: "240ms" }}>
            A.R.E.S. learns what your business does, talks to your customers on WhatsApp, takes orders, monitors operations, and gets things done -- while you focus on the work that matters.
          </p>

          {/* CTAs */}
          <div className="ares-fade-up mt-9 flex flex-col items-start gap-3 sm:flex-row" style={{ animationDelay: "320ms" }}>
            <Link href="/auth" className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-ares-navy shadow-[0_8px_32px_-8px_rgba(255,255,255,0.4)] transition-all hover:bg-white/90">
              Start free
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10">
              See how it works
            </a>
          </div>

          {/* Stats */}
          <div className="ares-fade-up mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4" style={{ animationDelay: "400ms" }}>
            {[
              { v: "10", l: "Industries" },
              { v: "40+", l: "Business types" },
              { v: "<2 min", l: "First response" },
              { v: "24/7", l: "Always on" },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-mono text-2xl font-bold text-white sm:text-3xl">{s.v}</div>
                <div className="mt-1 text-[11px] leading-tight text-white/50">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/20 p-1.5">
          <div className="h-2 w-0.5 animate-bounce rounded-full bg-white/40" />
        </div>
      </div>
    </section>
  );
}
