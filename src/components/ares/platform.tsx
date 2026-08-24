"use client";

import { Brain, MessageSquare, Workflow, ShieldCheck, Database, Zap } from "lucide-react";

const PILLARS = [
  {
    icon: Brain,
    title: "An assistant that understands your business",
    body: "Your assistant reads your catalog, your policies, and your past conversations before it responds. It's not a generic chatbot -- it's trained on your specific business.",
  },
  {
    icon: MessageSquare,
    title: "Talks to your customers like a real employee",
    body: "Natural language, humor when it fits, opinions about your products. It handles WhatsApp chats, takes orders, answers questions, and remembers every customer.",
  },
  {
    icon: Workflow,
    title: "Automations you control",
    body: "Set rules: when stock drops, notify me. When a customer waits too long, acknowledge them. When an order comes in, send confirmation. Your rules stick until you change them.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    body: "Every business gets its own private space. No customer of yours ever sees another business's data. Your information is never shared.",
  },
  {
    icon: Database,
    title: "Real operations, not a prototype",
    body: "Products you add show up in your assistant's answers. Orders it takes appear in your dashboard. Integrations you connect actually work. Nothing is faked.",
  },
  {
    icon: Zap,
    title: "Built for African businesses, works anywhere",
    body: "Mobile Money, local phone formats, your currency, local delivery -- all built in. The same system works across Africa and beyond.",
  },
];

export function AresPlatform() {
  return (
    <section id="platform" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-line bg-ares-foam/50 px-3 py-1 text-[11px] font-medium text-ares-sea-deep">
            The platform
          </div>
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-ares-navy sm:text-4xl md:text-5xl ares-serif">
            Not a chatbot.<br />A real digital employee.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            A.R.E.S. is built as a complete business assistant that actually runs your business. The chat is just one way you interact with it -- underneath, it's taking orders, managing inventory, and remembering your customers.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-ares-line bg-ares-line sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <article key={p.title} className="group bg-white p-7 transition-colors hover:bg-ares-mist">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ares-foam text-ares-sea-deep">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-ares-navy">{p.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
