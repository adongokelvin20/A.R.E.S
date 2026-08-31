"use client";

const CAPABILITIES = [
  "WhatsApp Business API",
  "Meta Cloud API",
  "WAAPI.io Gateway",
  "Mobile Money (MTN · Telecel · AT)",
  "GHS · USD · NGN · KES · ZAR · GBP",
  "Multi-tenant isolation",
  "Role-based access",
  "Audit-logged AI actions",
  "Omnichannel messaging",
  "Automation engine",
  "Knowledge base (RAG)",
  "Proactive alerts",
];

export function AresTrustBar() {
  return (
    <section className="border-y border-ares-line bg-ares-mist py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Built on real infrastructure
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div className="flex w-max ares-marquee gap-3">
              {[...CAPABILITIES, ...CAPABILITIES].map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ares-line bg-white px-3 py-1.5 text-xs font-medium text-ares-navy"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-ares-sea" />
                  {c}
                </span>
              ))}
            </div>
            {/* Fade edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-ares-mist to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-ares-mist to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
