/**
 * Rate limiting middleware for A.R.E.S.
 * Prevents abuse by limiting requests per IP address.
 * Uses in-memory store (sufficient for Vercel serverless functions).
 */

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = {
  "/api/auth/signup": 5,      // 5 signups per minute per IP
  "/api/auth/callback": 10,    // 10 login attempts per minute
  "/api/ares/chat": 30,        // 30 AI messages per minute
  "/api/products": 20,         // 20 product operations per minute
  "/api/orders": 20,           // 20 order operations per minute
  "default": 60,               // 60 requests per minute for everything else
};

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}, 60 * 1000);

export function checkRateLimit(identifier: string, path: string): { allowed: boolean; remaining: number; resetIn: number } {
  const key = `${identifier}:${path}`;
  const now = Date.now();

  // Find the limit for this path
  let limit = RATE_LIMIT_MAX.default;
  for (const [routePath, routeLimit] of Object.entries(RATE_LIMIT_MAX)) {
    if (routePath !== "default" && path.startsWith(routePath)) {
      limit = routeLimit;
      break;
    }
  }

  const entry = store.get(key);

  if (!entry || entry.resetTime < now) {
    // First request or window expired
    store.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: limit - 1, resetIn: RATE_LIMIT_WINDOW };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetTime - now };
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}
