"use client"

import { useRef, useEffect, useLayoutEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, Shield } from "lucide-react"
import { DashboardPreview } from "./dashboard-preview"
import { InvoicePreview } from "./invoice-preview"
import { DealPreview } from "./deal-preview"
import { CrmPipelinePreview, SupportTicketPreview, AiAssistantPreview } from "./module-previews"

/**
 * AutoScaledPanel — measures its own width and uses CSS zoom to fit content.
 * CSS zoom changes layout dimensions (unlike transform: scale).
 */
function AutoScaledPanel({
  children,
  baseWidth = 1000,
}: {
  children: React.ReactNode
  baseWidth?: number
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = outerRef.current
    if (!el) return
    const measure = () => {
      const w = el.offsetWidth
      if (w > 0) setZoom(w / baseWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [baseWidth])

  return (
    <div
      ref={outerRef}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        boxShadow:
          "0 25px 60px -10px rgba(0,0,0,0.3), 0 12px 28px -6px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          width: baseWidth,
          zoom: zoom ?? 0.5,
          visibility: zoom !== null ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* Position presets */
const POSITIONS = {
  left:   { left: "0%",   width: "42%", zIndex: 1 },
  center: { left: "18%",  width: "64%", zIndex: 3 },
  right:  { left: "58%",  width: "42%", zIndex: 1 },
} as const

type Slot = "left" | "center" | "right"

const ALL_PANELS = [
  { id: "invoices",  Component: InvoicePreview },
  { id: "dashboard", Component: DashboardPreview },
  { id: "deals",     Component: DealPreview },
  { id: "crm",       Component: CrmPipelinePreview },
  { id: "support",   Component: SupportTicketPreview },
  { id: "ai",        Component: AiAssistantPreview },
]

/**
 * HeroPanels — three visible panels that rotate through a pool of 6.
 * Click a side panel → it slides to center, center slides to its spot.
 * Auto-rotates every 6 seconds.
 */
function HeroPanels() {
  const [slots, setSlots] = useState<Slot[]>(["left", "center", "right"])
  const [visible, setVisible] = useState([0, 1, 2])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-rotate: every 6s, bring in next panel from pool to center
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setVisible(prev => {
        const usedSet = new Set(prev)
        let nextIdx = -1
        for (let i = 0; i < ALL_PANELS.length; i++) {
          if (!usedSet.has(i)) { nextIdx = i; break }
        }
        if (nextIdx === -1) nextIdx = (Math.max(...prev) + 1) % ALL_PANELS.length
        return [prev[1], prev[2], nextIdx]
      })
      setSlots(["left", "center", "right"])
    }, 6000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleClick = (panelIndex: number) => {
    if (slots[panelIndex] === "center") return
    if (timerRef.current) clearInterval(timerRef.current)
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
    <div className="hidden lg:block relative" style={{ height: 620 }}>
      {[0, 1, 2].map((i) => {
        const panel = ALL_PANELS[visible[i]]
        const pos = POSITIONS[slots[i]]
        const isCenter = slots[i] === "center"
        return (
          <div
            key={`slot-${i}-${panel.id}`}
            onClick={() => handleClick(i)}
            style={{
              position: "absolute",
              bottom: 0,
              left: pos.left,
              width: pos.width,
              zIndex: pos.zIndex,
              cursor: isCenter ? "default" : "pointer",
              pointerEvents: isCenter ? "none" : "auto",
              opacity: isCenter ? 1 : 0.85,
              filter: isCenter ? "none" : "saturate(0.85)",
              transition: "left 0.5s ease, width 0.5s ease, opacity 0.5s ease, filter 0.5s ease",
            }}
          >
            <AutoScaledPanel baseWidth={1000}>
              <panel.Component />
            </AutoScaledPanel>
          </div>
        )
      })}
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
            İntellektual CRM — 16 ağıllı funksiya
          </span>

          <h1 className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            <span className="text-slate-900">CRM artıq düşünür.</span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
              Satışdan dəstəyə — Da Vinci ilə.
            </span>
          </h1>

          <p className="mt-6 text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Da Vinci müştəriləri qiymətləndirir, məktub yazır, müraciətlərə cavab verir.
            Siz qərar verirsiniz — Da Vinci icra edir.
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
            <AutoScaledPanel>
              <DashboardPreview />
            </AutoScaledPanel>
          </div>
        </div>
      </div>
    </section>
  )
}
