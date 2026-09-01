"use client";

import Link from "next/link";
import { AresLogo } from "./logo";

export function AresFooter() {
  return (
    <footer className="border-t border-ares-line bg-ares-mist">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <AresLogo className="h-9 w-9" />
              <div>
                <div className="text-sm font-bold tracking-[0.14em] text-ares-navy">A.R.E.S.</div>
                <div className="text-[9px] tracking-wide text-muted-foreground">A Kevtech Corporation product</div>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              The digital employee for your business. Founded by Kelvin Ayinbisa and built by Kevtech Corporation to give every business — not just the big ones — access to enterprise-grade operations technology.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <FooterCol title="Platform" links={[
              { label: "How it works", href: "#how" },
              { label: "WhatsApp", href: "#whatsapp" },
              { label: "Get started", href: "/auth" },
            ]} />
            <FooterCol title="Sectors" links={[
              { label: "Clothing store", href: "/auth" },
              { label: "Restaurant", href: "/auth" },
              { label: "School", href: "/auth" },
              { label: "Real estate", href: "/auth" },
              { label: "Service business", href: "/auth" },
            ]} />
            <FooterCol title="Account" links={[
              { label: "Sign up", href: "/auth" },
              { label: "Log in", href: "/auth?mode=login" },
            ]} />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-ares-line pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} Kevtech Corporation. All rights reserved.</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/legal/terms" className="hover:text-ares-sea-deep">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-ares-sea-deep">Privacy</Link>
            <Link href="/legal/refund" className="hover:text-ares-sea-deep">Refunds</Link>
            <Link href="/legal/cookies" className="hover:text-ares-sea-deep">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-ares-navy/80 transition-colors hover:text-ares-sea-deep">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
