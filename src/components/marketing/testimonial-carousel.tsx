"use client"

import { SectionWrapper } from "./section-wrapper"
import { AnimateIn } from "./animate-in"
import { testimonials } from "@/lib/marketing-data"
import { Star } from "lucide-react"

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "text-orange-400 fill-orange-400" : "text-slate-200"}`}
        />
      ))}
    </div>
  )
}

export function TestimonialCarousel() {
  const featured = testimonials.slice(0, 6)
  const topRow = featured.slice(0, 3)
  const bottomRow = featured.slice(3, 6)

  return (
    <SectionWrapper id="testimonials" variant="white">
      <AnimateIn className="text-center mb-14">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
          Müştərilərimiz nə deyir
        </h2>
        <p className="mt-4 text-lg text-slate-500">
          500+ şirkət artıq LeadDrive istifadə edir
        </p>
      </AnimateIn>

      {/* Top row — 3 cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {topRow.map((t, i) => (
          <AnimateIn
            key={i}
            delay={i * 80}
            className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 flex flex-col hover:border-slate-300 hover:shadow-md transition-all"
          >
            <StarRating rating={t.rating} />
            <p className="mt-4 text-slate-600 text-sm leading-relaxed flex-1">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                {t.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="font-medium text-slate-900 text-sm">{t.name}</p>
                <p className="text-xs text-slate-500">{t.title}, {t.company}</p>
              </div>
            </div>
          </AnimateIn>
        ))}
      </div>

      {/* Bottom row — 3 more cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {bottomRow.map((t, i) => (
          <AnimateIn
            key={i + 3}
            delay={(i + 3) * 80}
            className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 flex flex-col hover:border-slate-300 hover:shadow-md transition-all"
          >
            <StarRating rating={t.rating} />
            <p className="mt-4 text-slate-600 text-sm leading-relaxed flex-1">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                {t.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="font-medium text-slate-900 text-sm">{t.name}</p>
                <p className="text-xs text-slate-500">{t.title}, {t.company}</p>
              </div>
            </div>
          </AnimateIn>
        ))}
      </div>
    </SectionWrapper>
  )
}
