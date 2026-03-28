"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { AnimateIn } from "./animate-in"

export function CtaBanner() {
  return (
    <section className="relative bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 py-24 lg:py-32 overflow-hidden">
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-white rounded-full blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 lg:px-8 text-center">
        <AnimateIn>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Lidlərinizi idarə etməyə hazırsınız?
          </h2>
        </AnimateIn>
        <AnimateIn delay={100}>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
            Pulsuz sınaq dövrünüzü bu gün başladın. Kredit kartı tələb olunmur.
          </p>
        </AnimateIn>
        <AnimateIn delay={200}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/demo"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-orange-600 shadow-lg hover:shadow-xl hover:bg-slate-50 transition-all"
            >
              Demo tələb et
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-6 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
            >
              Pulsuz sınaq başlat
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}
