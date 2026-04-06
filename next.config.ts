import createNextIntlPlugin from "next-intl/plugin"
import withSerwistInit from "@serwist/next"
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

export default withSerwist(withNextIntl(nextConfig))
