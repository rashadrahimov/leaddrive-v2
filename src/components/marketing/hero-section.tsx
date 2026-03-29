"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, Shield } from "lucide-react"
import { DashboardPreview } from "./dashboard-preview"
import { InvoicePreview } from "./invoice-preview"
import { DealPreview } from "./deal-preview"

/**
 * AutoScaledPanel — measures its own width and scales content to fit.
 * baseWidth controls the "design width" of the content inside.
 */
function AutoScaledPanel({
  children,
  height,
  baseWidth = 1000,
}: {
  children: React.ReactNode
  height: number
  baseWidth?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.offsetWidth
      if (w > 0) setScale(w / baseWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [baseWidth])

  return (
    <div
      ref={ref}
      style={{
        height,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow:
          "0 25px 60px -10px rgba(0,0,0,0.3), 0 12px 28px -6px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          width: baseWidth,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* Position presets — all use `left` only (no `right`/`auto`) so CSS transitions work */
const POSITIONS = {
  left:   { left: "-2%",  width: "42%", zIndex: 1, height: 440 },
  center: { left: "17%",  width: "66%", zIndex: 3, height: 600 },
  right:  { left: "60%",  width: "42%", zIndex: 1, height: 440 },
} as const

type Slot = "left" | "center" | "right"

const PANELS = [
  { id: "invoices",  Component: InvoicePreview },
  { id: "dashboard", Component: DashboardPreview },
  { id: "deals",     Component: DealPreview },
]

/**
 * HeroPanels — three panels that smoothly slide between positions.
 * Click a side panel → it slides to center, center slides to its spot.
 */
function HeroPanels() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const [ready, setReady] = useState(false)
  const [slots, setSlots] = useState<Slot[]>(["left", "center", "right"])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    Object.assign(wrap.style, {
      position: "relative",
      height: "600px",
      display: "block",
    })
    setReady(true)
  }, [])

  // Apply position styles whenever slots change
  useEffect(() => {
    panelRefs.forEach((ref, i) => {
      const el = ref.current
      if (!el) return
      const pos = POSITIONS[slots[i]]
      const isCenter = slots[i] === "center"
      Object.assign(el.style, {
        position: "absolute",
        bottom: "0",
        transition: "left 0.5s ease, width 0.5s ease, height 0.5s ease",
        left: pos.left,
        width: pos.width,
        zIndex: String(pos.zIndex), // no transition — instant z-index change
        cursor: isCenter ? "default" : "pointer",
        pointerEvents: isCenter ? "none" : "auto",
      })
    })
  }, [slots])

  const handleClick = (panelIndex: number) => {
    if (slots[panelIndex] === "center") return
    const centerIdx = slots.indexOf("center")
    const clickedSlot = slots[panelIndex]
    setSlots(prev => {
      const next = [...prev] as Slot[]
      next[panelIndex] = "center"
      next[centerIdx] = clickedSlot
      return next
    })
  }

  return (
    <div
      ref={wrapRef}
      className="hidden lg:block"
      style={{ opacity: ready ? 1 : 0, transition: "opacity 0.3s" }}
    >
      {PANELS.map((panel, i) => (
        <div
          key={panel.id}
          ref={panelRefs[i]}
          onClick={() => handleClick(i)}
        >
          <AutoScaledPanel height={POSITIONS[slots[i]].height} baseWidth={1000}>
            <panel.Component />
          </AutoScaledPanel>
        </div>
      ))}
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
            AI-native CRM — 16 AI inteqrasiya
          </span>

          <h1 className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            <span className="text-slate-900">CRM artıq düşünür.</span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
              Satışdan dəstəyə — AI ilə.
            </span>
          </h1>

          <p className="mt-6 text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            AI müştəriləri qiymətləndirir, məktub yazır, müraciətlərə cavab verir.
            Siz qərar verirsiniz — Da Vinci AI icra edir.
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

      {/* ─── Creatio-style overlapping panels ─── */}
      <div className="mt-12 lg:mt-16">
        <HeroPanels />

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
