"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import {
  DollarSign, Users, Handshake, TrendingUp, Ticket, Megaphone,
} from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { MotionList, MotionItem } from "@/components/ui/motion"
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
  if (n >= 1000000) return `${(n / 1000).toFixed(0)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`.replace(".0K", "K")
  return n.toLocaleString("en", { maximumFractionDigits: 0 })
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const t = useTranslations("dashboard")
  const tc = useTranslations("common")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [widgets, setWidgets] = useState<Record<string, boolean>>({
    statCards: true, dealPipeline: true, revenueTrend: true, leadSources: true,
    recentDeals: true, aiLeadScoring: true, activityFeed: true,
    campaignStats: true, upcomingEvents: true, weeklyMetrics: true,
    // Legacy
    revenueChart: true, forecast: true, clientHealth: true, taskSummary: true,
    ticketSummary: true, leadFunnel: true,
  })

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
            w[key] = val.enabled && (userRole === "superadmin" || val.roles?.length === 0 || val.roles?.includes(userRole))
          }
          setWidgets(prev => ({ ...prev, ...w }))
        }
      })
      .catch(() => {})
  }, [session])

  function timeAgo(d: string): string {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return t("minAgo", { m })
    const h = Math.floor(m / 60)
    if (h < 24) return t("hoursAgo", { h })
    return t("daysAgo", { d: Math.floor(h / 24) })
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
          headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
        })
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [session])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-56 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!data) return <div className="py-20 text-center text-muted-foreground">{t("noData")}</div>

  const { financial, pipeline, leads, operations, activity, risks, forecast, campaigns, events, weeklyMetrics } = data

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric", weekday: "long" })}
            {` · ${t("lastUpdated")}: `}
            {new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* ═══ Row 1: 6 KPIs ═══ */}
      {widgets.statCards && (
        <MotionList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" staggerDelay={0.06}>
          <MotionItem>
            <KpiCard
              title={t("kpiRevenue")}
              value={`₼${fmt(financial.monthlyRevenue)}`}
              sub={financial.marginPct > 0 ? `↗ +${financial.marginPct.toFixed(0)}%` : undefined}
              icon={<DollarSign className="h-5 w-5" />}
              color="#22c55e"
            />
          </MotionItem>
          <MotionItem>
            <KpiCard
              title={t("kpiLeads")}
              value={leads.activeCount || leads.total || 0}
              sub={leads.activeCount > 0 ? `↗ +${leads.activeCount}` : undefined}
              icon={<Users className="h-5 w-5" />}
              color="#8b5cf6"
            />
          </MotionItem>
          <MotionItem>
            <KpiCard
              title={t("kpiDeals")}
              value={pipeline.deals || 0}
              sub={`↗ ₼${fmt(pipeline.wonValue || 0)}`}
              icon={<Handshake className="h-5 w-5" />}
              color="#3b82f6"
            />
          </MotionItem>
          <MotionItem>
            <KpiCard
              title={t("kpiConversion")}
              value={`${pipeline.conversionRate || leads.conversionRate || 0}%`}
              sub={pipeline.conversionRate > 0 ? `↗ +${(pipeline.conversionRate * 0.1).toFixed(1)}%` : undefined}
              icon={<TrendingUp className="h-5 w-5" />}
              color="#f59e0b"
            />
          </MotionItem>
          <MotionItem>
            <KpiCard
              title={t("kpiTickets")}
              value={operations.openTickets || 0}
              sub={operations.slaBreached > 0 ? `↗ ${t("slaBreaches", { count: operations.slaBreached })}` : `↗ ${t("avgTime")}`}
              icon={<Ticket className="h-5 w-5" />}
              color="#06b6d4"
            />
          </MotionItem>
          <MotionItem>
            <KpiCard
              title={t("kpiCampaigns")}
              value={campaigns?.length || 0}
              sub={campaigns?.length > 0 ? `↗ ${t("openRateSub", { rate: campaigns[0]?.openRate || 0 })}` : undefined}
              icon={<Megaphone className="h-5 w-5" />}
              color="#ec4899"
            />
          </MotionItem>
        </MotionList>
      )}

      {/* ═══ Risks Banner ═══ */}
      {risks && <RisksBanner risks={risks} />}

      {/* ═══ Row 2: Pipeline + Revenue Trend + Lead Sources ═══ */}
      <MotionList className="grid lg:grid-cols-3 gap-4" staggerDelay={0.08}>
        {widgets.dealPipeline && <MotionItem><SalesPipeline pipeline={pipeline} /></MotionItem>}
        {widgets.revenueTrend && <MotionItem><RevenueTrend forecast={forecast} /></MotionItem>}
        {widgets.leadSources && <MotionItem><LeadSourcesDonut leadsBySource={leads.bySource} totalLeads={leads.activeCount || leads.total || 0} /></MotionItem>}
      </MotionList>

      {/* ═══ Row 3: Recent Deals + Da Vinci Lead Scoring + Activity Feed ═══ */}
      <MotionList className="grid lg:grid-cols-3 gap-4" staggerDelay={0.08}>
        {widgets.recentDeals && <MotionItem><RecentDeals deals={pipeline.recentDeals} /></MotionItem>}
        {widgets.aiLeadScoring && <MotionItem><AiLeadScoring leads={leads.topScored} /></MotionItem>}
        {widgets.activityFeed && <MotionItem><ActivityFeed activities={activity.recent} timeAgo={timeAgo} /></MotionItem>}
      </MotionList>

      {/* ═══ Row 4: Campaigns + Events + Weekly Metrics ═══ */}
      <MotionList className="grid lg:grid-cols-3 gap-4" staggerDelay={0.08}>
        {widgets.campaignStats && <MotionItem><CampaignStats campaigns={campaigns} /></MotionItem>}
        {widgets.upcomingEvents && <MotionItem><UpcomingEvents events={events} /></MotionItem>}
        {widgets.weeklyMetrics && <MotionItem><WeeklyMetrics metrics={weeklyMetrics} /></MotionItem>}
      </MotionList>
    </div>
  )
}
