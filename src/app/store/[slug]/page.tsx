/**
 * Public store page — /store/[slug]
 *
 * This is a thin server component that extracts the slug and passes it
 * to the client component. The client component fetches from /api/store/[slug]
 * (which works on Vercel) — this avoids all server-side DB issues.
 */
import { StorePageClient } from "@/components/ares/store-page-client";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <StorePageClient slug={slug} />;
}
