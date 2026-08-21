"use client";

import { useState } from "react";
import { Loader2, ArrowRight, ArrowLeft, Check, X, Plus } from "lucide-react";
import { AresLogo } from "./logo";
import { SECTOR_CATALOG, COUNTRIES, type SectorCategory, type SectorSubtype } from "@/lib/sector-catalog";

interface OnboardingProps {
  businessId: string;
  ownerName: string;
  onComplete: () => void;
}

interface SelectedSector {
  category: string;
  subtype: string;
  categoryLabel: string;
  subtypeLabel: string;
}

const ICONS: Record<string, () => JSX.Element> = {
  "stethoscope": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 8V4h4M20 8V4h-4M4 12h16M12 12v8a4 4 0 0 0 4-4"/></svg>,
  "shopping-bag": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>,
  "utensils": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 2v20M21 2v20M21 2h-2a4 4 0 0 0-4 4v6c0 1.1.9 2 2 2h4"/></svg>,
  "graduation-cap": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/></svg>,
  "building": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>,
  "wrench": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8z"/></svg>,
  "briefcase": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  "sprout": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 20h10M10 20c5.5-2.5 5.5-7.5 5.5-7.5h-3c0-3-2.5-5-5-5 0 5 0 8 2.5 12.5M7 20c-1.5-3-1.5-6-1.5-9 2.5 0 4 1.5 4.5 3"/></svg>,
  "car": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14M5 17a2 2 0 1 1-4 0M19 17a2 2 0 1 0 4 0M3 17v-5l2-5h14l2 5v5"/></svg>,
  "cpu": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>,
  "bed": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M2 16h20M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/></svg>,
  "factory": () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20V8l5 4V8l5 4V8l5 4V4h3v16"/></svg>,
};

