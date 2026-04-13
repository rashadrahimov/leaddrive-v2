import { HeroSection } from "@/components/marketing/hero-section"
import { StatsCounter } from "@/components/marketing/stats-counter"
import { ModuleShowcase } from "@/components/marketing/module-showcase"
import { AiFlowDiagram } from "@/components/marketing/ai-flow-diagram"
import { PricingTeaser } from "@/components/marketing/pricing-teaser"
import { TestimonialCarousel } from "@/components/marketing/testimonial-carousel"
import { FaqSection } from "@/components/marketing/faq-section"
import { CtaBanner } from "@/components/marketing/cta-banner"
import { faqs } from "@/lib/marketing-data"

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
  })),
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Ana Səhifə", item: `${process.env.NEXT_PUBLIC_MARKETING_URL || "https://leaddrivecrm.org"}/home` },
    { "@type": "ListItem", position: 2, name: "Modullar", item: `${process.env.NEXT_PUBLIC_MARKETING_URL || "https://leaddrivecrm.org"}/home#modules` },
    { "@type": "ListItem", position: 3, name: "Qiymətlər", item: `${process.env.NEXT_PUBLIC_MARKETING_URL || "https://leaddrivecrm.org"}/plans` },
    { "@type": "ListItem", position: 4, name: "Demo", item: `${process.env.NEXT_PUBLIC_MARKETING_URL || "https://leaddrivecrm.org"}/demo` },
    { "@type": "ListItem", position: 5, name: "Əlaqə", item: `${process.env.NEXT_PUBLIC_MARKETING_URL || "https://leaddrivecrm.org"}/contact` },
  ],
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LeadDrive CRM",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "İntellektual CRM platforması — satış, marketinq, dəstək, maliyyə və analitika bir yerdə.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "14 günlük pulsuz sınaq",
  },
  author: {
    "@type": "Organization",
    name: "LeadDrive Inc.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Warsaw",
      addressCountry: "PL",
    },
  },
  featureList: [
    "CRM & Sales Management",
    "Marketing Automation",
    "7-Channel Unified Inbox",
    "Helpdesk & SLA",
    "Finance & Profitability",
    "Smart Lead Scoring",
    "Smart Email Generation",
    "Smart Customer Service Agent",
  ],
}

export default function MarketingHomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <HeroSection />
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
