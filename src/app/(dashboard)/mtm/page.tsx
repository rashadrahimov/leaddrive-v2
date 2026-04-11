"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { ColorStatCard } from "@/components/color-stat-card"
import { PageDescription } from "@/components/page-description"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  MapPin, Users, Route, CheckSquare, AlertTriangle,
  ClipboardList, TrendingUp, UserPlus, Download, Clock,
  Wifi, Navigation,
} from "lucide-react"

export default function MtmDashboardPage() {
  const { data: session } = useSession()
  const t = useTranslations("nav")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"today" | "week" | "month">("today")
  const orgId = session?.user?.organizationId

  useEffect(() => {
    setLoading(true)
    fetch(`/api/v1/mtm/dashboard?period=${period}`, {
      headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
    })
      .then((r) => r.json())
      .then((r) => { if (r.success) setData(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period, session])

  // Live clock with seconds — init as null to avoid hydration mismatch (server=UTC, client=local)
  const [clock, setClock] = useState<Date | null>(null)
  useEffect(() => {
    setClock(new Date())
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const userName = session?.user?.name?.split(" ")[0] || ""

  return (
    <div className="space-y-5">
      {/* Header with greeting and live clock */}
      <div className="flex items-start justify-between">
        <div>
          {userName && <h2 className="text-lg font-semibold mb-0.5">Welcome back, {userName}!</h2>}
          <PageDescription
            icon={MapPin}
            title={t("mtmDashboard")}
            description="Field team management — agents, routes, visits, tasks"
          />
        </div>
        <div className="text-right text-muted-foreground">
          <div className="text-xs">{clock?.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) ?? "—"}</div>
          <div className="text-2xl font-mono font-bold text-foreground tabular-nums">
            {clock?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) ?? "--:--:--"}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/mtm/agents">
          <Button variant="default" className="w-full h-11">
            <UserPlus className="h-4 w-4 mr-2" /> New Agent
          </Button>
        </Link>
        <Link href="/mtm/reports">
          <Button variant="outline" className="w-full h-11">
            <Download className="h-4 w-4 mr-2" /> Reports
          </Button>
        </Link>
        <Link href="/mtm/map">
          <Button variant="outline" className="w-full h-11">
            <MapPin className="h-4 w-4 mr-2" /> Live Map
          </Button>
        </Link>
      </div>

      {/* Period filter */}
      <div className="flex gap-1">
        {(["today", "week", "month"] as const).map(p => (
          <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
            {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Planned Routes"
          value={data?.todayRoutes ?? 0}
          subValue={`${period === "today" ? "for today" : period === "week" ? "this week" : "this month"}`}
          icon={<Route className="h-4 w-4" />}
          color="blue"
        />
        <ColorStatCard
          label="Completed"
          value={data?.completedRoutes ?? 0}
          subValue={`${data?.routeCompletion ?? 0}% completion`}
          icon={<CheckSquare className="h-4 w-4" />}
          color="green"
        />
        <ColorStatCard
          label="Off-Route"
          value={data?.offRouteAlerts ?? 0}
          subValue="needs attention"
          icon={<AlertTriangle className="h-4 w-4" />}
          color="red"
        />
        <ColorStatCard
          label="Pending Tasks"
          value={data?.pendingTasks ?? 0}
          subValue={`${data?.urgentTasks ?? 0} urgent`}
          icon={<ClipboardList className="h-4 w-4" />}
          color="amber"
        />
      </div>

      {/* Row 2: Donut + Time Metrics + Active Agents */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Donut Chart */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Completion Rate</h3>
          <div className="flex items-center gap-6">
            <div className="relative h-28 w-28 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${data?.routeCompletion ?? 0}, 100`} className="text-primary" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{data?.routeCompletion ?? 0}%</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-primary" /><span>Completed: {data?.completedRoutes ?? 0}</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" /><span>Remaining: {(data?.todayRoutes ?? 0) - (data?.completedRoutes ?? 0)}</span></div>
            </div>
          </div>
        </div>

        {/* Time Metrics */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Time Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center"><Clock className="h-4 w-4 text-blue-600" /></div>
              <div className="flex-1"><div className="text-xs text-muted-foreground">Avg Route Time</div><div className="text-lg font-bold">{data?.avgRouteDuration ?? 0} min</div></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-950/30 flex items-center justify-center"><Clock className="h-4 w-4 text-green-600" /></div>
              <div className="flex-1"><div className="text-xs text-muted-foreground">Avg Visit Time</div><div className="text-lg font-bold">{data?.avgVisitDuration ?? 0} min</div></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center"><Clock className="h-4 w-4 text-amber-600" /></div>
              <div className="flex-1"><div className="text-xs text-muted-foreground">Total Work Time</div><div className="text-lg font-bold">{data?.totalWorkTime ?? 0} hrs</div></div>
            </div>
          </div>
        </div>

        {/* Active Agents */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Active Agents</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">{data?.onlineAgents ?? 0}/{data?.totalAgents ?? 0}</span>
          </div>
          {data?.activeAgentsList?.length > 0 ? (
            <div className="space-y-2.5">
              {data.activeAgentsList.slice(0, 5).map((agent: any) => (
                <div key={agent.id} className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">{agent.name?.charAt(0)?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-green-400 animate-ping opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>
                      {agent.name}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{agent.speed != null ? `${agent.speed.toFixed(0)} km/h` : "—"}</span>
                </div>
              ))}
              <Link href="/mtm/map"><Button variant="outline" size="sm" className="w-full mt-1"><Navigation className="h-3 w-3 mr-1" /> Show on Map</Button></Link>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No agents online</div>
          )}
        </div>
      </div>

      {/* Recent Visits */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-cyan-500" /> Recent Visits</h3>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
        ) : data?.recentVisits && data.recentVisits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2 font-medium">Agent</th><th className="pb-2 font-medium">Customer</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Check-in</th><th className="pb-2 font-medium">Duration</th></tr></thead>
              <tbody>
                {data.recentVisits.map((v: any) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="py-2">{v.agent}</td>
                    <td className="py-2">{v.customer}</td>
                    <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${v.status === "CHECKED_OUT" ? "bg-green-100 text-green-700" : v.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>{v.status}</span></td>
                    <td className="py-2 text-muted-foreground">{v.checkInAt ? new Date(v.checkInAt).toLocaleTimeString() : "—"}</td>
                    <td className="py-2 text-muted-foreground">{v.duration ? `${v.duration} min` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No visits yet</div>
        )}
      </div>
    </div>
  )
}
