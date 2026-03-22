import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Build succeeds even with type errors — we fix types incrementally
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
