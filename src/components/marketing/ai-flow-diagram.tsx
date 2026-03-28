"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { SectionWrapper } from "./section-wrapper"
import { AnimateIn } from "./animate-in"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import { aiCapabilities } from "@/lib/marketing-data"
import { Bot, Target, Mail, LineChart, BookOpen, MessageSquare, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const beamNodes = [
  { icon: MessageSquare, label: "Cavablar", color: "text-orange-500" },
  { icon: Target, label: "Skorinq", color: "text-red-500" },
  { icon: Mail, label: "E-poçt", color: "text-orange-600" },
  { icon: LineChart, label: "Analitika", color: "text-red-400" },
  { icon: BookOpen, label: "Bilik", color: "text-orange-400" },
]

function AiBeamVisual() {
  const containerRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>(new Array(beamNodes.length).fill(null))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const setNodeRef = useCallback((el: HTMLDivElement | null, i: number) => {
    nodeRefs.current[i] = el
  }, [])

  return (
    <div ref={containerRef} className="relative flex items-center justify-center min-h-[320px]">
      {/* Center AI node with glow */}
      <div className="absolute w-32 h-32 bg-orange-500/15 rounded-full blur-[60px]" />
      <div
        ref={centerRef}
        className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-orange-300 bg-white shadow-lg shadow-orange-500/10"
      >
        <Bot className="h-9 w-9 text-orange-500" />
      </div>

      {/* Surrounding nodes */}
      {beamNodes.map((node, i) => {
        const Icon = node.icon
        const total = beamNodes.length
        const angle = (i * 2 * Math.PI) / total - Math.PI / 2
        const radius = 130

        return (
          <div
            key={i}
            ref={(el) => setNodeRef(el, i)}
            className="absolute z-10 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-md"
            style={{
              left: `calc(50% + ${Math.cos(angle) * radius}px - 28px)`,
              top: `calc(50% + ${Math.sin(angle) * radius}px - 28px)`,
            }}
          >
            <div className="text-center">
              <Icon className={cn("h-5 w-5 mx-auto", node.color)} />
              <span className="text-[9px] font-medium text-slate-500 mt-0.5 block">{node.label}</span>
            </div>
          </div>
        )
      })}

      {/* Animated beams */}
      {mounted && beamNodes.map((_, i) => {
        const fromEl = nodeRefs.current[i]
        const centerEl = centerRef.current
        const containerEl = containerRef.current
        if (!fromEl || !centerEl || !containerEl) return null

        return (
          <AnimatedBeam
            key={`beam-${i}`}
            containerRef={containerRef as React.RefObject<HTMLElement>}
            fromRef={{ current: fromEl } as React.RefObject<HTMLElement>}
            toRef={centerRef as React.RefObject<HTMLElement>}
            curvature={0}
            duration={3 + i * 0.5}
            delay={i * 0.4}
            gradientStartColor="#f97316"
            gradientStopColor="#ef4444"
            pathColor="#e2e8f0"
            pathOpacity={0.5}
          />
        )
      })}
    </div>
  )
}

export function AiFlowDiagram() {
  return (
    <SectionWrapper id="ai" variant="white">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Text */}
        <AnimateIn>
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 mb-4">
            16 AI inteqrasiya
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">Maestro AI</span>
            <br />
            <span className="text-slate-900">sizin üçün işləyir</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 leading-relaxed">
            Daxili Claude inteqrasiyası. Əlavə deyil — CRM-in əsasıdır.
            Siz yuxuya gedəndə belə işləyir.
          </p>

          <ul className="mt-8 space-y-4">
            {aiCapabilities.map((cap) => {
              const Icon = cap.icon
              return (
                <li key={cap.title} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 border border-orange-200 flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{cap.title}</p>
                    <p className="text-sm text-slate-500">{cap.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>

          <Link
            href="/demo"
            className="mt-8 group inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
          >
            AI funksiyalara baxın
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </AnimateIn>

        {/* Visual */}
        <AnimateIn delay={200}>
          <AiBeamVisual />
        </AnimateIn>
      </div>
    </SectionWrapper>
  )
}
