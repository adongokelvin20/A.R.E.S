import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn"],
  serverExternalPackages: ["bcryptjs", "@prisma/client", "z-ai-web-dev-sdk"],
};

export default nextConfig;
