"use client"

import { SectionWrapper } from "./section-wrapper"
import { AnimateIn } from "./animate-in"
import { testimonials } from "@/lib/marketing-data"

export function TestimonialCarousel() {
  const featured = testimonials.slice(0, 3)

  return (
    <SectionWrapper id="testimonials" variant="dark">
      <AnimateIn className="text-center mb-14">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white">
          Müştərilərimiz nə deyir
        </h2>
      </AnimateIn>

      <div className="grid md:grid-cols-3 gap-4">
        {featured.map((t, i) => (
          <AnimateIn
            key={i}
            delay={i * 80}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-8 flex flex-col hover:border-slate-700 transition-colors"
          >
            <p className="text-slate-400 text-sm leading-relaxed flex-1">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-6 pt-6 border-t border-slate-800">
              <p className="font-medium text-white text-sm">{t.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.title}, {t.company}</p>
            </div>
          </AnimateIn>
        ))}
      </div>
    </SectionWrapper>
  )
}
