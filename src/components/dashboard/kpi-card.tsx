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
    <div
      className="relative overflow-hidden rounded-xl border shadow-sm hover:shadow-md transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, ${color}18 100%)`,
        borderColor: `${color}20`,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ backgroundColor: color }} />
      <div className="relative p-4 pt-5">
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{title}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums leading-none"><AnimatedNumber value={value} /></p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{sub}</p>}
          </div>
          <div className="p-2.5 rounded-xl shrink-0 ml-2" style={{ color, backgroundColor: `${color}12` }}>{icon}</div>
        </div>
      </div>
    </div>
  )
}
