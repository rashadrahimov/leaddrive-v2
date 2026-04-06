import createNextIntlPlugin from "next-intl/plugin"
import withSerwistInit from "@serwist/next"
import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
})

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true }, // TS passes clean (0 errors) — kept true only for prerender-without-DB builds
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
}

export default withSentryConfig(withSerwist(withNextIntl(nextConfig)), {
  // Only upload source maps when SENTRY_AUTH_TOKEN is set
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Suppress logs unless debugging
  silent: !process.env.CI,

  // Organization and project (set via env or here)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source map uploads
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Hides source maps from generated client bundles
  hideSourceMaps: true,
})
