"use client";

import { Play, ArrowUpRight } from "lucide-react";
import { useState } from "react";

interface FeatureReel {
  video: string;
  poster: string;
  kicker: string;
  title: string;
  description: string;
  bullets: string[];
  metric: { value: string; label: string };
}

const REELS: FeatureReel[] = [
  {
    video: "/videos/feature-ai.mp4",
    poster: "/images/ai-2.jpg",
    kicker: "A.R.E.S. AI Core",
    title: "An intelligence layer that thinks before it acts",
    description:
      "Every customer message flows through an orchestration pipeline: intent detection, business context, memory retrieval, available-tool resolution, reasoning, action, and a natural-language response. A.R.E.S. only executes actions it is authorized to take — and never invents results.",
    bullets: [
      "Intent → context → tools → action → response",
      "Sector-specific prompt bound to your business",
      "Refuses to fabricate facts not in your knowledge base",
      "Audits every action with timestamp, actor, risk level",
    ],
    metric: { value: "<2 min", label: "Average first response" },
  },
  {
    video: "/videos/feature-network.mp4",
    poster: "/images/ai-1.jpg",
    kicker: "Integration Hub",
    title: "Omnichannel by architecture, not by accident",
    description:
      "WhatsApp (Meta Cloud API + WAAPI.io), Mobile Money, web chat, SMS, and email flow through one normalized message bus. Adding a new channel does not require rewriting the AI — it requires writing one adapter. The integration hub manages credentials, status, retries, and webhook verification per tenant.",
    bullets: [
      "Meta WhatsApp Business API (official)",
      "WAAPI.io as alternative gateway",
      "Per-tenant credential vault & webhook verification",
      "Provider-agnostic message normalization",
    ],
    metric: { value: "6+", label: "Channels through one bus" },
  },
];

export function AresFeatureReels() {
  return (
    <section id="ai-core" className="relative py-24">
      {/* Subtle backdrop */}
      <div className="absolute inset-0 ares-grid-bg opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-sea/20 bg-ares-foam px-3 py-1 text-xs font-medium text-ares-sea-deep">
            See it in motion
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-ares-navy sm:text-4xl md:text-5xl">
            Intelligence you can watch working
          </h2>
          <p className="mt-5 text-balance text-base text-muted-foreground sm:text-lg">
            A.R.E.S. orchestrates intent, knowledge, tools, and channels in real time. The two
            reels below visualize that pipeline — from inbound message to authorized action.
          </p>
        </div>

        <div className="mt-14 flex flex-col gap-12 lg:gap-16">
          {REELS.map((reel, idx) => (
            <FeatureReelCard key={reel.video} reel={reel} flip={idx % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureReelCard({ reel, flip }: { reel: FeatureReel; flip: boolean }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Video panel */}
      <div className={flip ? "lg:order-2" : ""}>
        <div className="group relative overflow-hidden rounded-3xl border border-ares-line bg-ares-navy shadow-[0_30px_80px_-30px_rgba(11,31,51,0.45)]">
          <div className="aspect-video w-full overflow-hidden">
            <video
              autoPlay
              muted
              loop
              playsInline
              poster={reel.poster}
              className="h-full w-full object-cover opacity-95 transition-transform duration-700 group-hover:scale-105"
              onPlay={() => setPlaying(true)}
            >
              <source src={reel.video} type="video/mp4" />
            </video>
          </div>
          {/* Top overlay bar */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ares-sea opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ares-sea" />
              </span>
              {playing ? "Live" : "Loading"}
            </div>
            <div className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
              4K · A.R.E.S. capture
            </div>
          </div>
          {/* Bottom gradient + caption */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ares-navy/85 via-ares-navy/40 to-transparent p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-ares-sea">
                  {reel.kicker}
                </div>
                <div className="mt-1 text-sm font-medium text-white">{reel.title}</div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-md">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Text panel */}
      <div className={flip ? "lg:order-1" : ""}>
        <div className="inline-flex items-center gap-2 rounded-full border border-ares-sea/20 bg-ares-foam px-3 py-1 text-xs font-medium text-ares-sea-deep">
          <ArrowUpRight className="h-3 w-3" />
          {reel.kicker}
        </div>
        <h3 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-ares-navy sm:text-3xl">
          {reel.title}
        </h3>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {reel.description}
        </p>
        <ul className="mt-6 space-y-2.5">
          {reel.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-ares-navy">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ares-sea" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {/* Metric */}
        <div className="mt-7 inline-flex items-center gap-4 rounded-2xl border border-ares-line bg-white px-5 py-4">
          <div className="font-mono text-3xl font-bold text-ares-sea-deep">
            {reel.metric.value}
          </div>
          <div className="text-xs text-muted-foreground">{reel.metric.label}</div>
        </div>
      </div>
    </div>
  );
}
