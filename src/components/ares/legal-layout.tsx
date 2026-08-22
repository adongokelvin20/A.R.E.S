"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AresLogo } from "@/components/ares/logo";

export function LegalLayout({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-ares-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <AresLogo className="h-7 w-7" />
            <span className="text-sm font-bold tracking-wider text-ares-navy">A.R.E.S.</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-ares-sea-deep">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-ares-navy sm:text-3xl">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        <div className="prose prose-sm mt-8 max-w-none text-sm leading-relaxed text-ares-navy/90">
          {children}
        </div>
      </main>
      <footer className="border-t border-ares-line bg-ares-mist">
        <div className="mx-auto max-w-3xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
          <p>A.R.E.S. -- Automated Routing and Execution System</p>
          <p className="mt-1">Created by Kelvin Ayinbisa · Kevtech</p>
        </div>
      </footer>
    </div>
  );
}