export function AresOnboarding({ businessId, ownerName, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [activeCategory, setActiveCategory] = useState<SectorCategory | null>(null);
  const [selectedSectors, setSelectedSectors] = useState<SelectedSector[]>([]);
  const [country, setCountry] = useState("GH");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSubtype(cat: SectorCategory, st: SectorSubtype) {
    setSelectedSectors((prev) => {
      const key = `${cat.id}:${st.id}`;
      const exists = prev.find((s) => `${s.category}:${s.subtype}` === key);
      if (exists) {
        return prev.filter((s) => `${s.category}:${s.subtype}` !== key);
      }
      return [...prev, { category: cat.id, subtype: st.id, categoryLabel: cat.label, subtypeLabel: st.label }];
    });
  }

  function isSubtypeSelected(catId: string, stId: string) {
    return selectedSectors.some((s) => s.category === catId && s.subtype === stId);
  }

  async function finish() {
    if (selectedSectors.length === 0) {
      setError("Pick at least one business type.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Use the first selected sector as primary, store all as secondary
      const primary = selectedSectors[0];
      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          sectorCategory: primary.category,
          sectorSubtype: primary.subtype,
          // Store all selected sectors (multi-sector support)
          allSectors: selectedSectors,
          country,
          description,
          phone,
          address,
          ownerFirstName: ownerName,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Onboarding failed");
      onComplete();
    } catch (e: any) {
      setError(e?.message ?? "Failed to complete onboarding");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ares-navy/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-4xl overflow-hidden rounded-2xl border border-ares-line bg-white shadow-2xl">
        <div className="h-0.5 bg-gradient-to-r from-ares-sea to-ares-sea-deep" />
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <AresLogo className="h-10 w-10" />
            <div>
              <h2 className="text-base font-semibold text-ares-navy">Set up your workspace</h2>
              <p className="text-xs text-muted-foreground">
                {step === 0 ? "Step 1 of 2 · What does your business do?" : "Step 2 of 2 · Last details"}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4 flex gap-1.5">
            {[0, 1].map((i) => (
              <div key={i} className={`h-0.5 flex-1 rounded-full ${i <= step ? "bg-ares-sea" : "bg-ares-line"}`} />
            ))}
          </div>

          {/* Step 0: pick sectors (multi-select) */}
          {step === 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-ares-navy">Which best describes your business?</h3>
              <p className="mt-1 text-xs text-muted-foreground">Pick all that apply -- you can combine multiple types. Your dashboard and AI will adapt.</p>

              {/* Selected chips */}
              {selectedSectors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedSectors.map((s) => (
                    <span key={`${s.category}:${s.subtype}`} className="inline-flex items-center gap-1.5 rounded-full bg-ares-foam px-2.5 py-1 text-[11px] font-medium text-ares-sea-deep">
                      {s.subtypeLabel}
                      <button onClick={() => toggleSubtype(SECTOR_CATALOG.find((c) => c.id === s.category)!, SECTOR_CATALOG.find((c) => c.id === s.category)!.subtypes.find((st) => st.id === s.subtype)!)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Category accordion */}
              <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto ares-scroll pr-1">
                {SECTOR_CATALOG.map((cat) => {
                  const isActive = activeCategory?.id === cat.id;
                  const Icon = ICONS[cat.icon] ?? ICONS["briefcase"];
                  const selectedInCat = selectedSectors.filter((s) => s.category === cat.id);
                  return (
                    <div key={cat.id} className={`rounded-xl border transition-all ${isActive ? "border-ares-sea/40" : "border-ares-line"}`}>
                      <button
                        onClick={() => setActiveCategory(isActive ? null : cat)}
                        className="flex w-full items-center gap-3 p-3.5 text-left"
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-ares-sea-deep text-white" : "bg-ares-foam text-ares-sea-deep"}`}>
                          <Icon />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-ares-navy">{cat.label}</div>
                          <div className="text-[11px] text-muted-foreground">{cat.subtypes.length} types</div>
                        </div>
                        {selectedInCat.length > 0 && (
                          <span className="rounded-full bg-ares-sea/10 px-2 py-0.5 text-[10px] font-bold text-ares-sea-deep">{selectedInCat.length}</span>
                        )}
                      </button>
                      {isActive && (
                        <div className="border-t border-ares-line p-2">
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {cat.subtypes.map((st) => {
                              const selected = isSubtypeSelected(cat.id, st.id);
                              return (
                                <button
                                  key={st.id}
                                  onClick={() => toggleSubtype(cat, st)}
                                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all ${selected ? "border-ares-sea bg-ares-foam/40" : "border-ares-line hover:border-ares-sea/30 hover:bg-ares-mist"}`}
                                >
                                  <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${selected ? "bg-ares-sea-deep text-white" : "border border-ares-line"}`}>
                                    {selected && <Check className="h-3 w-3" />}
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-ares-navy">{st.label}</div>
                                    <div className="text-[10px] text-muted-foreground">{st.description}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">{selectedSectors.length} selected</p>
                <button
                  onClick={() => { if (selectedSectors.length > 0) setStep(1); else setError("Pick at least one type."); }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep"
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: details + country */}
          {step === 1 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-ares-navy">Last few details</h3>
              <div>
                <label className="mb-1 block text-xs font-medium text-ares-navy">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-ares-line bg-white px-3.5 py-2.5 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">We'll set your currency based on your country.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ares-navy">Short description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What does your business do?"
                  className="w-full rounded-xl border border-ares-line bg-white px-3.5 py-2.5 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ares-navy">Business phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={COUNTRIES.find((c) => c.code === country)?.dialingCode ?? "+233"}
                    className="w-full rounded-xl border border-ares-line bg-white px-3.5 py-2.5 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ares-navy">Address (optional)</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, city"
                    className="w-full rounded-xl border border-ares-line bg-white px-3.5 py-2.5 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
                  />
                </div>
              </div>
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
              )}
              <div className="mt-4 flex justify-between">
                <button onClick={() => setStep(0)} className="inline-flex items-center gap-1.5 rounded-xl border border-ares-line bg-white px-4 py-2.5 text-sm font-semibold text-ares-navy hover:border-ares-sea/40">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <button
                  onClick={finish}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Setting up…" : "Finish setup →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
