"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { ColorStatCard } from "@/components/color-stat-card"
import { PageDescription } from "@/components/page-description"
import {
  MapPin, Users, Route, CheckSquare, AlertTriangle,
  ClipboardList, TrendingUp, Building2,
} from "lucide-react"

interface DashboardData {
  totalAgents: number
  activeAgents: number
  todayRoutes: number
  completedRoutes: number
  routeCompletion: number
  todayVisits: number
  totalCustomers: number
  pendingTasks: number
  unresolvedAlerts: number
  recentVisits: any[]
}

export default function MtmDashboardPage() {
  const t = useTranslations("nav")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/mtm/dashboard")
      .then((r) => r.json())
      .then((r) => { if (r.success) setData(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageDescription
        icon={MapPin}
        title={t("mtmDashboard")}
        description="Field team management — agents, routes, visits, tasks"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Active Agents"
          value={data?.activeAgents ?? 0}
          subValue={`${data?.totalAgents ?? 0} total`}
          icon={<Users className="h-4 w-4" />}
          color="teal"
        />
        <ColorStatCard
          label="Today's Routes"
          value={data?.todayRoutes ?? 0}
          subValue={`${data?.routeCompletion ?? 0}% completed`}
          icon={<Route className="h-4 w-4" />}
          color="blue"
        />
        <ColorStatCard
          label="Today's Visits"
          value={data?.todayVisits ?? 0}
          subValue={`${data?.totalCustomers ?? 0} customers`}
          icon={<CheckSquare className="h-4 w-4" />}
          color="green"
        />
        <ColorStatCard
          label="Pending Tasks"
          value={data?.pendingTasks ?? 0}
          subValue={`${data?.unresolvedAlerts ?? 0} alerts`}
          icon={<ClipboardList className="h-4 w-4" />}
          color="amber"
        />
      </div>

      {/* Recent Visits */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-500" />
          Recent Visits
        </h3>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
        ) : data?.recentVisits && data.recentVisits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Agent</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Check-in</th>
                  <th className="pb-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.recentVisits.map((v: any) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="py-2">{v.agent}</td>
                    <td className="py-2">{v.customer}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        v.status === "CHECKED_OUT" ? "bg-green-100 text-green-700" :
                        v.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" :
                        "bg-muted text-muted-foreground"
                      }`}>{v.status}</span>
                    </td>
                    <td className="py-2 text-muted-foreground">{new Date(v.checkInAt).toLocaleTimeString()}</td>
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
