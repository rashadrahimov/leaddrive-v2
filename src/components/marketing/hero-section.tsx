"use client"

import Link from "next/link"
import { ArrowRight, Play, Sparkles, Shield } from "lucide-react"
import { DashboardPreview } from "@/components/marketing/dashboard-preview"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white pt-20 pb-8 lg:pt-24 lg:pb-12">
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

        {/* Live Dashboard Preview */}
        <div className="mt-10 lg:mt-14 relative animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="relative mx-auto max-w-5xl">
            {/* Subtle glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-orange-100/40 via-slate-100/40 to-red-100/40 rounded-3xl blur-xl" />

            <div className="relative rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="bg-white rounded-md px-3 py-1 text-xs text-slate-400 border border-slate-200 max-w-xs mx-auto text-center">
                    app.leaddrivecrm.org/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <DashboardPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
