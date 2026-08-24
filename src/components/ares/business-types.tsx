"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { id: "HEALTH", label: "Health", desc: "Clinics, hospitals, pharmacies, dental, optical", count: 5 },
  { id: "RETAIL", label: "Retail", desc: "Clothing, electronics, grocery, beauty, jewelry", count: 5 },
  { id: "FOOD", label: "Food & Beverage", desc: "Restaurants, cafes, catering, bakeries, food trucks", count: 5 },
  { id: "EDUCATION", label: "Education", desc: "Schools, tutoring, professional training", count: 3 },
  { id: "REAL_ESTATE", label: "Real Estate", desc: "Brokerage, property management, construction", count: 3 },
  { id: "SERVICES", label: "Services", desc: "Salons, repair, consultancy, cleaning, transport", count: 5 },
  { id: "FINANCE", label: "Finance & Legal", desc: "Accounting, legal, insurance", count: 3 },
  { id: "AGRICULTURE", label: "Agriculture", desc: "Farms, agro supplies", count: 2 },
];

export function AresBusinessTypes() {
  const [active, setActive] = useState(0);
  const cat = CATEGORIES[active];

  return (
    <section id="onboard" className="relative py-24 sm:py-32 bg-ares-mist">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-line bg-white px-3 py-1 text-[11px] font-medium text-ares-sea-deep">
            Built for every kind of business
          </div>
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-ares-navy sm:text-4xl ares-serif">
            One platform. Every sector.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            A.R.E.S. adapts to your business -- not the other way around. Pick your industry and a specific subtype, and your dashboard, assistant behavior, and tools all configure themselves to match.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c, i) => {
            const isActive = i === active;
            return (
              <button
                key={c.id}
                onClick={() => setActive(i)}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  isActive
                    ? "border-ares-sea bg-white shadow-[0_8px_32px_-12px_rgba(2,132,166,0.25)]"
                    : "border-ares-line bg-white/60 hover:border-ares-sea/30 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-ares-navy">{c.label}</div>
                  {isActive && <span className="rounded-md bg-ares-sea/10 px-1.5 py-0.5 text-[10px] font-medium text-ares-sea-deep">{c.count} types</span>}
                </div>
                <div className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{c.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Link href="/auth" className="inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep">
            <Plus className="h-3.5 w-3.5" />
            Set up your business
          </Link>
          <span className="text-xs text-muted-foreground">31+ business types across 8 industries</span>
        </div>
      </div>
    </section>
  );
}
