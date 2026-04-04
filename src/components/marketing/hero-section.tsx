"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, Shield } from "lucide-react"
import { DashboardPreview } from "./dashboard-preview"
import { InvoicePreview } from "./invoice-preview"
import { DealPreview } from "./deal-preview"

/* ── ScaledPanel: uses transform:scale (not CSS zoom) ── */
function ScaledPanel({ children, baseWidth = 1000 }: { children: React.ReactNode; baseWidth?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return
    const measure = () => {
      const w = wrap.offsetWidth
      if (w > 0) {
        const s = w / baseWidth
        setScale(s)
        wrap.style.height = `${inner.offsetHeight * s}px`
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [baseWidth])

  const ready = scale > 0

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: ready ? "0 25px 60px -10px rgba(0,0,0,0.3), 0 12px 28px -6px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)" : "none",
        maxHeight: ready ? undefined : 0,
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: baseWidth,
          transform: ready ? `scale(${scale})` : `scale(${1 / baseWidth})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* ── Position presets (Creatio-style) ── */
const POSITIONS = {
  left:   { left: "2%",  width: "40%", zIndex: 1 },
  center: { left: "18%", width: "64%", zIndex: 3 },
  right:  { left: "58%", width: "40%", zIndex: 1 },
} as const

type Slot = "left" | "center" | "right"

const PANELS = [
  { id: "dashboard", Component: DashboardPreview },
  { id: "deals",     Component: DealPreview },
  { id: "invoices",  Component: InvoicePreview },
]

function HeroPanels() {
  const [slots, setSlots] = useState<Slot[]>(["left", "center", "right"])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleClick = (i: number) => {
    if (slots[i] === "center") return
    const centerIdx = slots.indexOf("center")
    setSlots(prev => {
      const next = [...prev] as Slot[]
      next[i] = "center"
      next[centerIdx] = prev[i]
      return next
    })
  }

  return (
    <div
      className="hidden lg:block relative"
      style={{ height: 620, opacity: ready ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
      {PANELS.map((panel, i) => {
        const pos = POSITIONS[slots[i]]
        const isCenter = slots[i] === "center"
        return (
          <div
            key={panel.id}
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
            <ScaledPanel baseWidth={1000}>
              <panel.Component />
            </ScaledPanel>
          </div>
        )
      })}
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-b from-white via-[#F3F4F7] to-white pt-20 pb-8 lg:pt-24 lg:pb-12 overflow-x-clip">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#0176D3]/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#7D55C7]/10 rounded-full blur-[128px]" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8 w-full">
        <div className="text-center max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0176D3]/20 bg-[#0176D3]/5 px-4 py-1.5 text-sm text-[#0176D3] font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            İntellektual CRM — 16 ağıllı funksiya
          </span>

          <h1 className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            <span className="text-[#001E3C]">CRM artıq düşünür.</span>
            <br />
            <span className="bg-gradient-to-r from-[#0176D3] via-[#7D55C7] to-[#9B6CFF] bg-clip-text text-transparent">
              Satışdan dəstəyə — Da Vinci ilə.
            </span>
          </h1>

          <p className="mt-6 text-lg lg:text-xl text-[#001E3C]/60 max-w-2xl mx-auto leading-relaxed">
            Da Vinci müştəriləri qiymətləndirir, məktub yazır, müraciətlərə cavab verir.
            Siz qərar verirsiniz — Da Vinci icra edir.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/demo"
              className="group inline-flex items-center gap-2 rounded-full bg-[#0176D3] hover:bg-[#0176D3]/90 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#0176D3]/25 hover:shadow-[#0176D3]/40 transition-all"
            >
              Demo tələb et
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#001E3C]/40">
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

      {/* Creatio-style 3-panel hero */}
      <div className="mt-12 lg:mt-16">
        <HeroPanels />

        {/* Mobile — single panel */}
        <div className="lg:hidden px-4">
          <div className="mx-auto" style={{ maxWidth: 500 }}>
            <ScaledPanel baseWidth={1000}>
              <DealPreview />
            </ScaledPanel>
          </div>
        </div>
      </div>
    </section>
  )
}
