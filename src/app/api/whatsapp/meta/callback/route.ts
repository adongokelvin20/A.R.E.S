/**
 * GET /api/whatsapp/meta/callback?code=...&state=...
 *
 * The redirect URI Meta calls after the Embedded Signup completes.
 * Used by:
 *   - QR code flow (customer scans QR on phone → Meta auth → redirects here)
 *   - Mobile / direct-link connect
 *
 * `state` carries the businessId (set when building the OAuth URL).
 * This route runs the full completion pipeline and returns a self-contained
 * HTML page so the user sees confirmation in their browser.
 *
 * Note: this route is NOT behind the session — the customer may be completing
 * signup on their phone while their desktop holds the session. The businessId
 * in `state` is what links the connection to the right business.
 */
import { NextRequest } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { completeEmbeddedSignup, getMetaConfig } from "@/lib/meta-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function successHtml(businessName: string, phoneNumber: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>WhatsApp connected — A.R.E.S.</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0A1626;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:440px;width:100%;background:linear-gradient(135deg,#0A1626,#0369A1);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:40px 32px;text-align:center;box-shadow:0 24px 64px -16px rgba(0,0,0,0.5)}
  .check{width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,0.15);border:2px solid #10B981;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
  .check svg{width:32px;height:32px}
  h1{font-size:22px;font-weight:700;margin-bottom:8px;letter-spacing:-0.01em}
  p{font-size:14px;line-height:1.6;color:rgba(255,255,255,0.7);margin-bottom:8px}
  .phone{display:inline-block;margin-top:12px;padding:8px 16px;background:rgba(255,255,255,0.08);border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;color:#fff;font-weight:600}
  .biz{display:block;margin-top:4px;font-size:12px;color:rgba(255,255,255,0.5)}
  .hint{margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:rgba(255,255,255,0.5)}
</style>
</head>
<body>
<div class="card">
  <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
  <h1>WhatsApp is connected</h1>
  <p>Your WhatsApp Business number is now linked to A.R.E.S.</p>
  <span class="biz">${businessName}</span>
  <div class="phone">${phoneNumber}</div>
  <p class="hint">You can close this tab and return to your A.R.E.S. dashboard.<br/>Your assistant will start handling WhatsApp messages automatically.</p>
</div>
</body>
</html>`;
}

function errorHtml(message: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Connection issue — A.R.E.S.</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0A1626;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:440px;width:100%;background:linear-gradient(135deg,#0A1626,#7F1D1D);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:40px 32px;text-align:center;box-shadow:0 24px 64px -16px rgba(0,0,0,0.5)}
  .icon{width:64px;height:64px;border-radius:50%;background:rgba(239,68,68,0.15);border:2px solid #EF4444;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
  .icon svg{width:32px;height:32px}
  h1{font-size:22px;font-weight:700;margin-bottom:8px}
  p{font-size:14px;line-height:1.6;color:rgba(255,255,255,0.7);margin-bottom:8px}
  .msg{display:block;margin-top:12px;padding:12px 16px;background:rgba(255,255,255,0.06);border-radius:10px;font-size:13px;color:rgba(255,255,255,0.85);text-align:left;word-break:break-word}
  .hint{margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:rgba(255,255,255,0.5)}
</style>
</head>
<body>
<div class="card">
  <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
  <h1>Couldn't connect WhatsApp</h1>
  <p>Something went wrong during the connection.</p>
  <span class="msg">${message}</span>
  <p class="hint">Close this tab, return to your A.R.E.S. dashboard, and try again.<br/>If the problem persists, make sure your WhatsApp Business Account has at least one phone number.</p>
</div>
</body>
</html>`;
}

function notConfiguredHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Setup required — A.R.E.S.</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0A1626;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:460px;width:100%;background:linear-gradient(135deg,#0A1626,#0369A1);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:40px 32px;text-align:center}
  h1{font-size:20px;font-weight:700;margin-bottom:12px}
  p{font-size:14px;line-height:1.6;color:rgba(255,255,255,0.7)}
  code{display:block;margin-top:16px;padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;font-family:ui-monospace,monospace;font-size:12px;color:#7DD3FC;text-align:left}
</style>
</head>
<body>
<div class="card">
  <h1>WhatsApp Embedded Signup isn't configured yet</h1>
  <p>The platform owner needs to set up Meta credentials before WhatsApp can be connected. This is a one-time server configuration.</p>
  <code>META_APP_ID<br/>META_APP_SECRET<br/>META_CONFIG_ID<br/>META_VERIFY_TOKEN</code>
  <p style="margin-top:16px">Once configured, customers can connect WhatsApp with a single click.</p>
</div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // businessId
  const errorParam = searchParams.get("error");
  const errorReason = searchParams.get("error_reason") ?? searchParams.get("error_description");

  await ensureDatabase();

  // Meta OAuth error (user cancelled, etc.)
  if (errorParam) {
    const msg = errorReason ?? errorParam ?? "The signup was cancelled or failed.";
    return new Response(errorHtml(msg), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const cfg = getMetaConfig();
  if (!cfg.configured) {
    return new Response(notConfiguredHtml(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!code || !state) {
    return new Response(errorHtml("Missing authorization code or business reference."), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Look up the business name for the success page
  const business = await db.business.findUnique({
    where: { id: state },
    select: { name: true },
  });
  const businessName = business?.name ?? "your business";

  const result = await completeEmbeddedSignup(code, state, db);

  if (!result.ok) {
    return new Response(errorHtml(result.error ?? "Connection failed"), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(
    successHtml(businessName, result.phoneNumber ?? "your WhatsApp number"),
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
