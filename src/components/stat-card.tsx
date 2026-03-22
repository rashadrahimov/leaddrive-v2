"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useCountUp } from "@/hooks/use-count-up"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: "up" | "down" | "neutral"
  className?: string
  accentColor?: "blue" | "green" | "red" | "amber" | "violet" | "indigo" | "orange"
}

const ACCENT_COLORS = {
  blue: "border-l-blue-500",
  green: "border-l-green-500",
  red: "border-l-red-500",
  amber: "border-l-amber-500",
  violet: "border-l-violet-500",
  indigo: "border-l-indigo-500",
  orange: "border-l-orange-500",
}

const TREND_ICONS = {
  up: "↑",
  down: "↓",
}

function AnimatedValue({ value }: { value: string | number }) {
  const numericValue = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value
  const suffix = typeof value === "string" ? value.replace(/[0-9.,\-\s]/g, "").trim() : ""
  const isNumeric = !isNaN(numericValue) && isFinite(numericValue)

  const animated = useCountUp({
    end: isNumeric ? numericValue : 0,
    duration: 1200,
    decimals: typeof value === "string" && value.includes(".") ? 1 : 0,
  })

  if (!isNumeric) return <>{value}</>
  return <>{animated}{suffix ? ` ${suffix}` : ""}</>
}

export function StatCard({ title, value, description, icon, trend, className, accentColor }: StatCardProps) {
  return (
    <Card className={cn(
      "border-l-4 shadow-sm hover:shadow-md transition-shadow duration-200",
      accentColor ? ACCENT_COLORS[accentColor] : "border-l-primary/60",
      className,
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-5">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
        {icon && <div className="text-muted-foreground/60">{icon}</div>}
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="text-2xl font-bold tracking-tight">
          <AnimatedValue value={value} />
        </div>
        {(description || trend) && (
          <p className={cn(
            "mt-1 text-xs font-medium",
            trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
          )}>
            {trend && TREND_ICONS[trend] && <span className="mr-0.5">{TREND_ICONS[trend]}</span>}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
