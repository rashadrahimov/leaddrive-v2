"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Play, Sparkles, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardPreview } from "./dashboard-preview"
import { InvoicePreview } from "./invoice-preview"
import { DealPreview } from "./deal-preview"

/* ─── Hero screens data ─── */
const heroScreens = [
  { id: "invoices", label: "Hesab-fakturalar", url: "app.leaddrivecrm.org/invoices" },
  { id: "dashboard", label: "İdarə paneli", url: "app.leaddrivecrm.org/dashboard" },
  { id: "deal", label: "Sövdələşmə", url: "app.leaddrivecrm.org/deals" },
]

/* ─── Render screen content ─── */
function ScreenContent({ screenId }: { screenId: string }) {
  if (screenId === "dashboard") return <DashboardPreview />
  if (screenId === "invoices") return <InvoicePreview />
  if (screenId === "deal") return <DealPreview />
  return null
}

/* ─── Floating browser card ─── */
function FloatingCard({
  screen,
  width,
  height,
  scale,
  className,
  style,
  onClick,
}: {
  screen: typeof heroScreens[0]
  width: number
  height: number
  scale: number
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "absolute rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xl",
        onClick && "cursor-pointer hover:shadow-3xl transition-shadow duration-300",
        className
      )}
      style={{ width, height, ...style }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-white rounded px-2 py-0.5 text-[7px] text-slate-400 border border-slate-200 max-w-[160px] mx-auto text-center truncate">
            {screen.url}
          </div>
        </div>
      </div>

      {/* Scaled content */}
      <div className="overflow-hidden" style={{ height: height - 28 }}>
        <div
          style={{
            width: 1000,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <ScreenContent screenId={screen.id} />
        </div>
      </div>
    </div>
  )
}

/* ─── Main Hero ─── */
export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(1)

  const getScreenOrder = () => {
    const s = [...heroScreens]
    if (activeIndex === 0) return [s[2], s[0], s[1]]
    if (activeIndex === 2) return [s[1], s[2], s[0]]
    return s
  }

  const ordered = getScreenOrder()

  return (
    <section className="relative bg-gradient-to-b from-white via-slate-50 to-white pt-20 pb-8 lg:pt-24 lg:pb-12 overflow-x-clip">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-100/50 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-red-100/40 rounded-full blur-[128px]" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8 w-full">
        <div className="text-center max-w-4xl mx-auto stagger-children">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm text-orange-700 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              AI-native CRM — 16 süni intellekt inteqrasiyası
            </span>
          </div>

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
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
            >
              <Play className="h-4 w-4" />
              Pulsuz sınaq başlat
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
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

      {/* ─── Overlapping Cards Showcase (Creatio-style) ─── */}
      <div className="mt-10 lg:mt-14 relative animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <div className="absolute inset-x-0 top-8 bottom-0 mx-auto max-w-5xl bg-gradient-to-r from-orange-100/30 via-slate-100/30 to-red-100/30 rounded-3xl blur-2xl" />

        {/* Desktop: overlapping cards */}
        <div className="hidden lg:block relative mx-auto max-w-[1300px] px-4" style={{ height: 520 }}>
          {/* Left card — behind, offset left */}
          <FloatingCard
            screen={ordered[0]}
            width={420}
            height={400}
            scale={0.42}
            onClick={() => {
              const idx = heroScreens.findIndex(s => s.id === ordered[0].id)
              setActiveIndex(idx)
            }}
            style={{
              left: 0,
              top: 60,
              transform: "rotate(-2deg)",
              zIndex: 10,
            }}
          />

          {/* Center card — on top, largest */}
          <FloatingCard
            screen={ordered[1]}
            width={720}
            height={480}
            scale={0.72}
            className="shadow-[0_25px_60px_-12px_rgba(0,0,0,0.2)]"
            style={{
              left: "50%",
              top: 0,
              transform: "translateX(-50%)",
              zIndex: 20,
            }}
          />

          {/* Right card — behind, offset right */}
          <FloatingCard
            screen={ordered[2]}
            width={420}
            height={400}
            scale={0.42}
            onClick={() => {
              const idx = heroScreens.findIndex(s => s.id === ordered[2].id)
              setActiveIndex(idx)
            }}
            style={{
              right: 0,
              top: 40,
              transform: "rotate(2deg)",
              zIndex: 10,
            }}
          />

          {/* Labels under cards */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-16">
            <p className="text-sm text-slate-400 font-medium w-[30%] text-center">{ordered[0].label}</p>
            <p className="text-sm text-slate-600 font-semibold w-[40%] text-center">{ordered[1].label}</p>
            <p className="text-sm text-slate-400 font-medium w-[30%] text-center">{ordered[2].label}</p>
          </div>
        </div>

        {/* Dots */}
        <div className="hidden lg:flex items-center justify-center gap-2 mt-4">
          {heroScreens.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "transition-all duration-300 rounded-full",
                i === activeIndex
                  ? "w-8 h-2 bg-orange-500"
                  : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
              )}
            />
          ))}
        </div>

        {/* Mobile */}
        <div className="lg:hidden px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            {heroScreens.map((screen, i) => (
              <button
                key={screen.id}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  i === activeIndex
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {screen.label}
              </button>
            ))}
          </div>
          <div className="mx-auto max-w-lg">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xl" style={{ height: 380 }}>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-200 bg-slate-50">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-2">
                  <div className="bg-white rounded px-2 py-0.5 text-[7px] text-slate-400 border border-slate-200 max-w-[160px] mx-auto text-center truncate">
                    {heroScreens[activeIndex].url}
                  </div>
                </div>
              </div>
              <div className="overflow-hidden" style={{ height: 350 }}>
                <div style={{ width: 1000, transform: "scale(0.48)", transformOrigin: "top left" }}>
                  <ScreenContent screenId={heroScreens[activeIndex].id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
