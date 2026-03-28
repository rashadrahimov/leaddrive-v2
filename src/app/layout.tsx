import type { Metadata } from "next"
import { headers } from "next/headers"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { Providers } from "@/components/providers"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "LeadDrive CRM",
  description: "SaaS CRM for IT Outsourcing Companies",
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
      <body className="font-sans antialiased" nonce={nonce}>
        <NextIntlClientProvider messages={messages} nonce={nonce}>
          <Providers>{children}</Providers>
          <Toaster richColors position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
