"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import { Download, TrendingUp, DollarSign, BarChart3, CheckSquare, Clock, Users, Building2, Target } from "lucide-react"

interface ReportData {
  overview: {
    companies: number
    contacts: number
    deals: number
    leads: number
    tasks: number
    tickets: number
    totalRevenue: number
    openTickets: number
    overdueTasks: number
  }
  revenue: {
    totalRevenue: number
    wonDealsCount: number
    avgDealSize: number
  }
  pipeline: {
    stages: { stage: string; count: number; value: number }[]
    totalPipelineValue: number
  }
  tasks: {
    total: number
    byStatus: { status: string; count: number }[]
    completionRate: number
    overdue: number
  }
  tickets: {
    total: number
    byStatus: { status: string; count: number }[]
    resolutionRate: number
    open: number
  }
  leads: {
    total: number
    byStatus: { status: string; count: number }[]
    conversionRate: number
  }
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const orgId = session?.user?.organizationId

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/v1/reports", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        })
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch {} finally { setLoading(false) }
    }
    fetchReports()
  }, [session])

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <div className="animate-pulse grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Business intelligence and insights</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Companies" value={data.overview.companies} icon={<Building2 className="h-4 w-4" />} />
        <StatCard title="Contacts" value={data.overview.contacts} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Deals" value={data.overview.deals} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard title="Leads" value={data.overview.leads} icon={<Target className="h-4 w-4" />} />
        <StatCard title="Tasks" value={data.overview.tasks} icon={<CheckSquare className="h-4 w-4" />} />
        <StatCard title="Tickets" value={data.overview.tickets} icon={<Clock className="h-4 w-4" />} />
      </div>

      {/* Report Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Report */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Revenue Report</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Won deals revenue</p>
              </div>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.revenue.totalRevenue.toLocaleString()} ₼</div>
            <div className="text-xs text-muted-foreground">{data.revenue.wonDealsCount} won deals</div>
            <div className="text-xs text-muted-foreground mt-1">Avg deal size: {data.revenue.avgDealSize.toLocaleString()} ₼</div>
          </CardContent>
        </Card>

        {/* Pipeline Report */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Deal Pipeline</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Pipeline by stage</p>
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pipeline.totalPipelineValue.toLocaleString()} ₼</div>
            <div className="space-y-1 mt-2">
              {data.pipeline.stages.map(s => (
                <div key={s.stage} className="flex justify-between text-xs">
                  <span>{s.stage}</span>
                  <span className="font-medium">{s.count} deals · {s.value.toLocaleString()} ₼</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Report */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Task Summary</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Completion and overdue</p>
              </div>
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tasks.completionRate}%</div>
            <div className="text-xs text-muted-foreground">Completion rate</div>
            <div className="space-y-1 mt-2">
              {data.tasks.byStatus.map(t => (
                <div key={t.status} className="flex justify-between text-xs">
                  <span className="capitalize">{t.status.replace(/_/g, " ")}</span>
                  <span className="font-medium">{t.count}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-red-500">
                <span>Overdue</span>
                <span className="font-medium">{data.tasks.overdue}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Report */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Ticket SLA</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Resolution and open tickets</p>
              </div>
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tickets.resolutionRate}%</div>
            <div className="text-xs text-muted-foreground">Resolution rate</div>
            <div className="space-y-1 mt-2">
              {data.tickets.byStatus.map(t => (
                <div key={t.status} className="flex justify-between text-xs">
                  <span className="capitalize">{t.status.replace(/_/g, " ")}</span>
                  <span className="font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leads Report */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Lead Conversion</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Leads by status</p>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.leads.conversionRate}%</div>
            <div className="text-xs text-muted-foreground">Conversion rate</div>
            <div className="space-y-1 mt-2">
              {data.leads.byStatus.map(l => (
                <div key={l.status} className="flex justify-between text-xs">
                  <span className="capitalize">{l.status}</span>
                  <span className="font-medium">{l.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Report */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Team Performance</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Activity overview</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Deals</span>
                <span className="font-bold">{data.overview.deals}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Open Tickets</span>
                <span className="font-bold">{data.overview.openTickets}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Overdue Tasks</span>
                <span className="font-bold text-red-500">{data.overview.overdueTasks}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Revenue</span>
                <span className="font-bold text-green-600">{data.overview.totalRevenue.toLocaleString()} ₼</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
