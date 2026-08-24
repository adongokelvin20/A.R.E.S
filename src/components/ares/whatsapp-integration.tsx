"use client";

import { MessageCircle, Shield, Webhook, RefreshCw, ArrowRight, Lock } from "lucide-react";

const FLOW_STEPS = [
  {
    label: "Inbound message",
    detail: "Customer sends a WhatsApp message → Meta Cloud API or WAAPI.io gateway.",
  },
  {
    label: "Signature verified",
    detail: "A.R.E.S. validates the HMAC-SHA256 webhook signature against the per-tenant secret.",
  },
  {
    label: "Tenant resolved",
    detail: "Business is identified by the receiving phone number -- never by client-supplied ID.",
  },
  {
    label: "Customer matched",
    detail: "A.R.E.S. looks up the customer by WhatsApp ID or creates a new lead record.",
  },
  {
    label: "AI orchestrator",
    detail: "Sector-bound AI retrieves business context, knowledge, and available tools.",
  },
  {
    label: "Authorized action",
    detail: "AI executes only permitted tools. High-risk actions require owner approval.",
  },
  {
    label: "Outbound reply",
    detail: "Response is sent back through the same gateway with full audit logging.",
  },
];

export function AresWhatsApp() {
  return (
    <section id="whatsapp" className="relative py-24">
      <div className="absolute inset-0 ares-grid-bg opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-sea/20 bg-ares-foam px-3 py-1 text-xs font-medium text-ares-sea-deep">
            WhatsApp integration
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-ares-navy sm:text-4xl md:text-5xl">
            WhatsApp, done properly --{" "}
            <span className="ares-text-gradient">official APIs only</span>
          </h2>
          <p className="mt-5 text-balance text-base text-muted-foreground sm:text-lg">
            A.R.E.S. supports the official Meta WhatsApp Business Platform (Cloud API) and
            WAAPI.io as an alternative gateway. No unofficial scraping. No automation hacks. No
            fake connections -- every integration shows its real status.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Gateway cards */}
          <div className="lg:col-span-5">
            <div className="grid gap-4">
              <GatewayCard
                name="Meta WhatsApp Cloud API"
                badge="Official"
                description="The official WhatsApp Business Platform. Best for businesses that need template messages, official verification, and direct Meta support."
                features={[
                  "Official Cloud API",
                  "Template & session messaging",
                  "Webhook HMAC verification",
                  "Per-tenant phone number ID",
                ]}
                status="DISCONNECTED"
              />
              <GatewayCard
                name="WAAPI.io"
                badge="Alternative"
                description="A lighter alternative gateway for businesses that want a faster setup. A.R.E.S. treats it as a first-class channel with the same audit guarantees."
                features={[
                  "REST + Webhook API",
                  "Instance-based isolation",
                  "Same intelligent orchestration",
                  "Identical audit logging",
                ]}
                status="DISCONNECTED"
              />
            </div>
          </div>

          {/* Flow */}
          <div className="lg:col-span-7">
            <div className="relative h-full overflow-hidden rounded-3xl border border-ares-line bg-white p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ares-sea via-ares-sea-deep to-ares-navy" />
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ares-foam text-ares-sea-deep">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ares-navy">
                    Inbound message → authorized action
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    7-step pipeline · every step is audit-logged
                  </p>
                </div>
              </div>

              <ol className="mt-6 space-y-3">
                {FLOW_STEPS.map((s, i) => (
                  <li key={s.label} className="flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ares-sea-deep font-mono text-xs font-bold text-white">
                        {i + 1}
                      </div>
                      {i < FLOW_STEPS.length - 1 && (
                        <div className="my-1 w-px flex-1 bg-gradient-to-b from-ares-sea/40 to-ares-sea/10" />
                      )}
                    </div>
                    <div className="pb-2">
                      <div className="text-sm font-semibold text-ares-navy">{s.label}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {s.detail}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ares-line pt-5">
                <Badge icon={Shield}>Per-tenant secret</Badge>
                <Badge icon={Webhook}>Webhook verified</Badge>
                <Badge icon={Lock}>No client-trusted IDs</Badge>
                <Badge icon={RefreshCw}>Auto-reconnect</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GatewayCard({
  name,
  badge,
  description,
  features,
  status,
}: {
  name: string;
  badge: string;
  description: string;
  features: string[];
  status: "CONNECTED" | "DISCONNECTED";
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-ares-line bg-white p-5 ares-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-ares-navy">{name}</h4>
            <span className="rounded-md bg-ares-foam px-2 py-0.5 text-[10px] font-medium text-ares-sea-deep">
              {badge}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-ares-navy">
            <span className="h-1 w-1 rounded-full bg-ares-sea" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-ares-line pt-3">
        <div className="inline-flex items-center gap-1.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "CONNECTED" ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span className="text-muted-foreground">
            {status === "CONNECTED" ? "Connected" : "Connection required"}
          </span>
        </div>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-ares-sea-deep transition-colors hover:text-ares-navy">
          Connect
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function Badge({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-ares-line bg-ares-mist px-2.5 py-1.5 text-[11px] font-medium text-ares-navy">
      <Icon className="h-3 w-3 text-ares-sea-deep" />
      {children}
    </span>
  );
}
