import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

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

interface ColorStatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color?: keyof typeof colorMap
  className?: string
  /** Override entire bg class (e.g. for dynamic colors) */
  bgClass?: string
  /** Optional sub-line shown below main value (e.g. "без НДС: 616,896 AZN") */
  subValue?: string
}

export function ColorStatCard({
  label,
  value,
  icon,
  color = "blue",
  className,
  bgClass,
  subValue,
}: ColorStatCardProps) {
  const { bg, shadow } = colorMap[color]

  return (
    <div
      className={cn(
        "rounded-xl p-4 text-white shadow-md flex flex-col gap-1",
        bgClass ?? bg,
        !bgClass && shadow,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium opacity-80">{label}</span>
        <span className="opacity-70">{icon}</span>
      </div>
      <span className="text-2xl font-bold leading-tight">{value}</span>
      {subValue && (
        <span className="text-xs opacity-70 mt-0.5">{subValue}</span>
      )}
    </div>
  )
}
