import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Enable instrumentation.ts — starts BullMQ worker on server startup
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
