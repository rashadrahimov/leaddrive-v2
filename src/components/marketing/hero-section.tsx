"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, Shield } from "lucide-react"
import { DashboardPreview } from "./dashboard-preview"
import { InvoicePreview } from "./invoice-preview"
import { DealPreview } from "./deal-preview"

/**
 * AutoScaledPanel — measures its own width and scales 1000px content to fit.
 * No browser chrome — just the raw UI panel with rounded corners and shadow.
 */
function AutoScaledPanel({
  children,
  height,
  className,
}: {
  children: React.ReactNode
  height: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.offsetWidth
      if (w > 0) setScale(w / 1000)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        height,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow:
          "0 25px 50px -12px rgba(0,0,0,0.25), 0 12px 24px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="origin-top-left"
        style={{ width: 1000, transform: `scale(${scale})` }}
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
            AI-native CRM — 16 süni intellekt inteqrasiyası
          </span>

          <h1 className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            <span className="text-slate-900">Süni intellektli CRM.</span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
              Hər şey avtomatik.
            </span>
          </h1>

          <p className="mt-6 text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            AI lidləri skorlayır, e-poçt yazır, tiketləri cavablandırır.
            Siz qərar verirsiniz — Maestro AI icra edir.
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

      {/* ─── Creatio-exact: center 58%, sides 38%, overlap 20% ─── */}
      <div className="mt-12 lg:mt-16 relative">
        {/* Desktop — Creatio proportions: center dominates, sides peek from behind */}
        <div className="hidden lg:block" style={{ height: 620, position: "relative" }}>
          {/* Left panel — 38% width, starts ~3% from left edge, behind center */}
          <div
            style={{
              position: "absolute",
              width: "38%",
              left: "3%",
              bottom: 0,
              zIndex: 1,
            }}
          >
            <AutoScaledPanel height={560}>
              <InvoicePreview />
            </AutoScaledPanel>
          </div>

          {/* Center panel — 58% width, centered, on top */}
          <div
            style={{
              position: "absolute",
              width: "58%",
              left: "21%",
              bottom: 0,
              zIndex: 3,
            }}
          >
            <AutoScaledPanel height={620}>
              <DashboardPreview />
            </AutoScaledPanel>
          </div>

          {/* Right panel — 38% width, ends ~3% from right edge, behind center */}
          <div
            style={{
              position: "absolute",
              width: "38%",
              right: "3%",
              bottom: 0,
              zIndex: 1,
            }}
          >
            <AutoScaledPanel height={560}>
              <DealPreview />
            </AutoScaledPanel>
          </div>
        </div>

        {/* Mobile — single panel */}
        <div className="lg:hidden px-4">
          <div className="mx-auto" style={{ maxWidth: 500 }}>
            <AutoScaledPanel height={380}>
              <DashboardPreview />
            </AutoScaledPanel>
          </div>
        </div>
      </div>
    </section>
  )
}
