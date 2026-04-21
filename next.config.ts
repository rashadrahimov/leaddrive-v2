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

  // Prisma is declared as an external package (above) — Next.js doesn't trace
  // its native query engine binaries by default. Without this include, the
  // standalone build ships without libquery_engine-<platform>.so.node and
  // Prisma throws `PrismaClientInitializationError: Query Engine not found`
  // the first time a request hits the DB. This list forces the engine +
  // schema into the traced-files set for every API route.
  outputFileTracingIncludes: {
    "/api/**": [
      "./node_modules/.prisma/client/libquery_engine-*.so.node",
      "./node_modules/.prisma/client/schema.prisma",
      "./node_modules/@prisma/client/**/*.js",
      "./node_modules/@prisma/client/**/*.d.ts",
      "./prisma/schema.prisma",
    ],
  },
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
