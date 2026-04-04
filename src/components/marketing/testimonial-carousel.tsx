"use client"

import { AnimateIn } from "./animate-in"
import { testimonials } from "@/lib/marketing-data"
import { TrendingDown, Clock, Percent, ArrowUpRight } from "lucide-react"

/* Case-study style testimonials with key metric per card */
const caseStudies = [
  {
    ...testimonials[0],
    metric: "Mənfəət +34%",
    metricLabel: "Xərc modeli ilk 3 ayda",
    metricIcon: ArrowUpRight,
    metricColor: "#10b981",
  },
  {
    ...testimonials[1],
    metric: "−60%",
    metricLabel: "Cavab müddəti azalması",
    metricIcon: Clock,
    metricColor: "#06b6d4",
  },
  {
    ...testimonials[2],
    metric: "1 platforma",
    metricLabel: "3 aləti əvəz etdi",
    metricIcon: TrendingDown,
    metricColor: "#8b5cf6",
  },
  {
    ...testimonials[3],
    metric: "40%",
    metricLabel: "Tiketlər Da Vinci ilə həll olunur",
    metricIcon: Percent,
    metricColor: "#f97316",
  },
  {
    ...testimonials[4],
    metric: "0 Excel",
    metricLabel: "Maliyyə hesabatları platformada",
    metricIcon: ArrowUpRight,
    metricColor: "#ef4444",
  },
  {
    ...testimonials[5],
    metric: "−45%",
    metricLabel: "Gecikmiş ödəniş azalması",
    metricIcon: TrendingDown,
    metricColor: "#10b981",
  },
]

export function TestimonialCarousel() {
  return (
    <section id="testimonials" className="relative bg-[#F3F4F7] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn className="text-center mb-14">
          <p className="text-sm font-medium text-[#001E3C]/40 uppercase tracking-widest mb-3">
            Müştəri nəticələri
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#001E3C]">
            Real rəqəmlər, real şirkətlər
          </h2>
        </AnimateIn>

        {/* 3-column grid — top row has highlighted metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {caseStudies.map((t, i) => {
            const MetricIcon = t.metricIcon
            return (
              <AnimateIn key={i} delay={i * 70}>
                <div className="group h-full rounded-2xl border border-[#001E3C]/10 bg-white p-6 lg:p-7 flex flex-col hover:border-[#001E3C]/15 hover:shadow-lg hover:shadow-[#001E3C]/5 transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                  {/* Metric highlight */}
                  <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#001E3C]/10">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                      style={{ backgroundColor: `${t.metricColor}12` }}
                    >
                      <MetricIcon className="w-5 h-5" style={{ color: t.metricColor }} />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-[#001E3C]">{t.metric}</div>
                      <div className="text-xs text-[#001E3C]/40">{t.metricLabel}</div>
                    </div>
                  </div>

                  {/* Quote */}
                  <p className="text-[#001E3C]/60 text-sm leading-relaxed flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="mt-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F3F4F7] flex items-center justify-center text-[#001E3C]/60 text-xs font-semibold">
                      {t.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-[#001E3C] text-sm">{t.name}</p>
                      <p className="text-xs text-[#001E3C]/40">{t.title}, {t.company}</p>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}
