import { MarketingNavbar } from "@/components/marketing/navbar"
import { MarketingFooter } from "@/components/marketing/footer"
import { FloatingButtons } from "@/components/marketing/floating-buttons"
import Script from "next/script"

import { GoogleAnalytics } from "@/components/marketing/google-analytics"
import type { Metadata } from "next"

// LeadDrive Inc. Web Chat widget (§4). Loader runs from the CRM app origin and
// renders an iframe over the marketing site. CRM-side CORS whitelist has
// both https://leaddrivecrm.org and https://www.leaddrivecrm.org approved.
const WEB_CHAT_PUBLIC_KEY = "wc_f37a218a9541147136"
const WIDGET_LOADER_URL = "https://app.leaddrivecrm.org/widget.js"

export const metadata: Metadata = {
  title: {
    default: "LeadDrive CRM — İntellektual CRM Platforması",
    template: "%s | LeadDrive CRM",
  },
  description:
    "İntellektual CRM platforması — satış, marketinq, 7 kanallı gələn qutusu, dəstək, maliyyə və analitika bir yerdə. 128+ funksiya, 16 ağıllı funksiya.",
  keywords: [
    "CRM", "CRM Azerbaijan", "CRM Azərbaycan", "smart CRM platforması",
    "Da Vinci CRM", "satış idarəsi", "lead management", "müştəri idarəsi",
    "marketing automation", "helpdesk", "SLA", "pipeline",
    "LeadDrive", "European CRM", "Ukrainian developers", "Poland",
  ],
  authors: [{ name: "LeadDrive Inc." }],
  openGraph: {
    type: "website",
    locale: "az_AZ",
    siteName: "LeadDrive CRM",
    title: "LeadDrive CRM — İntellektual CRM Platforması",
    description: "128+ funksiya, 16 ağıllı funksiya. Satış, marketinq, dəstək və maliyyə bir platformada.",
    images: [{ url: "/marketing/crm-dashboard.png", width: 1200, height: 630, alt: "LeadDrive CRM Dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadDrive CRM — İntellektual CRM Platforması",
    description: "128+ funksiya, 16 ağıllı funksiya. Satış, marketinq, dəstək və maliyyə bir platformada.",
    images: ["/marketing/crm-dashboard.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#001E3C]" style={{ colorScheme: "light" }}>
      <MarketingNavbar />
      <main>{children}</main>
      <MarketingFooter />
      <FloatingButtons />

      {/* Web chat widget — loader fetches config from app.leaddrivecrm.org and
          injects a floating bubble + iframe with /embed/chat/[key]. */}
      <Script
        id="leaddrive-web-chat"
        src={WIDGET_LOADER_URL}
        data-key={WEB_CHAT_PUBLIC_KEY}
        data-lang="az"
        strategy="afterInteractive"
      />

      <GoogleAnalytics />
    </div>
  )
}
