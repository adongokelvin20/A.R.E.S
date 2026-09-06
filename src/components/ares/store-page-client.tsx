"use client";

import { useState, useEffect } from "react";
import { StoreChat } from "@/components/ares/store-chat";
import { AresLogo } from "@/components/ares/logo";
import { MessageCircle, Package, AlertCircle, Loader2 } from "lucide-react";

const CURRENCY_SYMBOL: Record<string, string> = {
  GHS: "GH₵", NGN: "₦", KES: "KSh", USD: "$", GBP: "£", ZAR: "R", EUR: "€",
};
function sym(cur: string) {
  return CURRENCY_SYMBOL[cur] ?? cur + " ";
}

export function StorePageClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/store/${slug}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404) {
          if (mounted) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!mounted || !data) return;
        setBusiness(data.business);
        setProducts(data.products ?? []);
      })
      .catch((e) => {
        if (mounted) setError(e?.message ?? "Failed to load store");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [slug]);

  // Loading state
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-ares-sea-deep" />
          <p className="mt-3 text-sm text-muted-foreground">Loading store...</p>
        </div>
      </main>
    );
  }

  // Not found
  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ares-mist px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ares-foam text-ares-sea-deep">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-ares-navy">Store not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This store doesn&apos;t exist or hasn&apos;t been set up yet. Check the link and try again.
          </p>
          <a href="/" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep">
            Go to A.R.E.S.
          </a>
        </div>
      </main>
    );
  }

  // Error
  if (error || !business) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ares-mist px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-ares-navy">Store is warming up</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;re getting things ready. Please refresh in a moment.
          </p>
          <button onClick={() => window.location.reload()} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep">
            Try again
          </button>
        </div>
      </main>
    );
  }

  // Success — render the store
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <main className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-ares-line bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AresLogo className="h-8 w-8" />
            <div>
              <div className="text-sm font-bold text-ares-navy">{business.name}</div>
              <div className="text-[10px] text-muted-foreground">Online store · powered by A.R.E.S.</div>
            </div>
          </div>
          {business.phone && (
            <a href={`tel:${business.phone}`} className="text-xs font-medium text-ares-sea-deep hover:underline">
              {business.phone}
            </a>
          )}
        </div>
      </header>

      {/* Hero / banner */}
      <section className="border-b border-ares-line bg-gradient-to-br from-ares-mist to-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight text-ares-navy sm:text-4xl ares-serif">
            Welcome to {business.name}
          </h1>
          {business.description && (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {business.description}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-sm">
              <MessageCircle className="h-4 w-4" />
              Chat with {business.agentName || "us"}
            </div>
            {products.length > 0 && (
              <a href="#products" className="inline-flex items-center gap-2 rounded-xl border border-ares-line bg-white px-5 py-3 text-sm font-semibold text-ares-navy hover:bg-ares-mist">
                <Package className="h-4 w-4" />
                Browse products
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Products */}
      {products.length === 0 ? (
        <section className="mx-auto max-w-5xl px-4 py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-lg font-semibold text-ares-navy">Products coming soon</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;re still setting up our catalog. Chat with {business.agentName || "us"} — we&apos;d love to help.
          </p>
        </section>
      ) : (
        <section id="products" className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-semibold text-ares-navy">Our products</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} item{products.length !== 1 ? "s" : ""} · Chat to order
          </p>

          {categories.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <span key={c} className="rounded-full bg-ares-foam px-3 py-1 text-[11px] font-medium text-ares-sea-deep">
                  {c}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <article
                key={p.id}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("ares-product-click", { detail: { productName: p.name } }));
                }}
                className="cursor-pointer overflow-hidden rounded-2xl border border-ares-line bg-white transition-shadow hover:shadow-md"
              >
                <div className="aspect-square overflow-hidden bg-ares-mist">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.imageAlt || p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-ares-navy line-clamp-1">{p.name}</div>
                  {p.description && <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-ares-sea-deep">
                      {sym(p.currency)}{p.price.toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-medium ${p.inStock ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {p.inStock ? "In stock" : "Out"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-[#25D366]/10 py-1.5 text-[10px] font-medium text-[#075E54]">
                    <MessageCircle className="h-3 w-3" />
                    Tap to ask about this
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-ares-line bg-ares-mist py-6">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <AresLogo className="h-5 w-5" />
            <span>Store powered by A.R.E.S. · {business.name}</span>
          </div>
        </div>
      </footer>

      {/* Floating chat */}
      <StoreChat
        slug={business.slug}
        businessName={business.name}
        agentName={business.agentName || business.name}
        products={products}
      />
    </main>
  );
}
