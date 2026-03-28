"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { SectionWrapper } from "./section-wrapper"
import { AnimateIn } from "./animate-in"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import { aiCapabilities } from "@/lib/marketing-data"
import { Bot, Target, Mail, LineChart, BookOpen, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

const beamNodes = [
  { icon: MessageSquare, label: "Cavablar", color: "text-amber-400" },
  { icon: Target, label: "Skorinq", color: "text-violet-400" },
  { icon: Mail, label: "E-poçt", color: "text-cyan-400" },
  { icon: LineChart, label: "Analitika", color: "text-emerald-400" },
  { icon: BookOpen, label: "Bilik", color: "text-rose-400" },
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
      <div className="absolute w-32 h-32 bg-violet-500/20 rounded-full blur-[60px]" />
      <div
        ref={centerRef}
        className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-violet-500/40 bg-slate-900 shadow-lg shadow-violet-500/20"
      >
        <Bot className="h-9 w-9 text-violet-400" />
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
            className="absolute z-10 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm shadow-lg shadow-slate-900/50"
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
            gradientStartColor="#8b5cf6"
            gradientStopColor="#06b6d4"
            pathColor="#334155"
            pathOpacity={0.4}
          />
        )
      })}
    </div>
  )
}

export function AiFlowDiagram() {
  return (
    <SectionWrapper id="ai" variant="gradient">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Text */}
        <AnimateIn>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Maestro AI</span>
            <br />
            <span className="text-white">sizin üçün işləyir</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            Daxili Claude inteqrasiyası. Əlavə deyil — CRM-in əsasıdır.
            Siz yuxuya gedəndə belə işləyir.
          </p>

          <ul className="mt-8 space-y-4">
            {aiCapabilities.map((cap) => {
              const Icon = cap.icon
              return (
                <li key={cap.title} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{cap.title}</p>
                    <p className="text-sm text-slate-400">{cap.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </AnimateIn>

        {/* Visual */}
        <AnimateIn delay={200}>
          <AiBeamVisual />
        </AnimateIn>
      </div>
    </SectionWrapper>
  )
}
