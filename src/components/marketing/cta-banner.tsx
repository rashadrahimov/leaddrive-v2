"use client"

import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { AnimateIn } from "./animate-in"

export function CtaBanner() {
  return (
    <section className="relative bg-white py-24 lg:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="relative mx-auto max-w-3xl px-4 lg:px-8 text-center">
        <AnimateIn>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm text-orange-600 font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            14 gün pulsuz — kredit kartı yoxdur
          </div>
        </AnimateIn>

        <AnimateIn delay={60}>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            Satışınızı gücləndirməyə
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              hazırsınız?
            </span>
          </h2>
        </AnimateIn>

        <AnimateIn delay={120}>
          <p className="mt-5 text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            500+ şirkət artıq LeadDrive ilə satış, dəstək və maliyyəni bir platformada idarə edir.
          </p>
        </AnimateIn>

        <AnimateIn delay={180}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/demo"
              className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:shadow-xl transition-all"
            >
              Demo tələb et
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-8 py-4 text-base font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              Pulsuz sınaq başlat
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}
