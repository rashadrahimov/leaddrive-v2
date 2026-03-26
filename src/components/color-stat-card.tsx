"use client"

import { cn } from "@/lib/utils"
import { type ReactNode, useState, useEffect, useRef } from "react"
import { InfoHint } from "@/components/info-hint"

const colorMap = {
  blue:   { bg: "bg-blue-500",   shadow: "shadow-blue-500/30" },
  green:  { bg: "bg-green-500",  shadow: "shadow-green-500/30" },
  violet: { bg: "bg-violet-500", shadow: "shadow-violet-500/30" },
  orange: { bg: "bg-orange-500", shadow: "shadow-orange-500/30" },
  red:    { bg: "bg-red-500",    shadow: "shadow-red-500/30" },
  amber:  { bg: "bg-amber-500",  shadow: "shadow-amber-500/30" },
  teal:   { bg: "bg-teal-500",   shadow: "shadow-teal-500/30" },
  indigo: { bg: "bg-indigo-500", shadow: "shadow-indigo-500/30" },
  slate:  { bg: "bg-slate-500",  shadow: "shadow-slate-500/30" },
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(target)

  useEffect(() => {
    const from = prevTarget.current !== target ? prevTarget.current : 0
    prevTarget.current = target
    if (target === 0 && from === 0) return

    const startTime = performance.now()
    let raf: number

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

/** Extract numeric value from formatted string like "1,125,853 ₼" or "168%" */
function extractNumber(val: string | number): number | null {
  if (typeof val === "number") return val
  const cleaned = val.replace(/[^\d.,-]/g, "").replace(/,/g, "")
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/** Rebuild formatted string with animated number */
function animateValue(original: string | number, animated: number): string {
  if (typeof original === "number") return String(animated)
  // Replace the numeric part with animated value, keep suffix/prefix
  const str = String(original)
  const match = str.match(/^([^0-9-]*)([-]?[\d,]+)(.*$)/)
  if (!match) return str
  const [, prefix, , suffix] = match
  return prefix + animated.toLocaleString() + suffix
}

interface ColorStatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color?: keyof typeof colorMap
  className?: string
  bgClass?: string
  subValue?: string
  /** Breakdown lines shown below main value: [{label, value}] */
  lines?: { label: string; value: string }[]
  /** Tooltip hint shown as info icon next to the label */
  hint?: string
  /** Enable count-up animation */
  animate?: boolean
}

export function ColorStatCard({
  label,
  value,
  icon,
  color = "blue",
  className,
  bgClass,
  subValue,
  lines,
  hint,
  animate = false,
}: ColorStatCardProps) {
  const { bg, shadow } = colorMap[color]
  const numericTarget = extractNumber(value)
  const animatedNum = useCountUp(animate && numericTarget !== null ? numericTarget : 0, 900)
  const displayValue = animate && numericTarget !== null ? animateValue(value, animatedNum) : value

  return (
    <div
      className={cn(
        "rounded-xl p-4 text-white shadow-md flex flex-col gap-1 transition-transform duration-200 hover:scale-[1.02]",
        bgClass ?? bg,
        !bgClass && shadow,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium opacity-80 flex items-center gap-1">
          {label}
          {hint && <InfoHint text={hint} size={12} className="opacity-70 hover:opacity-100 [&_svg]:text-white/60 [&_svg:hover]:text-white" />}
        </span>
        <span className="opacity-70">{icon}</span>
      </div>
      <span className="text-2xl font-bold leading-tight">{displayValue}</span>
      {subValue && (
        <span className="text-xs opacity-70 mt-0.5">{subValue}</span>
      )}
      {lines && lines.length > 0 && (
        <div className="mt-1 space-y-0.5 border-t border-white/20 pt-1.5">
          {lines.map((line, i) => (
            <div key={i} className="flex justify-between text-xs opacity-80">
              <span>{line.label}</span>
              <span className="font-medium">{line.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
