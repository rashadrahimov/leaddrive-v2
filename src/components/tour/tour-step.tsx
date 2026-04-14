"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface TourStepProps {
  targetId: string
  title: string
  description: string
  step: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  isFirst: boolean
  isLast: boolean
}

export function TourStep({
  targetId,
  title,
  description,
  step,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: TourStepProps) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [popoverSide, setPopoverSide] = useState<"bottom" | "top">("bottom")
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = document.querySelector(`[data-tour-id="${targetId}"]`)
    if (!el) return

    const rect = el.getBoundingClientRect()
    setPos({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })

    // Scroll into view if needed
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      // Recalculate after scroll
      setTimeout(() => {
        const r2 = el.getBoundingClientRect()
        setPos({ top: r2.top, left: r2.left, width: r2.width, height: r2.height })
      }, 400)
    }

    // Decide popover side
    setPopoverSide(rect.top > window.innerHeight / 2 ? "top" : "bottom")
  }, [targetId, step])

  if (!pos) return null

  const PADDING = 8
  const spotlightStyle = {
    top: pos.top - PADDING,
    left: pos.left - PADDING,
    width: pos.width + PADDING * 2,
    height: pos.height + PADDING * 2,
  }

  // Popover position
  const popoverStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 10002,
    maxWidth: 360,
    width: "calc(100vw - 32px)",
  }

  if (popoverSide === "bottom") {
    popoverStyle.top = pos.top + pos.height + PADDING + 12
    popoverStyle.left = Math.max(16, Math.min(pos.left, window.innerWidth - 376))
  } else {
    popoverStyle.bottom = window.innerHeight - pos.top + PADDING + 12
    popoverStyle.left = Math.max(16, Math.min(pos.left, window.innerWidth - 376))
  }

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[10000]"
        style={{ pointerEvents: "none" }}
      >
        {/* Dark overlay with cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "auto" }}>
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={spotlightStyle.left}
                y={spotlightStyle.top}
                width={spotlightStyle.width}
                height={spotlightStyle.height}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(0,0,0,0.5)"
            mask="url(#tour-spotlight-mask)"
            onClick={onSkip}
          />
        </svg>

        {/* Spotlight ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute rounded-lg ring-2 ring-primary/50 ring-offset-2 ring-offset-transparent"
          style={{
            ...spotlightStyle,
            pointerEvents: "none",
          }}
        />
      </motion.div>

      {/* Popover */}
      <motion.div
        key="tour-popover"
        ref={popoverRef}
        initial={{ opacity: 0, y: popoverSide === "bottom" ? -8 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: popoverSide === "bottom" ? -8 : 8 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        style={popoverStyle}
      >
        <div className="bg-card border rounded-xl shadow-xl p-4 space-y-3" style={{ pointerEvents: "auto" }}>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-4">
              <p className="text-sm font-semibold leading-tight">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
            <button
              onClick={onSkip}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">
              {step + 1} / {totalSteps}
            </span>
            <div className="flex items-center gap-1.5">
              {!isFirst && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onPrev}>
                  <ChevronLeft className="h-3 w-3 mr-0.5" /> Back
                </Button>
              )}
              <Button size="sm" className="h-7 px-3 text-xs" onClick={isLast ? onSkip : onNext}>
                {isLast ? "Done" : "Next"}
                {!isLast && <ChevronRight className="h-3 w-3 ml-0.5" />}
              </Button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === step ? "w-4 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
