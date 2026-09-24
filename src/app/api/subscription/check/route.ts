/**
 * GET /api/subscription/check
 *
 * Diagnostic endpoint — checks if Paystack is configured correctly.
 * Returns whether the secret key is set and starts with "sk_".
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPaystackConfig } from "@/lib/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg = getPaystackConfig();

  return NextResponse.json({
    secretKeySet: !!cfg.secretKey,
    secretKeyStartsWithSk: cfg.secretKey.startsWith("sk_"),
    secretKeyLength: cfg.secretKey.length,
    publicKeySet: !!cfg.publicKey,
    publicKeyStartsWithPk: cfg.publicKey.startsWith("pk_"),
    configured: !!cfg.secretKey && cfg.secretKey.startsWith("sk_"),
    message: !cfg.secretKey
      ? "PAYSTACK_SECRET_KEY is not set. Go to Vercel → Settings → Environment Variables and add it."
      : !cfg.secretKey.startsWith("sk_")
      ? `PAYSTACK_SECRET_KEY is set but doesn't start with 'sk_' (it starts with '${cfg.secretKey.slice(0, 3)}'). You might have entered the public key instead. The SECRET key starts with 'sk_' and the PUBLIC key starts with 'pk_'.`
      : "Paystack is configured correctly.",
  });
}
