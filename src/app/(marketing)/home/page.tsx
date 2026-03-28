import { HeroSection } from "@/components/marketing/hero-section"
import { StatsCounter } from "@/components/marketing/stats-counter"
import { ModuleShowcase } from "@/components/marketing/module-showcase"
import { AiFlowDiagram } from "@/components/marketing/ai-flow-diagram"
import { PricingTeaser } from "@/components/marketing/pricing-teaser"
import { TestimonialCarousel } from "@/components/marketing/testimonial-carousel"
import { CtaBanner } from "@/components/marketing/cta-banner"

export default function MarketingHomePage() {
  return (
    <>
      <HeroSection />
      <StatsCounter />
      <ModuleShowcase />
      <AiFlowDiagram />
      <PricingTeaser />
      <TestimonialCarousel />
      <CtaBanner />
    </>
  )
}
