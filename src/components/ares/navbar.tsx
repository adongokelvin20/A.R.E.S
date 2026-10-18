"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { AresLogo } from "./logo";

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
];

export function AresNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled ? "py-2" : "py-4")}>
      <div className={cn(
        "mx-auto flex max-w-6xl items-center justify-between px-4 transition-all duration-300 sm:px-6",
        scrolled ? "ares-glass h-14 rounded-full shadow-[0_4px_24px_-8px_rgba(10,22,38,0.10)]" : "h-16"
      )}>
        <Link href="/" className="flex items-center gap-2.5">
          <AresLogo className="h-8 w-8" />
          <div className="flex flex-col leading-none">
            {/* When NOT scrolled (over dark hero), text is white. When scrolled (glass bg), text is navy */}
            <span className={cn("text-sm font-bold tracking-[0.14em] transition-colors", scrolled ? "text-ares-navy" : "text-white")}>ChattBiz</span>
            <span className={cn("text-[9px] tracking-wide transition-colors", scrolled ? "text-muted-foreground" : "text-white/60")}>by Kevtech Corporation</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className={cn("rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:text-ares-sea", scrolled ? "text-muted-foreground hover:text-ares-navy" : "text-white/80 hover:text-white")}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/auth" className={cn("rounded-lg px-3 py-2 text-[13px] font-medium transition-colors", scrolled ? "text-ares-navy hover:text-ares-sea-deep" : "text-white hover:text-white/80")}>
            Sign in
          </Link>
          <Link href="/auth" className="rounded-lg bg-ares-navy px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-ares-sea-deep">
            Get started
          </Link>
        </div>

        <button aria-label="Toggle menu" onClick={() => setOpen((v) => !v)} className={cn("rounded-lg p-2 lg:hidden", scrolled ? "text-ares-navy" : "text-white")}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="mx-4 mt-2 rounded-2xl border border-ares-line bg-white p-4 shadow-lg lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ares-navy hover:bg-ares-foam hover:text-ares-sea-deep">
                {l.label}
              </a>
            ))}
            <Link href="/auth" onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-ares-navy px-4 py-2.5 text-center text-sm font-semibold text-white">
              Get started →
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
