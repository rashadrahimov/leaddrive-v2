"use client"

import { useRef, useState, useEffect } from "react"
import { stats } from "@/lib/marketing-data"
import { AnimateIn } from "./animate-in"

function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold: 0.3 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return inView
}

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref)

  useEffect(() => {
    if (!inView) return
    const duration = 1200
    const startTime = performance.now()
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

export function StatsCounter() {
  return (
    <section className="relative bg-slate-900/80 border-y border-slate-800 py-16">
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 via-transparent to-cyan-500/5" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <AnimateIn key={stat.label} delay={i * 100}>
              <div className="text-4xl lg:text-5xl font-bold tabular-nums bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                <Counter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="mt-2 text-sm text-slate-500">{stat.label}</div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  )
}
