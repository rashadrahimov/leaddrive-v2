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
  {
    id: "invoices",
    label: "Hesab-fakturalar",
    src: "/marketing/invoices-billing.png",
    url: "app.leaddrivecrm.org/invoices",
  },
  {
    id: "dashboard",
    label: "İdarə paneli",
    src: "", // uses DashboardPreview component
    url: "app.leaddrivecrm.org/dashboard",
  },
  {
    id: "deal",
    label: "Sövdələşmə",
    src: "/marketing/ai-deal-detail.png",
    url: "app.leaddrivecrm.org/deals",
  },
]

/* ─── Browser Frame ─── */
function BrowserFrame({
  screen,
  isCenter,
  onClick,
  children,
}: {
  screen: typeof heroScreens[0]
  isCenter: boolean
  onClick?: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-white overflow-hidden transition-all duration-500 ease-out",
        isCenter
          ? "border-slate-200 shadow-2xl shadow-slate-300/40"
          : "border-slate-200 shadow-xl shadow-slate-200/30 cursor-pointer hover:shadow-2xl"
      )}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-6">
          <div className="bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 border border-slate-200 max-w-[220px] mx-auto text-center truncate">
            {screen.url}
          </div>
        </div>
      </div>

      {/* Content */}
      {children ? (
        children
      ) : (
        <img
          src={screen.src}
          alt={screen.label}
          className="w-full block"
          loading="eager"
        />
      )}
    </div>
  )
}

/* ─── Main Hero ─── */
export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(1) // center = dashboard

  // Arrange screens: [left, center, right]
  const getScreenOrder = () => {
    const screens = [...heroScreens]
    if (activeIndex === 0) return [screens[2], screens[0], screens[1]]
    if (activeIndex === 2) return [screens[1], screens[2], screens[0]]
    return screens
  }

  const ordered = getScreenOrder()

  const getPreviewComponent = (screenId: string) => {
    if (screenId === "dashboard") return <DashboardPreview />
    if (screenId === "invoices") return <InvoicePreview />
    if (screenId === "deal") return <DealPreview />
    return null
  }

  return (
    <section className="relative bg-gradient-to-b from-white via-slate-50 to-white pt-20 pb-8 lg:pt-24 lg:pb-12 overflow-x-clip">
      {/* Subtle accent blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-100/50 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-red-100/40 rounded-full blur-[128px]" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8 w-full">
        <div className="text-center max-w-4xl mx-auto stagger-children">
          {/* AI-native badge */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm text-orange-700 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              AI-native CRM — 16 süni intellekt inteqrasiyası
            </span>
          </div>

          {/* Main headline */}
          <h1 className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            <span className="text-slate-900">Süni intellektli CRM.</span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
              Hər şey avtomatik.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            AI lidləri skorlayır, e-poçt yazır, tiketləri cavablandırır.
            Siz qərar verirsiniz — Maestro AI icra edir.
          </p>

          {/* CTAs */}
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

          {/* Trust badges */}
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

      {/* ─── 3-Screen Showcase (Creatio-style) — FULL WIDTH ─── */}
      <div className="mt-10 lg:mt-14 relative animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        {/* Subtle glow behind center */}
        <div className="absolute inset-x-0 top-8 bottom-0 mx-auto max-w-5xl bg-gradient-to-r from-orange-100/30 via-slate-100/30 to-red-100/30 rounded-3xl blur-2xl" />

        {/* Desktop: 3 screens side by side — full viewport width */}
        <div className="hidden lg:flex items-end justify-center relative mx-auto max-w-[1440px] px-2" style={{ perspective: "2400px" }}>
          {/* Left screen */}
          <div
            className="w-[32%] flex-shrink-0 transition-all duration-500"
            style={{ transform: "rotateY(3deg) translateX(16px)", transformOrigin: "right center" }}
          >
            <BrowserFrame
              screen={ordered[0]}
              isCenter={false}
              onClick={() => {
                const origIdx = heroScreens.findIndex(s => s.id === ordered[0].id)
                setActiveIndex(origIdx)
              }}
            >
              {getPreviewComponent(ordered[0].id)}
            </BrowserFrame>
            <p className="text-center mt-3 text-sm text-slate-400 font-medium">{ordered[0].label}</p>
          </div>

          {/* Center screen — largest, overlaps sides */}
          <div className="w-[56%] flex-shrink-0 relative z-20 transition-all duration-500 -mx-6">
            <BrowserFrame screen={ordered[1]} isCenter={true}>
              {getPreviewComponent(ordered[1].id)}
            </BrowserFrame>
            <p className="text-center mt-3 text-sm text-slate-600 font-semibold">{ordered[1].label}</p>
          </div>

          {/* Right screen */}
          <div
            className="w-[32%] flex-shrink-0 transition-all duration-500"
            style={{ transform: "rotateY(-3deg) translateX(-16px)", transformOrigin: "left center" }}
          >
            <BrowserFrame
              screen={ordered[2]}
              isCenter={false}
              onClick={() => {
                const origIdx = heroScreens.findIndex(s => s.id === ordered[2].id)
                setActiveIndex(origIdx)
              }}
            >
              {getPreviewComponent(ordered[2].id)}
            </BrowserFrame>
            <p className="text-center mt-3 text-sm text-slate-400 font-medium">{ordered[2].label}</p>
          </div>
        </div>

        {/* Screen selector dots */}
        <div className="hidden lg:flex items-center justify-center gap-2 mt-6">
          {heroScreens.map((screen, i) => (
            <button
              key={screen.id}
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

        {/* Mobile: single screen with tabs */}
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
            <BrowserFrame screen={heroScreens[activeIndex]} isCenter={true}>
              {getPreviewComponent(heroScreens[activeIndex].id)}
            </BrowserFrame>
          </div>
        </div>
      </div>
    </section>
  )
}
