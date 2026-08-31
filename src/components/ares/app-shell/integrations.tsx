"use client";

import { useState, useEffect } from "react";
import { Plug, X, Loader2, Check, AlertCircle, Trash2, MessageCircle, CreditCard, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const INTEGRATION_META: Record<string, { title: string; icon: any; color: string; description: string; fields: { key: string; label: string; type: string; placeholder?: string; help?: string }[] }> = {
  WHATSAPP_META: {
    title: "WhatsApp Cloud API (Meta)",
    icon: MessageCircle,
    color: "bg-emerald-50 text-emerald-600",
    description: "Official WhatsApp Business Cloud API. Best for businesses that need template messages and direct Meta support.",
    fields: [
      { key: "phoneNumberId", label: "Phone Number ID", type: "text", placeholder: "e.g. 123456789012345", help: "From Meta App Dashboard → WhatsApp → Phone numbers." },
      { key: "wabaId", label: "WhatsApp Business Account ID", type: "text", placeholder: "e.g. 987654321098765" },
      { key: "accessToken", label: "Access Token", type: "password", placeholder: "Permanent system user token", help: "From Meta Business Manager → System Users." },
      { key: "verifyToken", label: "Webhook Verify Token (optional)", type: "text", placeholder: "Any string you choose", help: "Set this same value when configuring the webhook URL in Meta." },
    ],
  },
  WHATSAPP_WAAPI: {
    title: "WAAPI.io",
    icon: MessageCircle,
    color: "bg-emerald-50 text-emerald-600",
    description: "WAAPI.io -- alternative WhatsApp gateway. Faster setup, lighter footprint.",
    fields: [
      { key: "instanceId", label: "Instance ID", type: "text", placeholder: "From your WAAPI dashboard" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "Your WAAPI API key" },
    ],
  },
  PAYMENT_PAYSTACK: {
    title: "Paystack",
    icon: CreditCard,
    color: "bg-sky-50 text-sky-600",
    description: "Paystack -- accept Mobile Money and card payments across Africa.",
    fields: [
      { key: "secretKey", label: "Secret Key", type: "password", placeholder: "sk_live_..." },
      { key: "publicKey", label: "Public Key", type: "text", placeholder: "pk_live_..." },
    ],
  },
  EMAIL_SMTP: {
    title: "Email (SMTP)",
    icon: Mail,
    color: "bg-amber-50 text-amber-600",
    description: "SMTP for sending receipts, notifications, and customer emails.",
    fields: [
      { key: "host", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com" },
      { key: "port", label: "Port", type: "text", placeholder: "587" },
      { key: "username", label: "Username", type: "text", placeholder: "you@business.com" },
      { key: "password", label: "Password", type: "password" },
    ],
  },
};

export function AresIntegrations({ data, onChanged }: { data: any; onChanged: () => void }) {
  const [integrations, setIntegrations] = useState<any[]>(data.integrations ?? []);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIntegrations(data.integrations ?? []);
  }, [data]);

  async function disconnect(type: string) {
    if (!confirm(`Disconnect ${INTEGRATION_META[type]?.title ?? type}?`)) return;
    setLoading((s) => ({ ...s, [type]: true }));
    try {
      await fetch(`/api/integrations?type=${type}`, { method: "DELETE" });
      toast({ title: "Disconnected", description: `${INTEGRATION_META[type]?.title ?? type} has been disconnected.` });
      onChanged();
    } finally {
      setLoading((s) => ({ ...s, [type]: false }));
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ares-navy">Integrations</h2>
        <p className="text-xs text-muted-foreground">
          Connect real accounts. Credentials are stored server-side and verified before showing as connected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Object.entries(INTEGRATION_META).map(([type, meta]) => {
          const integration = integrations.find((i) => i.type === type);
          const isConnected = integration?.status === "CONNECTED";
          const isError = integration?.status === "ERROR";
          return (
            <div
              key={type}
              className={`overflow-hidden rounded-2xl border bg-white p-5 transition-all ${
                isConnected ? "border-emerald-200" : isError ? "border-rose-200" : "border-ares-line"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.color}`}>
                    <meta.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ares-navy">{integration?.name ?? meta.title}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${
                    isConnected
                      ? "bg-emerald-100 text-emerald-700"
                      : isError
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isConnected ? "● Connected" : isError ? "● Error" : "○ Disconnected"}
                </span>
              </div>

              {isConnected && integration?.config?.message && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700">
                  <Check className="h-3 w-3" />
                  {integration.config.message}
                </div>
              )}
              {isError && integration?.config?.message && (
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  {integration.config.message}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {!isConnected && (
                  <button
                    onClick={() => setConnecting(type)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ares-navy px-3 py-2 text-xs font-semibold text-white hover:bg-ares-sea-deep"
                  >
                    <Plug className="h-3.5 w-3.5" />
                    Connect
                  </button>
                )}
                {isConnected && (
                  <button
                    onClick={() => disconnect(type)}
                    disabled={loading[type]}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ares-line bg-white px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    {loading[type] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {connecting && INTEGRATION_META[connecting] && (
        <ConnectModal
          type={connecting}
          meta={INTEGRATION_META[connecting]}
          onClose={() => setConnecting(null)}
          onConnected={() => {
            setConnecting(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function ConnectModal({
  type,
  meta,
  onClose,
  onConnected,
}: {
  type: string;
  meta: typeof INTEGRATION_META[string];
  onClose: () => void;
  onConnected: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, credentials: values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Connection failed");
      if (json.status === "ERROR") {
        setError(json.message ?? "Verification failed. Check your credentials.");
        toast({ title: "Connection failed", description: json.message ?? "Check your credentials.", variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "Connected", description: `${meta.title} is now connected and working.` });
      onConnected();
    } catch (e: any) {
      setError(e?.message ?? "Failed");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ares-navy/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-ares-line bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ares-line p-5">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.color}`}>
              <meta.icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-ares-navy">Connect {meta.title}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-ares-mist">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-5">
          <p className="text-xs text-muted-foreground">{meta.description}</p>
          {meta.fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-ares-navy">{f.label}</label>
              <input
                type={f.type}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none"
              />
              {f.help && <p className="mt-1 text-[10px] text-muted-foreground">{f.help}</p>}
            </div>
          ))}
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-ares-line bg-white px-4 py-2 text-sm font-medium text-ares-navy">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ares-navy px-4 py-2 text-sm font-semibold text-white hover:bg-ares-sea-deep disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Verifying…" : "Connect"}
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground">
            A.R.E.S. verifies your credentials against the gateway before marking this as connected.
          </p>
        </form>
      </div>
    </div>
  );
}
