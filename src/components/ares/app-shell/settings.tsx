"use client";

import { useState } from "react";
import { Loader2, Check, Sparkles, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AresSettings({ data, onChanged }: { data: any; onChanged: () => void }) {
  const business = data.business;
  const [agentName, setAgentName] = useState(business.agentName);
  const [agentInstructions, setAgentInstructions] = useState(business.agentInstructions ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function savePersonalization(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName,
          agentInstructions,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      setSaved(true);
      toast({ title: "Settings saved", description: `Your AI assistant is now ${agentName}.` });
      onChanged();
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ares-navy">Settings</h2>
        <p className="text-xs text-muted-foreground">Personalize your AI assistant and manage your workspace</p>
      </div>

      {/* AI personalization */}
      <form onSubmit={savePersonalization} className="rounded-2xl border border-ares-line bg-white p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-ares-sea-deep" />
          <h3 className="text-sm font-semibold text-ares-navy">Your AI assistant</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Name your assistant and tell it exactly how you want it to act. Your instructions become its personality.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-ares-navy">Assistant name</label>
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="e.g. Maya, Kofi, Zoe, or anything you like"
            className="w-full rounded-xl border border-ares-line bg-white px-3.5 py-2.5 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none focus:ring-2 focus:ring-ares-sea/15"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">This is the name customers see when they chat with your assistant.</p>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-ares-navy">How should your assistant act?</label>
          <textarea
            value={agentInstructions}
            onChange={(e) => setAgentInstructions(e.target.value)}
            rows={5}
            placeholder={"Tell your assistant how to behave. Examples:\n\n• Be warm and friendly, use slang sometimes, crack a joke if the moment is right. Always recommend the jollof.\n• Be formal and professional. Keep answers short. Never use emojis.\n• Speak Twi first, then switch to English if they reply in English. Be patient with older customers.\n• Be energetic and enthusiastic. Celebrate when someone places an order. Use exclamation marks."}
            className="w-full rounded-xl border border-ares-line bg-white px-3.5 py-2.5 text-sm text-ares-navy placeholder:text-muted-foreground/70 focus:border-ares-sea/40 focus:outline-none focus:ring-2 focus:ring-ares-sea/15"
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Write in plain language. Your assistant will follow these instructions in every conversation. You can change this anytime.
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3 w-3" /> Saved -- your assistant now acts this way
            </span>
          )}
        </div>
      </form>

      {/* Business profile */}
      <div className="rounded-2xl border border-ares-line bg-white p-5">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-ares-sea-deep" />
          <h3 className="text-sm font-semibold text-ares-navy">Business profile</h3>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <Field label="Name" value={business.name} />
          <Field label="Sector" value={business.sectorLabel ?? business.type} />
          <Field label="Category" value={business.categoryLabel ?? "--"} />
          <Field label="Country" value={business.country} />
          <Field label="Currency" value={business.currency} />
          <Field label="Plan" value={business.plan} />
        </dl>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ares-mist p-2.5">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ares-navy">{value}</dd>
    </div>
  );
}
