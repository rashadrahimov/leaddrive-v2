"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { Button } from "@/components/ui/button"
import { BarChart3, MapPin, CheckCircle2, Camera, TrendingUp } from "lucide-react"

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export default function MtmAnalyticsPage() {
  const { data: session } = useSession()
  const t = useTranslations("nav")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly")
  const orgId = session?.user?.organizationId

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/v1/mtm/analytics?period=${period}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
      })
      const r = await res.json()
      if (r.success) setData(r.data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAnalytics() }, [session, period])

  if (loading) return (
    <div className="space-y-6">
      <PageDescription icon={BarChart3} title="Analytics" description="Performance metrics and trend analysis" />
      <div className="animate-pulse space-y-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
        <div className="grid gap-3 md:grid-cols-2"><div className="h-64 bg-muted rounded-lg" /><div className="h-64 bg-muted rounded-lg" /></div>
      </div>
    </div>
  )

  const kpi = data?.kpi || { totalVisits: 0, totalTasks: 0, totalPhotos: 0, completionRate: 0 }
  const monthlyTrend = data?.monthlyTrend || []
  const weeklyComparison = data?.weeklyComparison || []
  const topAgents = data?.topAgents || []

  const maxTrend = Math.max(...monthlyTrend.map((m: any) => Math.max(m.visits, m.tasks)), 1)
  const maxWeekly = Math.max(...weeklyComparison.map((w: any) => Math.max(w.thisWeek, w.lastWeek)), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={BarChart3} title="Analytics" description="Performance metrics and trend analysis" />
        <div className="flex gap-1">
          {(["weekly", "monthly", "yearly"] as const).map(p => (
            <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
              {p === "weekly" ? "Weekly" : p === "monthly" ? "Monthly" : "Yearly"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label="Total Visits" value={kpi.totalVisits} icon={<MapPin className="h-4 w-4" />} color="violet" />
        <ColorStatCard label="Completed Tasks" value={kpi.totalTasks} icon={<CheckCircle2 className="h-4 w-4" />} color="teal" />
        <ColorStatCard label="Photos Uploaded" value={kpi.totalPhotos} icon={<Camera className="h-4 w-4" />} color="blue" />
        <ColorStatCard label="Completion Rate" value={`${kpi.completionRate}%`} icon={<TrendingUp className="h-4 w-4" />} color="green" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Yearly Trend Chart */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Trend
          </h3>
          {monthlyTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
          ) : (
            <div className="space-y-2">
              {monthlyTrend.map((m: any) => {
                const label = m.month.split("-")[1]
                const monthIdx = parseInt(label) - 1
                return (
                  <div key={m.month} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-muted-foreground">{monthNames[monthIdx] || label}</span>
                    <div className="flex-1 flex gap-1">
                      <div className="h-4 rounded bg-teal-500/80" style={{ width: `${(m.tasks / maxTrend) * 100}%` }} />
                      <div className="h-4 rounded bg-green-500/80" style={{ width: `${(m.visits / maxTrend) * 100}%` }} />
                    </div>
                    <span className="w-16 text-right text-muted-foreground">{m.tasks}t / {m.visits}v</span>
                  </div>
                )
              })}
              <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-teal-500/80" /> Tasks</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-500/80" /> Visits</span>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Comparison Chart */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-4">Weekly Comparison</h3>
          {weeklyComparison.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
          ) : (
            <div className="space-y-2">
              {weeklyComparison.map((w: any) => (
                <div key={w.day} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-muted-foreground">{dayNames[w.day]}</span>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="h-3 rounded bg-primary/80" style={{ width: `${(w.thisWeek / maxWeekly) * 100}%` }} />
                    <div className="h-3 rounded bg-muted-foreground/30" style={{ width: `${(w.lastWeek / maxWeekly) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-muted-foreground">{w.thisWeek}/{w.lastWeek}</span>
                </div>
              ))}
              <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary/80" /> This week</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-muted-foreground/30" /> Last week</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Agents */}
      {topAgents.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Top Agents by Visits</h3>
          <div className="space-y-2">
            {topAgents.map((agent: any, i: number) => (
              <div key={agent.agentId} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                <span className="flex-1 text-sm font-medium">{agent.name}</span>
                <span className="text-sm text-muted-foreground">{agent.visits} visits</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
