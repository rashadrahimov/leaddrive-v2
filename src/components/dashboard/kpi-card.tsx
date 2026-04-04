"use client"

import { useCountUp } from "@/hooks/use-count-up"

function AnimatedNumber({ value }: { value: string | number }) {
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value
  const suffix = typeof value === "string" ? value.replace(/[0-9.,\-\s]/g, "").trim() : ""
  const isNum = !isNaN(num) && isFinite(num)
  const animated = useCountUp({ end: isNum ? num : 0, duration: 1400 })
  if (!isNum) return <>{value}</>
  return <>{animated}{suffix ? ` ${suffix}` : ""}</>
}

export function KpiCard({ title, value, sub, icon, color }: {
  title: string; value: string | number; sub?: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4 hover:shadow-sm transition-all duration-200">
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{title}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums leading-none tracking-tight"><AnimatedNumber value={value} /></p>
          {sub && <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg shrink-0 ml-2" style={{ color, backgroundColor: `${color}15` }}>{icon}</div>
      </div>
    </div>
  )
}
