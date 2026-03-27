import { HeroSection } from "@/components/marketing/hero-section"
import { StatsCounter } from "@/components/marketing/stats-counter"
import { ProblemSolution } from "@/components/marketing/problem-solution"
import { ModuleShowcase } from "@/components/marketing/module-showcase"
import { UniqueAdvantages } from "@/components/marketing/unique-advantages"
import { ScreenshotShowcase } from "@/components/marketing/screenshot-showcase"
import { PricingTeaser } from "@/components/marketing/pricing-teaser"
import { AiFlowDiagram } from "@/components/marketing/ai-flow-diagram"
import { TestimonialCarousel } from "@/components/marketing/testimonial-carousel"
import { CtaBanner } from "@/components/marketing/cta-banner"

export default function MarketingHomePage() {
  return (
    <>
      <HeroSection />
      <StatsCounter />
      <ProblemSolution />
      <ModuleShowcase />
      <UniqueAdvantages />
      <ScreenshotShowcase />
      <PricingTeaser />
      <AiFlowDiagram />
      <TestimonialCarousel />
      <CtaBanner />
    </>
  )
}
