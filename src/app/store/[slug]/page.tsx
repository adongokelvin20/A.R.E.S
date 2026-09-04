/**
 * Public store page — /store/[slug]
 *
 * No auth required. Customers visit this URL to browse the business's
 * products and chat with the business's AI assistant (same AI that
 * handles WhatsApp). Conversations land in the owner's dashboard.
 */
import { notFound } from "next/navigation";
import { db, ensureDatabase } from "@/lib/db";
import { StoreChat } from "@/components/ares/store-chat";
import { AresLogo } from "@/components/ares/logo";
import { MessageCircle, Package, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const CURRENCY_SYMBOL: Record<string, string> = {
  GHS: "GH₵", NGN: "₦", KES: "KSh", USD: "$", GBP: "£", ZAR: "R", EUR: "€",
};
function sym(cur: string) {
  return CURRENCY_SYMBOL[cur] ?? cur + " ";
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // If db is null (DATABASE_URL not configured), show a helpful error
  if (!db) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ares-mist px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-ares-navy">Store is being set up</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The database isn't connected yet. The business owner needs to configure the database URL. Please check back soon.
          </p>
        </div>
      </main>
    );
  }

  // Ensure the database tables exist (handles first-visit on a fresh Vercel deployment)
  try {
    await ensureDatabase();
  } catch (e) {
    console.error("[store page] ensureDatabase failed:", e);
  }

  // Fetch the business + products in one try/catch so any DB error renders a
  // graceful "store not available" page instead of crashing with a 500.
  let business: any = null;
  let products: any[] = [];

  try {
    business = await db.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        currency: true,
        agentName: true,
        phone: true,
        email: true,
        sectorSubtype: true,
      },
    });

    if (!business) {
      notFound();
    }

    products = await db.product.findMany({
      where: { businessId: business.id, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        category: true,
        imageUrl: true,
        imageAlt: true,
        stock: true,
        attributes: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (e: any) {
    // If it's a notFound() call, re-throw it (Next.js handles that)
    if (e && typeof e === "object" && "digest" in e) {
      throw e;
    }
    console.error("[store page] database error:", e);
    // Render a graceful error page with a retry button instead of a 500 crash
    return (
      <main className="flex min-h-screen items-center justify-center bg-ares-mist px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-ares-navy">Store is warming up</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;re getting things ready. Please refresh in a moment, or contact the business directly.
          </p>
          <a
            href={`/store/${slug}`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep"
          >
            Try again
          </a>
        </div>
      </main>
    );
  }

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const publicProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    currency: p.currency,
    category: p.category,
    imageUrl: p.imageUrl,
    imageAlt: p.imageAlt,
    inStock: p.stock > 0,
    attributes: JSON.parse(p.attributes || "{}"),
  }));

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
      {publicProducts.length === 0 ? (
        <section className="mx-auto max-w-5xl px-4 py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-lg font-semibold text-ares-navy">Products coming soon</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We're still setting up our catalog. In the meantime, chat with {business.agentName || "us"} — we'd love to help you find what you need.
          </p>
        </section>
      ) : (
        <section id="products" className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-semibold text-ares-navy">Our products</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {publicProducts.length} item{publicProducts.length !== 1 ? "s" : ""} · Chat with {business.agentName || "us"} to order
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
            {publicProducts.map((p) => (
              <article
                key={p.id}
                onClick={() => {
                  // Dispatch a global event that StoreChat listens for to open the chat + send a message
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("ares-product-click", { detail: { productName: p.name } }));
                  }
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

      {/* Floating chat (always available) */}
      <StoreChat
        slug={business.slug}
        businessName={business.name}
        agentName={business.agentName || business.name}
        products={publicProducts}
      />
    </main>
  );
}
