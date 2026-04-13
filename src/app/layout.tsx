import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { Providers } from "@/components/providers"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "LeadDrive CRM",
  description: "SaaS CRM for IT Outsourcing Companies",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LeadDrive CRM",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#001E3C",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const messages = await getMessages()
  const hdrs = await headers()
  const nonce = hdrs.get("x-nonce") ?? undefined

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Leaflet CSS — loaded statically to avoid race condition with MapContainer */}
        <link rel="stylesheet" href="/leaflet.css" />
      </head>
      <body className="font-sans antialiased" nonce={nonce}>
        {/* @ts-expect-error nonce prop supported at runtime */}
        <NextIntlClientProvider messages={messages} nonce={nonce}>
          <Providers>{children}</Providers>
          <Toaster richColors position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
