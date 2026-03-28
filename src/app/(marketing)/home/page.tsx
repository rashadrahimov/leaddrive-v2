import { HeroSection } from "@/components/marketing/hero-section"
import { ClientLogos } from "@/components/marketing/client-logos"
import { StatsCounter } from "@/components/marketing/stats-counter"
import { ModuleShowcase } from "@/components/marketing/module-showcase"
import { AiFlowDiagram } from "@/components/marketing/ai-flow-diagram"
import { PricingTeaser } from "@/components/marketing/pricing-teaser"
import { TestimonialCarousel } from "@/components/marketing/testimonial-carousel"
import { FaqSection } from "@/components/marketing/faq-section"
import { CtaBanner } from "@/components/marketing/cta-banner"

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LeadDrive CRM",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "AI-native CRM platforması — satış, marketinq, dəstək, maliyyə və analitika bir yerdə.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "14 günlük pulsuz sınaq",
  },
  author: {
    "@type": "Organization",
    name: "Güvən Technology LLC",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bakı",
      addressCountry: "AZ",
    },
  },
  featureList: [
    "CRM & Sales Management",
    "Marketing Automation",
    "7-Channel Unified Inbox",
    "Helpdesk & SLA",
    "Finance & Profitability",
    "AI Lead Scoring",
    "AI Email Generation",
    "AI Customer Service Agent",
  ],
}

export default function MarketingHomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <ClientLogos />
      <StatsCounter />
      <ModuleShowcase />
      <AiFlowDiagram />
      <PricingTeaser />
      <TestimonialCarousel />
      <FaqSection />
      <CtaBanner />
    </>
  )
}
