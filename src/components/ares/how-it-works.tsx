"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    num: "01",
    title: "Sign up and pick your business type",
    desc: "Choose from 40+ business types across 10 industries. Your dashboard and assistant adapt to match.",
  },
  {
    num: "02",
    title: "Add your products and connect WhatsApp",
    desc: "Upload your catalog with images -- it analyzes each one so it can recognize products when customers describe them.",
  },
  {
    num: "03",
    title: "Your assistant starts working",
    desc: "Customers message you on WhatsApp. It answers, recommends products, takes orders with delivery details, and remembers every customer.",
  },
];

export function AresHowItWorks() {
  return (
    <section id="how" className="relative py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-line bg-ares-foam/50 px-3 py-1 text-[11px] font-medium text-ares-sea-deep">
            How it works
          </div>
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-ares-navy sm:text-4xl ares-serif">
            From signup to your first<br />assistant-handled order in minutes.
          </h2>
        </div>

        {/* Steps */}
        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.num} className="relative">
              <div className="font-mono text-5xl font-bold text-ares-sea/20">{s.num}</div>
              <h3 className="mt-3 text-lg font-semibold text-ares-navy">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Image showcase row */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ShowcaseImage src="/images/kevtech.jpg" alt="Business dashboard" label="Your dashboard" />
          <ShowcaseImage src="/images/kevtecc.jpg" alt="Assistant" label="Your assistant" />
          <ShowcaseImage src="/images/dfe.jpg" alt="Customer chat" label="Customer chats" />
          <ShowcaseImage src="/images/ai-1.jpg" alt="Orders" label="Orders" />
        </div>

        {/* Video showcase row */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <VideoCard
            src="/videos/feature-1.mp4"
            title="Customer conversations"
            caption="It handles WhatsApp chats naturally -- answers questions, recommends products, takes orders."
          />
          <VideoCard
            src="/videos/feature-2.mp4"
            title="Orders and fulfillment"
            caption="Every order it takes lands in your dashboard with pickup or delivery details, ready to review."
          />
          <VideoCard
            src="/videos/feature-3.mp4"
            title="Always-on monitoring"
            caption="Stock alerts, customer follow-ups, and daily briefings -- it watches your business around the clock."
          />
        </div>
      </div>
    </section>
  );
}

function ShowcaseImage({ src, alt, label }: { src: string; alt: string; label: string }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-ares-line bg-white">
      <div className="aspect-square overflow-hidden">
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-3">
        <div className="text-xs font-semibold text-ares-navy">{label}</div>
      </div>
    </div>
  );
}

function VideoCard({ src, title, caption }: { src: string; title: string; caption: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="group overflow-hidden rounded-2xl border border-ares-line bg-ares-navy">
      <div className="relative aspect-[9/16] overflow-hidden">
        <video
          ref={ref}
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
          preload={inView ? "auto" : "none"}
        >
          <source src={src} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-ares-navy/80 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/60">{caption}</p>
        </div>
      </div>
    </div>
  );
}
