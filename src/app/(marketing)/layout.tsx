import { MarketingNavbar } from "@/components/marketing/navbar"
import { MarketingFooter } from "@/components/marketing/footer"
import { FloatingButtons } from "@/components/marketing/floating-buttons"
import { LiveChat } from "@/components/marketing/live-chat"

import { GoogleAnalytics } from "@/components/marketing/google-analytics"
import type { Metadata } from "next"

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
    "LeadDrive", "Güvən Technology",
  ],
  authors: [{ name: "Güvən Technology LLC" }],
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
    <div className="min-h-screen bg-white text-slate-900" style={{ colorScheme: "light" }}>
      <MarketingNavbar />
      <main>{children}</main>
      <MarketingFooter />
      <FloatingButtons />
      <LiveChat />

      <GoogleAnalytics />
    </div>
  )
}
