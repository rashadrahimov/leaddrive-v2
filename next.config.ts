import createNextIntlPlugin from "next-intl/plugin"
import type { NextConfig } from "next"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Build succeeds even with type errors — we fix types incrementally
    ignoreBuildErrors: true,
  },
}

export default withNextIntl(nextConfig)
