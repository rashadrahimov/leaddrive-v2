"use client"

import { useRef, useLayoutEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, Shield } from "lucide-react"
import { CrmPipelinePreview } from "./module-previews"

function AutoScaledPanel({
  children,
  baseWidth = 1000,
}: {
  children: React.ReactNode
  baseWidth?: number
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = outerRef.current
    if (!el) return
    const measure = () => {
      const w = el.offsetWidth
      if (w > 0) setZoom(w / baseWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [baseWidth])

  return (
    <div
      ref={outerRef}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        boxShadow:
          "0 25px 60px -10px rgba(0,0,0,0.3), 0 12px 28px -6px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          width: baseWidth,
          zoom: zoom ?? 0.5,
          opacity: zoom !== null ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-b from-white via-slate-50 to-white pt-20 pb-8 lg:pt-24 lg:pb-12 overflow-x-clip">
      {/* Subtle background blurs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-100/50 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-red-100/40 rounded-full blur-[128px]" />

      {/* Text content */}
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8 w-full">
        <div className="text-center max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm text-orange-700 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            İntellektual CRM — 16 ağıllı funksiya
          </span>

          <h1 className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            <span className="text-slate-900">CRM artıq düşünür.</span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
              Satışdan dəstəyə — Da Vinci ilə.
            </span>
          </h1>

          <p className="mt-6 text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Da Vinci müştəriləri qiymətləndirir, məktub yazır, müraciətlərə cavab verir.
            Siz qərar verirsiniz — Da Vinci icra edir.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/demo"
              className="group inline-flex items-center gap-2 rounded-full bg-orange-500 hover:bg-orange-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
            >
              Demo tələb et
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              14 gün pulsuz sınaq
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Kredit kartı tələb olunmur
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              GDPR uyğun
            </span>
          </div>
        </div>
      </div>

      {/* Single large CRM preview */}
      <div className="mt-12 lg:mt-16 px-4 lg:px-8">
        <div className="mx-auto" style={{ maxWidth: 1100 }}>
          <AutoScaledPanel baseWidth={1000}>
            <CrmPipelinePreview />
          </AutoScaledPanel>
        </div>
      </div>
    </section>
  )
}
