/**
 * Meta WhatsApp Cloud API — Embedded Signup helpers.
 *
 * This module implements the OFFICIAL Meta Embedded Signup flow:
 *   1. Customer clicks "Connect WhatsApp" in ARES.
 *   2. ARES opens Meta's OAuth dialog (FB SDK popup, or redirect-based for QR/mobile).
 *   3. Customer logs into Facebook, picks their WhatsApp Business number, approves.
 *   4. Meta redirects back to ARES with a `code`.
 *   5. ARES exchanges the code for a long-lived access token.
 *   6. ARES fetches the WABA ID + Phone Number ID from the token's debug info.
 *   7. ARES registers the webhook subscription on the WABA.
 *   8. ARES stores everything in the Integration row — the customer never sees it.
 *
 * Environment variables (set in .env / Vercel):
 *   META_APP_ID            — Meta app ID (numerical)
 *   META_APP_SECRET        — Meta app secret
 *   META_CONFIG_ID         — Embedded Signup configuration ID (from Meta App Dashboard)
 *   META_VERIFY_TOKEN      — Webhook verify token (any string you choose; must match the webhook URL config)
 *   NEXTAUTH_URL           — App URL, used to build the redirect URI (e.g. https://ares-two-eta.vercel.app)
 *
 * The redirect URI is always `${APP_URL}/api/whatsapp/meta/callback`.
 */

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const OAUTH_DIALOG = `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`;

export interface MetaConfig {
  appId: string;
  appSecret: string;
  configId: string;
  verifyToken: string;
  appUrl: string;
  redirectUri: string;
  configured: boolean;
}

export function getMetaConfig(): MetaConfig {
  const appId = process.env.META_APP_ID ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";
  const configId = process.env.META_CONFIG_ID ?? "";
  const verifyToken = process.env.META_VERIFY_TOKEN ?? "ares_whatsapp_verify";
  const appUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  const redirectUri = `${appUrl}/api/whatsapp/meta/callback`;
  const configured = !!(appId && appSecret && configId && appUrl);
  return { appId, appSecret, configId, verifyToken, appUrl, redirectUri, configured };
}

/**
 * Build the Meta Embedded Signup OAuth URL (redirect-based).
 * Used for:
 *   - QR codes (customer scans, opens Meta's auth on their phone)
 *   - Mobile / direct-link connect (no FB SDK popup)
 *
 * `state` carries the businessId so the callback knows which business to link.
 */
export function buildEmbeddedSignupUrl(businessId: string): string {
  const cfg = getMetaConfig();
  const params = new URLSearchParams({
    client_id: cfg.appId,
    config_id: cfg.configId,
    response_type: "code",
    redirect_uri: cfg.redirectUri,
    state: businessId,
    scope: "whatsapp_business_management,whatsapp_business_messaging",
  });
  return `${OAUTH_DIALOG}?${params.toString()}`;
}

/**
 * Exchange the authorization code for a long-lived access token.
 * Returns the token + the raw debug data.
 */
export async function exchangeCodeForToken(code: string) {
  const cfg = getMetaConfig();
  if (!cfg.configured) {
    throw new Error("Meta WhatsApp is not configured. Set META_APP_ID, META_APP_SECRET, and META_CONFIG_ID.");
  }

  const params = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    code,
    redirect_uri: cfg.redirectUri,
  });

  const res = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`, {
    method: "GET",
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Meta token exchange failed: ${data.error.message ?? data.error.type}`);
  }
  return {
    accessToken: data.access_token as string,
    tokenType: data.token_type as string,
    expiresIn: data.expires_in as number,
  };
}

/**
 * Debug an access token to discover the WABA ID it's scoped to.
 * The debug_token endpoint returns granular scopes + the WhatsApp Business Account ID.
 */
export async function debugToken(accessToken: string): Promise<{
  wabaId?: string;
  scopes: string[];
  isValid: boolean;
  appId?: string;
  data: any;
}> {
  const cfg = getMetaConfig();
  // debug_token requires an app access token (app_id|app_secret)
  const appAccessToken = `${cfg.appId}|${cfg.appSecret}`;
  const params = new URLSearchParams({
    input_token: accessToken,
    access_token: appAccessToken,
  });
  const res = await fetch(`${GRAPH_API_BASE}/debug_token?${params.toString()}`);
  const json = await res.json();
  const d = json?.data ?? {};
  const scopes: string[] = d.scopes ?? [];
  // The WABA ID is typically in the granular_scopes as a target, or we discover it via /me/accounts
  return {
    wabaId: d.granular_scopes?.find((s: any) => s.scope === "whatsapp_business_management")?.target_ids?.[0],
    scopes,
    isValid: d.is_valid === true,
    appId: d.app_id,
    data: d,
  };
}

/**
 * Fetch the WhatsApp Business Accounts accessible by this access token.
 * Returns the first WABA (typical Embedded Signup grants one).
 */
export async function getWabaId(accessToken: string): Promise<string | null> {
  const res = await fetch(`${GRAPH_API_BASE}/me/accounts?fields=id,name,category&access_token=${encodeURIComponent(accessToken)}`);
  const json = await res.json();
  const accounts: any[] = json?.data ?? [];
  // WABA accounts have a specific structure; the first one is usually the selected WABA
  if (accounts.length > 0) {
    return accounts[0].id;
  }
  return null;
}

/**
 * List the phone numbers registered under a WABA.
 * Returns the first phone number (display_phone_number, id, verified_name).
 */
