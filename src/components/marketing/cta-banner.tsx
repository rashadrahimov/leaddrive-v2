"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Particles } from "@/components/ui/particles"
import { AnimateIn } from "./animate-in"

export function CtaBanner() {
  return (
    <section className="relative bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 py-24 lg:py-32 overflow-hidden">
      <Particles
        className="absolute inset-0"
        quantity={40}
        color="#8b5cf6"
        size={0.4}
        staticity={40}
        ease={80}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-violet-600/15 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-4xl px-4 lg:px-8 text-center">
        <AnimateIn>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Lidlərinizi idarə etməyə{" "}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">hazırsınız?</span>
          </h2>
        </AnimateIn>
        <AnimateIn delay={100}>
          <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
            Pulsuz sınaq dövrünüzü bu gün başladın. Kredit kartı tələb olunmur.
          </p>
        </AnimateIn>
        <AnimateIn delay={200}>
          <div className="mt-8">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:from-violet-500 hover:to-indigo-500 transition-all"
            >
              Pulsuz sınaq başlat
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}
