"use client"

import { cn } from "@/lib/utils"

/* ── Mini bar chart ── */
export function MiniBarChart({ data, color, height = "h-16" }: { data: number[]; color: string; height?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className={cn("flex items-end gap-[2px]", height)}>
      {data.map((v, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-t-sm min-w-[4px]", color)}
          style={{ height: `${(v / max) * 100}%`, opacity: 0.45 + (v / max) * 0.55 }}
        />
      ))}
    </div>
  )
}

/* ── Mini line chart (SVG) ── */
export function MiniLineChart({ data, color, width = 200, height = 50 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4)}`).join(" ")
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`lg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#lg-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Mini donut (SVG) ── */
export function MiniDonut({ segments, size = 52 }: { segments: { pct: number; color: string }[]; size?: number }) {
  let offset = 0
  const r = size / 2 - 6, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * c
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.color}
            strokeWidth="6" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
            strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}
