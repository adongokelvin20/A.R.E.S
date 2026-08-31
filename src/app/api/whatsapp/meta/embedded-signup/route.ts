/**
 * GET /api/whatsapp/meta/embedded-signup
 *
 * Returns the Meta Embedded Signup configuration the frontend needs to launch
 * the FB SDK popup, plus the full OAuth URL (used by the QR code / mobile redirect).
 *
 * The customer's businessId is taken from the session (never client-supplied).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMetaConfig, buildEmbeddedSignupUrl } from "@/lib/meta-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;
  const cfg = getMetaConfig();

  return NextResponse.json({
    configured: cfg.configured,
    appId: cfg.appId,
    configId: cfg.configId,
    redirectUri: cfg.redirectUri,
    // The full OAuth URL — encodes businessId in `state`
    signupUrl: cfg.configured ? buildEmbeddedSignupUrl(businessId) : null,
    state: businessId,
  });
}
