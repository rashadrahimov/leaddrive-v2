"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import {
  DollarSign, UserCheck, Target, TrendingUp, Headphones, Megaphone,
  Building2, Handshake, Ticket, BarChart3, Shield, Clock, Star,
  CheckCircle2, Activity,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts"

// Dashboard components
import { KpiCard } from "@/components/dashboard/kpi-card"
import { RisksBanner } from "@/components/dashboard/risks-banner"
import { SalesPipeline } from "@/components/dashboard/sales-pipeline"
import { RevenueTrend } from "@/components/dashboard/revenue-trend"
import { LeadSourcesDonut } from "@/components/dashboard/lead-sources-donut"
import { RecentDeals } from "@/components/dashboard/recent-deals"
import { AiLeadScoring } from "@/components/dashboard/ai-lead-scoring"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { CampaignStats } from "@/components/dashboard/campaign-stats"
import { UpcomingEvents } from "@/components/dashboard/upcoming-events"
import { WeeklyMetrics } from "@/components/dashboard/weekly-metrics"

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

const SERVICE_COLORS = ["#1B2A4A", "#2D4A7A", "#4A6FA5", "#E91E63", "#FF9800", "#4CAF50", "#9C27B0"]

export default function DashboardPage() {
  const { data: session } = useSession()
  const t = useTranslations("dashboard")
  const tc = useTranslations("common")
  const tn = useTranslations("nav")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [widgets, setWidgets] = useState<Record<string, boolean>>({
    statCards: true, leadFunnel: true, dealPipeline: true, revenueChart: true,
    taskSummary: true, ticketSummary: true, forecast: true, clientHealth: true, activityFeed: true,
    leadSources: true, revenueTrend: true, recentDeals: true, aiLeadScoring: true,
    campaignStats: true, upcomingEvents: true, weeklyMetrics: true,
  })

  // Load widget config from API (org-level with role filtering)
  useEffect(() => {
    const orgId = session?.user?.organizationId
    const userRole = (session?.user as any)?.role || "viewer"
    if (!orgId) return
    fetch("/api/v1/dashboard/widget-config", {
      headers: { "x-organization-id": String(orgId) },
    })
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.widgets) {
          const w: Record<string, boolean> = {}
          for (const [key, val] of Object.entries(j.data.widgets) as [string, any][]) {
            w[key] = val.enabled && (val.roles?.length === 0 || val.roles?.includes(userRole))
          }
          setWidgets(prev => ({ ...prev, ...w }))
        }
      })
      .catch(() => {})
  }, [session])

  function timeAgo(d: string): string {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m} ${tc("min")}`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} ${tc("hours")}`
    return `${Math.floor(h / 24)} ${tc("days")}`
  }

  function getGreeting(): string {
    const h = new Date().getHours()
    if (h < 12) return t("greeting.morning")
    if (h < 18) return t("greeting.afternoon")
    return t("greeting.evening")
  }

  useEffect(() => {
    async function load() {
      try {
        const orgId = session?.user?.organizationId
        const res = await fetch("/api/v1/dashboard/executive", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        })
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [session])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!data) return <div className="py-20 text-center text-muted-foreground">{t("noData")}</div>

  const { financial, clients, pipeline, leads, operations, tasks, activity, risks, forecast, atRiskDeals, campaigns, events, weeklyMetrics } = data

  return (
    <div className="space-y-4">
      {/* ═══ Header ═══ */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {session?.user?.name || "Director"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("executivePanel")} · {new Date().toLocaleDateString("az", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ═══ Row 1: 6 KPI Cards ═══ */}
      {widgets.statCards && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            title={t("monthlyRevenue")}
            value={`${fmt(financial.monthlyRevenue)} ₼`}
            sub={`${financial.marginPct?.toFixed(1) || 0}% ${t("marginPct")}`}
            icon={<DollarSign className="h-4 w-4" />}
            color="#22c55e"
          />
          <KpiCard
            title={t("activeLeads")}
            value={leads.activeCount || leads.total || 0}
            sub={leads.total > 0 ? `+${leads.funnel?.find((f: any) => f.status === "new")?.count || 0} ${t("active").toLowerCase()}` : undefined}
            icon={<UserCheck className="h-4 w-4" />}
            color="#8b5cf6"
          />
          <KpiCard
            title={t("openDeals")}
            value={pipeline.deals || 0}
            sub={`₼${fmt(financial.pipelineValue)}`}
            icon={<Target className="h-4 w-4" />}
            color="#06b6d4"
          />
          <KpiCard
            title={t("conversion")}
            value={`${pipeline.conversionRate || leads.conversionRate || 0}%`}
            sub={pipeline.wonThisMonth > 0 ? `+${pipeline.wonThisMonth} ${t("won").toLowerCase()}` : undefined}
            icon={<TrendingUp className="h-4 w-4" />}
            color="#f59e0b"
          />
          <KpiCard
            title={t("openTickets")}
            value={operations.openTickets}
            sub={weeklyMetrics?.avgResponseHours ? `${weeklyMetrics.avgResponseHours}h ${t("avgResponseTime")}` : undefined}
            icon={<Headphones className="h-4 w-4" />}
            color="#3b82f6"
            alert={operations.slaBreached > 0}
          />
          <KpiCard
            title={t("campaigns")}
            value={campaigns?.length || 0}
            sub={campaigns?.length > 0 ? `${campaigns[0].openRate}% ${t("openRate").toLowerCase()}` : undefined}
            icon={<Megaphone className="h-4 w-4" />}
            color="#ec4899"
          />
        </div>
      )}

      {/* ═══ Risks Banner ═══ */}
      {risks && <RisksBanner risks={risks} />}

      {/* ═══ Row 2: Pipeline + Revenue Trend + Lead Sources ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.dealPipeline && <SalesPipeline pipeline={pipeline} />}
        {widgets.revenueTrend && <RevenueTrend forecast={forecast} />}
        {widgets.leadSources && <LeadSourcesDonut sources={leads.bySource} total={leads.total} />}
      </div>

      {/* ═══ Row 3: Recent Deals + AI Lead Scoring + Activity ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.recentDeals && <RecentDeals deals={pipeline.recentDeals} />}
        {widgets.aiLeadScoring && <AiLeadScoring leads={leads.topScored} />}
        {widgets.activityFeed && <ActivityFeed activities={activity.recent} timeAgo={timeAgo} />}
      </div>

      {/* ═══ Row 4: Campaigns + Events + Weekly Metrics ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.campaignStats && <CampaignStats campaigns={campaigns} />}
        {widgets.upcomingEvents && <UpcomingEvents events={events} />}
        {widgets.weeklyMetrics && <WeeklyMetrics metrics={weeklyMetrics} />}
      </div>

      {/* ═══ Legacy widgets (kept for backward compat, behind widget flags) ═══ */}
      {widgets.revenueChart && financial.revenueByService?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> {t("revenueByService")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={financial.revenueByService} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => `${fmt(v)} ₼`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={((v: number) => [`${v.toLocaleString()} ₼`, tc("revenue")]) as any} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {financial.revenueByService.map((_: any, i: number) => (
                    <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {widgets.clientHealth && clients.topClients?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> {t("clientHealth")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200/50">
                <div className="text-xl font-bold text-green-600">{clients.profitable}</div>
                <div className="text-[10px] text-green-600">{t("profitable")}</div>
              </div>
              <div className="flex-1 text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50">
                <div className="text-xl font-bold text-red-600">{clients.loss}</div>
                <div className="text-[10px] text-red-600">{t("unprofitable")}</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex text-[10px] text-muted-foreground mb-1">
                <span className="flex-1">{t("topClients")}</span>
                <span className="w-16 text-right">{t("revenueCol")}</span>
                <span className="w-12 text-right">{t("marginCol")}</span>
              </div>
              {clients.topClients.map((c: any, i: number) => (
                <div key={i} className="flex items-center text-xs py-1 border-b border-muted/50 last:border-0">
                  <span className="truncate flex-1">{c.name}</span>
                  <span className="font-mono text-green-600 w-16 text-right">{fmt(c.revenue)} ₼</span>
                  <span className={`font-mono w-12 text-right ${c.marginPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {c.marginPct?.toFixed(0) || 0}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* At-Risk Deals (legacy, behind flag) */}
      {widgets.ticketSummary && atRiskDeals && atRiskDeals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" /> {t("atRiskDeals")}
              <Badge variant="destructive" className="ml-auto text-xs">{atRiskDeals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {atRiskDeals.map((d: any) => (
                <div
                  key={d.id}
                  onClick={() => window.location.href = `/deals/${d.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 cursor-pointer transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-red-600">{d.predictive}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground">{d.company || "—"} · {d.stage}</p>
                  </div>
                  <span className="text-sm font-bold shrink-0">{d.value?.toLocaleString()} {d.currency}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Summary (legacy, behind flag) */}
      {widgets.taskSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> {t("summary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {[
                { label: t("leadConversion"), value: `${leads.conversionRate || 0}%`, icon: <Target className="h-3.5 w-3.5 text-blue-500" /> },
                { label: "CSAT", value: operations.csatScore > 0 ? `${operations.csatScore.toFixed(1)} ★` : "—", icon: <Star className="h-3.5 w-3.5 text-yellow-500" /> },
                { label: t("tasksCompleted"), value: `${tasks.completionRate}%`, icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> },
                { label: t("activity30d"), value: activity.count30d, icon: <Activity className="h-3.5 w-3.5 text-amber-500" /> },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2.5">
                  {s.icon}
                  <span className="flex-1 text-sm text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-bold">{s.value}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t">
              {[
                { label: tn("deals"), href: "/deals", icon: <Handshake className="h-4 w-4" />, color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30" },
                { label: tn("tickets"), href: "/tickets", icon: <Ticket className="h-4 w-4" />, color: "bg-violet-50 text-violet-600 dark:bg-violet-950/30" },
                { label: tn("reports"), href: "/reports", icon: <BarChart3 className="h-4 w-4" />, color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30" },
                { label: tn("companies"), href: "/companies", icon: <Building2 className="h-4 w-4" />, color: "bg-green-50 text-green-600 dark:bg-green-950/30" },
              ].map(q => (
                <a key={q.label} href={q.href} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${q.color} hover:opacity-80 transition-opacity`}>
                  {q.icon}
                  <span className="text-[10px] font-medium">{q.label}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
