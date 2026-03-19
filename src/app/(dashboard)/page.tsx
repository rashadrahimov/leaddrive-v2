"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { Building2, Users, Handshake, Ticket, TrendingUp, Clock, CheckSquare, AlertTriangle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DashboardData {
  stats: {
    companies: number
    contacts: number
    activeDeals: number
    pipelineValue: number
    openTickets: number
    overdueTasks: number
  }
  revenueByMonth: Record<string, number>
  recentActivities: Array<{
    id: string
    type: string
    subject?: string
    description?: string
    createdAt: string
    contact?: { fullName: string } | null
    company?: { name: string } | null
  }>
  myTasks: Array<{
    id: string
    title: string
    priority: string
    dueDate?: string
    status: string
  }>
}

const activityIcons: Record<string, string> = {
  call: "📞", email: "📧", meeting: "🤝", note: "📝", task: "✅", deal: "💰", ticket: "🎫",
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₼`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ₼`
  return `${n.toFixed(0)} ₼`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const orgId = (session?.user as any)?.organizationId
        const res = await fetch("/api/v1/dashboard", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        })
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch {
        // Will show empty state
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [session])

  // Transform revenue data for chart
  const revenueChartData = data
    ? Object.entries(data.revenueByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, revenue]) => ({
          month: new Date(month + "-01").toLocaleDateString("en", { month: "short" }),
          revenue,
        }))
    : []

  const stats = data?.stats || { companies: 0, contacts: 0, activeDeals: 0, pipelineValue: 0, openTickets: 0, overdueTasks: 0 }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Companies" value={stats.companies} icon={<Building2 className="h-4 w-4" />} />
        <StatCard title="Contacts" value={stats.contacts} icon={<Users className="h-4 w-4" />} />
        <StatCard
          title="Active Deals"
          value={stats.activeDeals}
          icon={<Handshake className="h-4 w-4" />}
          description={`${formatCurrency(stats.pipelineValue)} pipeline`}
        />
        <StatCard
          title="Open Tickets"
          value={stats.openTickets}
          icon={<Ticket className="h-4 w-4" />}
          description={stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue tasks` : undefined}
          trend={stats.overdueTasks > 0 ? "down" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value: any) => [`${formatCurrency(Number(value))}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No revenue data for the last 6 months
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.recentActivities || []).length > 0 ? (
                data!.recentActivities.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className="text-sm mt-0.5">{activityIcons[item.type] || "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.subject || item.description || item.type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.contact?.fullName || item.company?.name || ""} · {timeAgo(item.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data?.myTasks || []).length > 0 ? (
              data!.myTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded border-2 border-muted-foreground/30" />
                    <span className="text-sm">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      task.priority === "high" || task.priority === "urgent"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : task.priority === "medium"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.dueDate).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground p-3">No pending tasks</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
