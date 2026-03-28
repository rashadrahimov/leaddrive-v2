"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Play, Sparkles, Brain, Mail, BarChart3 } from "lucide-react"
import { Particles } from "@/components/ui/particles"
import { cn } from "@/lib/utils"

const heroScreenshots = [
  {
    id: "scoring",
    label: "AI Skorinq",
    icon: Brain,
    image: "/marketing/ai-scoring-grades.png",
    alt: "AI Lead Scoring — avtomatik A–F dərəcələndirmə",
  },
  {
    id: "email",
    label: "AI E-poçt",
    icon: Mail,
    image: "/marketing/ai-email-generation.png",
    alt: "AI Email Generation — bir kliklə peşəkar mesajlar",
  },
  {
    id: "analytics",
    label: "AI Analitika",
    icon: BarChart3,
    image: "/marketing/ai-profitability.png",
    alt: "AI Profitability Analytics — gəlirlilik təhlili",
  },
]

export function HeroSection() {
  const [activeScreenshot, setActiveScreenshot] = useState(0)

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 pt-20 pb-16 lg:pt-28 lg:pb-24">
      {/* Particles background */}
      <Particles
        className="absolute inset-0"
        quantity={80}
        color="#8b5cf6"
        size={0.5}
        staticity={30}
        ease={80}
      />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[128px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[128px]" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8 w-full">
        <div className="text-center max-w-4xl mx-auto stagger-children">
          {/* AI-native badge */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-sm px-4 py-1.5 text-sm text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI-native CRM — 16 süni intellekt inteqrasiyası
            </span>
          </div>

          {/* Main headline */}
          <h1 className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            <span className="text-white">Süni intellektli CRM.</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Hər şey avtomatik.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            AI lidləri skorlayır, e-poçt yazır, tiketləri cavablandırır.
            Siz qərar verirsiniz — Maestro AI icra edir.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/demo"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:from-violet-500 hover:to-indigo-500 transition-all"
            >
              Demo tələb et
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-6 py-3.5 text-base font-semibold text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <Play className="h-4 w-4" />
              Pulsuz sınaq başlat
            </Link>
          </div>
        </div>

        {/* AI Screenshots showcase */}
        <div className="mt-16 lg:mt-20 relative animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          {/* Screenshot tab switcher */}
          <div className="flex justify-center gap-2 mb-6">
            {heroScreenshots.map((item, i) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreenshot(i)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                    activeScreenshot === i
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/40 shadow-lg shadow-violet-500/10"
                      : "text-slate-500 hover:text-slate-300 border border-transparent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="relative mx-auto max-w-5xl">
            {/* Glow behind screenshot */}
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 via-cyan-500/20 to-emerald-500/20 rounded-3xl blur-xl" />

            <div className="relative rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl shadow-violet-500/10 overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="bg-slate-800 rounded-md px-3 py-1 text-xs text-slate-500 border border-slate-700 max-w-xs mx-auto text-center">
                    app.leaddrivecrm.org
                  </div>
                </div>
              </div>

              {/* Screenshot with transition */}
              <div className="relative">
                {heroScreenshots.map((item, i) => (
                  <img
                    key={item.id}
                    src={item.image}
                    alt={item.alt}
                    className={cn(
                      "w-full transition-opacity duration-500",
                      activeScreenshot === i ? "opacity-100" : "opacity-0 absolute inset-0"
                    )}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
