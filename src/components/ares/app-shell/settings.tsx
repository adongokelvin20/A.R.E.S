"use client";

import { useState } from "react";
import { Loader2, Check, Sparkles, Building2, Wallet, Code2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AresSettings({ data, onChanged }: { data: any; onChanged: () => void }) {
  const business = data.business;
  const [agentName, setAgentName] = useState(business.agentName);
  const [agentInstructions, setAgentInstructions] = useState(business.agentInstructions ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sector-specific placeholders
  const sector = business?.sectorCategory || business?.sectorSubtype || business?.type || "";
  const sectorLower = String(sector).toLowerCase();
  const isFood = sectorLower.includes("food") || sectorLower.includes("restaurant") || sectorLower.includes("restaur");
  const isHealth = sectorLower.includes("health") || sectorLower.includes("clinic") || sectorLower.includes("pharmac");
  const isRetail = sectorLower.includes("retail") || sectorLower.includes("cloth") || sectorLower.includes("fashion");
  const isRealEstate = sectorLower.includes("real") || sectorLower.includes("estate") || sectorLower.includes("propert");
  const isService = sectorLower.includes("service") || sectorLower.includes("salon") || sectorLower.includes("barber");
  const isSchool = sectorLower.includes("school") || sectorLower.includes("edu");

  const agentNamePlaceholder = isFood ? "e.g. Chef, Mama, Kofi" : isHealth ? "e.g. Doc, Nurse, Pharmacist" : isRetail ? "e.g. Maya, Kofi, Zoe" : isRealEstate ? "e.g. Agent, Prop, Maya" : isService ? "e.g. Boss, Stylist, Mike" : isSchool ? "e.g. Teacher, Admin, Grace" : "e.g. Maya, Kofi, Zoe, or anything you like";

  const instructionsPlaceholder = isFood
    ? "Tell your assistant how to behave. Examples:\n\n• Be warm and friendly. Mention today's specials. Recommend popular dishes.\n• Be formal and professional. Keep answers short. Never use emojis.\n• Speak Twi first, then switch to English if they reply in English."
    : isHealth
    ? "Tell your assistant how to behave. Examples:\n\n• Be patient and professional. Ask about symptoms before recommending products.\n• Be warm and reassuring. Remind customers about dosage instructions.\n• Be concise. Direct them to the pharmacist for prescription questions."
    : isRetail
    ? "Tell your assistant how to behave. Examples:\n\n• Be warm and stylish. Suggest matching items when someone orders. Use fashion language.\n• Be formal and professional. Keep answers short. Never use emojis.\n• Be energetic and enthusiastic. Celebrate when someone places an order."
    : isRealEstate
    ? "Tell your assistant how to behave. Examples:\n\n• Be professional and knowledgeable. Ask about budget and preferred location first.\n• Be warm and patient. Property decisions take time — don't rush customers.\n• Be concise. Direct them to schedule a viewing for serious inquiries."
    : isService
    ? "Tell your assistant how to behave. Examples:\n\n• Be friendly and energetic. Book appointments smoothly. Remind customers about prep (e.g. 'come with clean hair for the haircut').\n• Be professional and punctual. Confirm appointment times clearly.\n• Be warm and chatty. Make customers feel at ease."
    : isSchool
    ? "Tell your assistant how to behave. Examples:\n\n• Be patient and clear. Help parents with enrollment questions.\n• Be professional and organized. Direct them to the right department.\n• Be warm and encouraging. Make parents feel confident about the school."
    : "Tell your assistant how to behave. Examples:\n\n• Be warm and friendly, use slang sometimes, crack a joke if the moment is right.\n• Be formal and professional. Keep answers short. Never use emojis.\n• Speak Twi first, then switch to English if they reply in English. Be patient with older customers.";

  const paymentPlaceholder = isFood
    ? "MTN MoMo: 024 000 0000 (Your Name)\nTelecel Cash: 020 000 0000\nBank: GCB, Acc: 1234567890"
    : isHealth
    ? "MTN MoMo: 024 000 0000 (Your Name)\nCash accepted at pharmacy counter"
    : isRetail
    ? "MTN MoMo: 024 000 0000 (Your Name)\nTelecel Cash: 020 000 0000\nBank transfer available"
    : isRealEstate
    ? "MTN MoMo: 024 000 0000 (Your Name)\nBank: GCB, Acc: 1234567890\nCheque accepted for large deposits"
    : isService
    ? "MTN MoMo: 024 000 0000 (Your Name)\nCash accepted at salon/shop"
    : "MTN MoMo: 024 000 0000 (Your Name)\nTelecel Cash: 020 000 0000";

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
            placeholder={agentNamePlaceholder}
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
            placeholder={instructionsPlaceholder}
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

      {/* Payment accounts */}
      <PaymentAccounts business={business} />

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

      <div className="rounded-2xl border border-ares-line bg-gradient-to-br from-emerald-50/50 to-white p-5">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-ares-navy">Embed ARES on your website</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Add the AI assistant to any external website.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a href="/embed" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <ExternalLink className="h-4 w-4" /> Get embed snippet
          </a>
        </div>
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

function PaymentAccounts({ business }: { business: any }) {
  // Parse configuration once — paymentInfo, momoAccountName, paymentEnabled all live in business.configuration
  const parsedConfig = (() => { try { return JSON.parse(business.configuration || "{}"); } catch { return {}; } })();
  const [paymentInfo, setPaymentInfo] = useState(parsedConfig.paymentInfo ?? "");
  const [momoAccountName, setMomoAccountName] = useState(parsedConfig.momoAccountName ?? "");
  const [paymentEnabled, setPaymentEnabled] = useState(parsedConfig.paymentEnabled !== false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sector-specific payment placeholder
  const sector = business?.sectorCategory || business?.sectorSubtype || business?.type || "";
  const sectorLower = String(sector).toLowerCase();
  const isFood = sectorLower.includes("food") || sectorLower.includes("restaurant") || sectorLower.includes("restaur");
  const isHealth = sectorLower.includes("health") || sectorLower.includes("clinic") || sectorLower.includes("pharmac");
  const isRetail = sectorLower.includes("retail") || sectorLower.includes("cloth") || sectorLower.includes("fashion");
  const isRealEstate = sectorLower.includes("real") || sectorLower.includes("estate") || sectorLower.includes("propert");
  const isService = sectorLower.includes("service") || sectorLower.includes("salon") || sectorLower.includes("barber");
  const paymentPlaceholder = isFood
    ? "MTN MoMo: 024 000 0000 (Your Name)\nTelecel Cash: 020 000 0000\nBank: GCB, Acc: 1234567890"
    : isHealth
    ? "MTN MoMo: 024 000 0000 (Your Name)\nCash accepted at pharmacy counter"
    : isRetail
    ? "MTN MoMo: 024 000 0000 (Your Name)\nTelecel Cash: 020 000 0000\nBank transfer available"
    : isRealEstate
    ? "MTN MoMo: 024 000 0000 (Your Name)\nBank: GCB, Acc: 1234567890\nCheque accepted for large deposits"
    : isService
    ? "MTN MoMo: 024 000 0000 (Your Name)\nCash accepted at salon/shop"
    : "MTN MoMo: 024 000 0000 (Your Name)\nTelecel Cash: 020 000 0000";

  async function savePayment(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentName: business.agentName || "ChatBiz", agentInstructions: business.agentInstructions || "", paymentInfo, momoAccountName, paymentEnabled }) });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || `HTTP ${res.status}`); }
      setSaved(true); toast({ title: "Payment info saved", description: paymentEnabled ? "Payment enforcement is ON" : "Payment enforcement is OFF" }); setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { toast({ title: "Failed to save", description: e?.message, variant: "destructive" }); } finally { setLoading(false); }
  }

  return (
    <form onSubmit={savePayment} className="rounded-2xl border border-ares-line bg-white p-5">
      <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-ares-sea-deep" /><h3 className="text-sm font-semibold text-ares-navy">Payment accounts</h3></div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-ares-line bg-ares-mist/50 p-3">
        <div><div className="text-sm font-medium text-ares-navy">Remote Payment Enforcement</div><div className="text-[11px] text-muted-foreground">When ON: customers must pay before order is confirmed. When OFF: payment is optional.</div></div>
        <button type="button" onClick={() => setPaymentEnabled(!paymentEnabled)} className={`relative h-6 w-11 rounded-full transition-colors ${paymentEnabled ? "bg-emerald-500" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${paymentEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      <textarea value={paymentInfo} onChange={(e) => setPaymentInfo(e.target.value)} rows={4} placeholder={paymentPlaceholder} className="mt-3 w-full rounded-xl border border-ares-line bg-white px-3.5 py-2.5 text-sm text-ares-navy" />
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
        <label className="mb-1 block text-xs font-medium text-ares-navy">MoMo Account Holder Name (for payment verification)</label>
        <input type="text" value={momoAccountName} onChange={(e) => setMomoAccountName(e.target.value)} placeholder="e.g., Kelvin Ayinbisa" className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{loading ? "Saving..." : "Save payment info"}
        </button>
        {saved && <span className="text-xs text-emerald-600"><Check className="inline h-3 w-3" /> Saved</span>}
      </div>
    </form>
  );
}
