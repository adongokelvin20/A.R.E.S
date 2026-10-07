import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn"],
  serverExternalPackages: ["bcryptjs", "@prisma/client", "z-ai-web-dev-sdk"],
  async headers() {
    return [
      { source: "/embed", headers: [{ key: "X-Frame-Options", value: "ALLOWALL" }, { key: "Content-Security-Policy", value: "frame-ancestors *; default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://api.vercel.app https://open.bigmodel.cn https://internal-api.z.ai https://openrouter.ai" }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }] },
      { source: "/embed/:slug", headers: [{ key: "X-Frame-Options", value: "ALLOWALL" }, { key: "Content-Security-Policy", value: "frame-ancestors *; default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://api.vercel.app https://open.bigmodel.cn https://internal-api.z.ai https://openrouter.ai" }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }] },
      { source: "/store/:slug", headers: [{ key: "X-Frame-Options", value: "DENY" }, { key: "Cache-Control", value: "no-cache, no-store, must-revalidate, max-age=0" }, { key: "Pragma", value: "no-cache" }, { key: "Expires", value: "0" }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }] },
      { source: "/((?!embed|_next/static|_next/image|favicon).*)", headers: [{ key: "X-Frame-Options", value: "DENY" }, { key: "Cache-Control", value: "no-cache, no-store, must-revalidate, max-age=0" }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }] },
    ];
  },
};

export default nextConfig;
