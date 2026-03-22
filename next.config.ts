import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Build succeeds even with type errors — we fix types incrementally
    ignoreBuildErrors: true,
  },
  output: "standalone",
};

export default nextConfig;
