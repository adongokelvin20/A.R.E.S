"use client";

import { useState, useEffect, useRef } from "react";
import { Plug, X, Loader2, Check, AlertCircle, Trash2, MessageCircle, CreditCard, Mail, QrCode, RefreshCw, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { launchEmbeddedSignup } from "@/lib/fb-sdk";

interface IntegrationRow {
  id: string;
  type: string;
  name: string;
  status: string;
  config: any;
  requiredFields: string[];
  embeddedSignup?: boolean;
  lastSyncAt: string | null;
}

const INTEGRATION_META: Record<
  string,
  {
    title: string;
    icon: any;
    color: string;
    description: string;
    fields?: { key: string; label: string; type: string; placeholder?: string; help?: string }[];
  }
> = {
  WHATSAPP_META: {
    title: "WhatsApp",
    icon: MessageCircle,
    color: "bg-emerald-50 text-emerald-600",
    description:
      "Connect your WhatsApp Business number in one click via Meta Embedded Signup. No tokens, no IDs, no webhook setup — just click and approve.",
  },
  PAYMENT_PAYSTACK: {
    title: "Paystack",
    icon: CreditCard,
    color: "bg-sky-50 text-sky-600",
    description: "Accept Mobile Money and card payments across Africa.",
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
  const [integrations, setIntegrations] = useState<IntegrationRow[]>(data.integrations ?? []);
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
          Connect real accounts. WhatsApp connects in one click — everything else is verified before showing as connected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Object.entries(INTEGRATION_META).map(([type, meta]) => {
          const integration = integrations.find((i) => i.type === type);
          const isConnected = integration?.status === "CONNECTED";
          const isError = integration?.status === "ERROR";
          const isWhatsApp = type === "WHATSAPP_META";
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
                  <Check className="h-3 w-3 shrink-0" />
                  {integration.config.message}
                </div>
              )}
              {isError && integration?.config?.message && (
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  {integration.config.message}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {!isConnected && (
                  <button
                    onClick={() => setConnecting(type)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ares-navy px-3 py-2 text-xs font-semibold text-white hover:bg-ares-sea-deep"
                  >
                    {isWhatsApp ? <MessageCircle className="h-3.5 w-3.5" /> : <Plug className="h-3.5 w-3.5" />}
                    {isWhatsApp ? "Connect WhatsApp" : "Connect"}
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
        connecting === "WHATSAPP_META" ? (
          <WhatsAppConnectModal
            onClose={() => setConnecting(null)}
            onConnected={() => {
              setConnecting(null);
              onChanged();
            }}
          />
        ) : (
          <ConnectModal
            type={connecting}
            meta={INTEGRATION_META[connecting]}
            onClose={() => setConnecting(null)}
            onConnected={() => {
              setConnecting(null);
              onChanged();
            }}
          />
        )
      )}
    </div>
  );
}

/* ============ WhatsApp Embedded Signup modal ============ */

function WhatsAppConnectModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [meta, setMeta] = useState<{ configured: boolean; appId: string; configId: string; signupUrl: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qr, setQr] = useState<{ qrCode: string; signupUrl: string; expiresIn: number } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/whatsapp/meta/embedded-signup")
      .then((r) => r.json())
      .then((j) => setMeta(j))
      .catch(() => setError("Could not load WhatsApp configuration."))
      .finally(() => setLoading(false));
  }, []);

  // Poll for connection status when QR is shown
  useEffect(() => {
    if (!showQr) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/status");
        const j = await res.json();
        if (j.status === "connected") {
          if (pollRef.current) clearInterval(pollRef.current);
          toast({ title: "WhatsApp connected", description: j.phoneNumber ? `Connected: ${j.phoneNumber}` : "Your WhatsApp is now live." });
          onConnected();
        }
      } catch {}
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [showQr, onConnected]);

  async function connectWithFacebook() {
    if (!meta?.configured) return;
    setConnecting(true);
    setError(null);
    try {
      const code = await launchEmbeddedSignup(meta.appId, meta.configId);
      // Exchange the code via the backend
      const res = await fetch("/api/whatsapp/meta/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        throw new Error(j.error ?? "Connection failed");
      }
      toast({ title: "WhatsApp connected", description: j.phoneNumber ? `Connected: ${j.phoneNumber}` : "Your WhatsApp is now live." });
      onConnected();
    } catch (e: any) {
      setError(e?.message ?? "Could not connect WhatsApp.");
    } finally {
      setConnecting(false);
    }
  }

  async function showQrCode() {
    setQrLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/qr", { method: "POST" });
      const j = await res.json();
      if (j.status === "not_configured") {
        setError("Meta WhatsApp Embedded Signup isn't configured on the server yet.");
        return;
      }
      if (j.status === "connected") {
        toast({ title: "Already connected", description: "WhatsApp is already connected." });
        onConnected();
        return;
      }
      if (j.qrCode) {
        setQr({ qrCode: j.qrCode, signupUrl: j.signupUrl, expiresIn: j.expiresIn ?? 300 });
        setShowQr(true);
      } else {
        setError("Could not generate QR code.");
      }
    } catch (e: any) {
      setError(e?.message ?? "QR generation failed.");
    } finally {
      setQrLoading(false);
    }
  }

  if (loading) {
    return (
      <ModalShell onClose={onClose} title="Connect WhatsApp">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-ares-sea-deep" />
        </div>
      </ModalShell>
    );
  }

  if (!meta?.configured) {
    return (
      <ModalShell onClose={onClose} title="Connect WhatsApp">
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-xs leading-relaxed text-amber-800">
                <p className="font-semibold">Server setup required</p>
                <p className="mt-1">
                  Meta WhatsApp Embedded Signup needs a one-time server configuration. The platform owner (Kevtech Corporation) must set these environment variables:
                </p>
                <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
                  <li>• META_APP_ID</li>
                  <li>• META_APP_SECRET</li>
                  <li>• META_CONFIG_ID</li>
                  <li>• META_VERIFY_TOKEN</li>
                </ul>
                <p className="mt-2">
                  Once configured, customers connect WhatsApp with a single click — no tokens, no IDs, no webhooks to manage.
                </p>
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            This is a one-time setup by the platform owner. Customers never see any of it.
          </p>
        </div>
      </ModalShell>
    );
  }

  if (showQr && qr) {
    return (
      <ModalShell onClose={onClose} title="Scan to connect WhatsApp">
        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <div className="rounded-2xl border border-ares-line bg-white p-4">
              <img src={qr.qrCode} alt="WhatsApp connect QR code" className="h-56 w-56" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-ares-sea-deep" />
              Waiting for you to scan and approve…
            </div>
            <p className="mt-2 max-w-xs text-center text-[11px] leading-relaxed text-muted-foreground">
              Open your phone camera, scan the QR code, and complete Meta's secure signup. This page will update automatically when WhatsApp is connected.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => { setShowQr(false); setQr(null); }}
                className="rounded-lg border border-ares-line bg-white px-3 py-1.5 text-xs font-medium text-ares-navy hover:bg-ares-mist"
              >
                Back
              </button>
              <a
                href={qr.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-ares-line bg-white px-3 py-1.5 text-xs font-medium text-ares-navy hover:bg-ares-mist"
              >
                <ExternalLink className="h-3 w-3" />
                Open on this device
              </a>
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
          )}
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Connect WhatsApp">
      <div className="space-y-4">
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-ares-foam p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ares-navy">One click. Zero technical setup.</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Click connect and approve on Meta. A.R.E.S. handles the access token, Phone Number ID, WhatsApp Business Account ID, webhook, and signature verification — all behind the scenes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={connectWithFacebook}
            disabled={connecting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1ebe57] disabled:opacity-60"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            {connecting ? "Opening Meta…" : "Connect WhatsApp"}
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-ares-line" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-ares-line" />
          </div>

          <button
            onClick={showQrCode}
            disabled={qrLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ares-line bg-white px-4 py-3 text-sm font-semibold text-ares-navy transition-all hover:bg-ares-mist disabled:opacity-60"
          >
            {qrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            {qrLoading ? "Generating…" : "Connect via QR code"}
          </button>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-ares-mist px-3 py-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-ares-sea-deep" />
          Official Meta Cloud API · 24-hour window respected · fully policy-compliant
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
        )}
      </div>
    </ModalShell>
  );
}

/* ============ Generic credential connect modal (Paystack, SMTP) ============ */

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
    <ModalShell onClose={onClose} title={`Connect ${meta.title}`}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-muted-foreground">{meta.description}</p>
        {meta.fields?.map((f) => (
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
      </form>
    </ModalShell>
  );
}

function ModalShell({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ares-navy/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-ares-line bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ares-line p-5">
          <h3 className="text-sm font-semibold text-ares-navy">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-ares-mist">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