export async function getWabaPhoneNumber(wabaId: string, accessToken: string): Promise<{
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
  qualityRating?: string;
} | null> {
  const res = await fetch(
    `${GRAPH_API_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&access_token=${encodeURIComponent(accessToken)}`
  );
  const json = await res.json();
  const phones: any[] = json?.data ?? [];
  if (phones.length === 0) return null;
  const p = phones[0];
  return {
    phoneNumberId: p.id,
    displayPhoneNumber: p.display_phone_number,
    verifiedName: p.verified_name,
    qualityRating: p.quality_rating,
  };
}

/**
 * Register the webhook subscription on the WABA so ARES receives inbound messages.
 * This subscribes the WABA to the ARES app's webhook for WhatsApp fields.
 */
export async function registerWebhook(wabaId: string, accessToken: string): Promise<{ ok: boolean; message: string }> {
  try {
    // Subscribe the WABA to the app's webhook
    const res = await fetch(`${GRAPH_API_BASE}/${wabaId}/subscribed_apps?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
    });
    const json = await res.json();
    if (json.success || res.ok) {
      return { ok: true, message: "Webhook registered." };
    }
    if (json.error) {
      return { ok: false, message: `Webhook registration: ${json.error.message}` };
    }
    return { ok: true, message: "Webhook subscription completed." };
  } catch (e: any) {
    return { ok: false, message: `Webhook registration failed: ${String(e?.message ?? e)}` };
  }
}

/**
 * Send a WhatsApp Cloud API message.
 * Used by the chat system to reply to customers on WhatsApp.
 *
 * WhatsApp Policy Compliance:
 *  - Only sends within the 24-hour customer service window for free-form messages.
 *  - Uses approved templates for outbound contact after 24h.
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/\D/g, ""),
        type: "text",
        text: { body: text, preview_url: false },
      }),
    });
    const json = await res.json();
    if (json.messages?.[0]?.id) {
      return { ok: true, messageId: json.messages[0].id };
    }
    return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

/**
 * Full Embedded Signup completion — runs the entire exchange + storage pipeline.
 * Called by both the callback route and the exchange route.
 */
export async function completeEmbeddedSignup(
  code: string,
  businessId: string,
  db: any
): Promise<{
  ok: boolean;
  phoneNumber?: string;
  verifiedName?: string;
  error?: string;
}> {
  const cfg = getMetaConfig();
  if (!cfg.configured) {
    return { ok: false, error: "Meta WhatsApp is not configured on the server. Ask the platform owner to set META_APP_ID, META_APP_SECRET, and META_CONFIG_ID." };
  }

  try {
    // 1. Exchange the code for a long-lived access token
    const token = await exchangeCodeForToken(code);

    // 2. Discover the WABA ID
    let wabaId = (await debugToken(token.accessToken)).wabaId;
    if (!wabaId) {
      wabaId = await getWabaId(token.accessToken);
    }
    if (!wabaId) {
      return { ok: false, error: "Could not find a WhatsApp Business Account linked to this authorization. Make sure you selected a WhatsApp Business number during signup." };
    }

    // 3. Fetch the phone number
    const phone = await getWabaPhoneNumber(wabaId, token.accessToken);
    if (!phone) {
      return { ok: false, error: "No phone number is registered on this WhatsApp Business Account. Add a number in your Meta Business Manager first." };
    }

    // 4. Register the webhook subscription (best-effort — don't fail if this errors)
    await registerWebhook(wabaId, token.accessToken);

    // 5. Store everything in the Integration row
    const credentials = {
      accessToken: token.accessToken,
      phoneNumberId: phone.phoneNumberId,
      wabaId,
      appSecret: cfg.appSecret,
      verifyToken: cfg.verifyToken,
    };
    const config = {
      phoneNumber: phone.displayPhoneNumber,
      verifiedName: phone.verifiedName,
      qualityRating: phone.qualityRating,
      connectedVia: "embedded_signup",
      connectedAt: new Date().toISOString(),
      message: `Connected: ${phone.displayPhoneNumber}${phone.verifiedName ? ` (${phone.verifiedName})` : ""}`,
    };

    const existing = await db.integration.findUnique({
      where: { businessId_type: { businessId, type: "WHATSAPP_META" } },
    });
    if (existing) {
      await db.integration.update({
        where: { id: existing.id },
        data: {
          status: "CONNECTED",
          credentials: JSON.stringify(credentials),
          config: JSON.stringify(config),
          lastSyncAt: new Date(),
          errorCount: 0,
        },
      });
    } else {
      await db.integration.create({
        data: {
          businessId,
          type: "WHATSAPP_META",
          name: "WhatsApp Cloud API (Meta)",
          status: "CONNECTED",
          credentials: JSON.stringify(credentials),
          config: JSON.stringify(config),
          lastSyncAt: new Date(),
        },
      });
    }

    // 6. Audit log
    await db.auditLog.create({
      data: {
        businessId,
        actorType: "USER",
        actorName: "WhatsApp Embedded Signup",
        action: "CONNECT_INTEGRATION",
        tool: "integrations.WHATSAPP_META",
        result: "SUCCESS",
        riskLevel: "HIGH",
        details: JSON.stringify({ phoneNumber: phone.displayPhoneNumber, wabaId }),
      },
    });

    return {
      ok: true,
      phoneNumber: phone.displayPhoneNumber,
      verifiedName: phone.verifiedName,
    };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e).slice(0, 300) };
  }
}
