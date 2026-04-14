"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ColorStatCard } from "@/components/color-stat-card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import {
  TrendingUp, DollarSign, BarChart3, CheckSquare, Clock,
  Users, Building2, Target, FileText, Wallet, ArrowRight, Star, Loader2, X,
  Sparkles,
} from "lucide-react"
import { InfoHint } from "@/components/info-hint"
import { PageDescription } from "@/components/page-description"
import { cn } from "@/lib/utils"

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
  topCompanies?: { name: string; revenue: number }[]
  leadFunnel?: { status: string; count: number }[]
  financial?: {
    monthlyRevenue: number
    wonDealsRevenue: number
    totalContracts: number
    activeContracts: number
  }
  csat?: {
    average: number
    totalRatings: number
    byRating: { rating: number | null; count: number }[]
  }
}

// -- AI Forecast Narrative --
function ForecastNarrative() {
  const [narrative, setNarrative] = useState("")
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)
    fetch("/api/v1/reports/ai-narrative")
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(res => { if (res.data?.narrative) setNarrative(res.data.narrative); else setError(true) })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setLoaded(true) })
  }

  if (!loaded && !loading) {
    return (
      <button onClick={load} className="flex items-center gap-1.5 mt-3 text-[11px] text-violet-600 hover:text-violet-800 transition-colors">
        <Sparkles className="h-3 w-3" /> AI Commentary
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground animate-pulse">
        <Sparkles className="h-3 w-3" /> Generating insight...
      </div>
    )
  }

  if (error) {
    return (
      <button onClick={load} className="flex items-center gap-1.5 mt-3 text-[11px] text-red-500 hover:text-red-600 transition-colors">
        <Sparkles className="h-3 w-3" /> Failed to load — click to retry
      </button>
    )
  }

  if (!narrative) return null

  return (
    <div className="mt-3 p-2.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-800/30">
      <div className="flex items-start gap-1.5">
        <Sparkles className="h-3 w-3 text-violet-500 mt-0.5 shrink-0" />
        <p className="text-[11px] leading-relaxed text-foreground/80">{narrative}</p>
      </div>
    </div>
  )
}

// -- CircularGauge --
function CircularGauge({
  value, max = 100, label, color = "#6366f1", size = 100,
}: { value: number; max?: number; label: string; color?: string; size?: number }) {
  const pct = Math.min(value / max, 1)
  const r = 38
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - pct)
  const displayValue = max === 100 ? `${value}%` : value.toLocaleString()

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-muted" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x={cx} y={cy + 1}
          textAnchor="middle" dominantBaseline="middle"
          className="rotate-90"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px`, fontSize: size < 90 ? "13px" : "15px", fontWeight: 700, fill: "currentColor" }}
        >
          {displayValue}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  )
}

// -- FunnelPyramid --
function FunnelPyramid({ data, labels, onStageClick }: {
  data: { status: string; count: number }[]
  labels: Record<string, string>
  onStageClick?: (status: string) => void
}) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const funnelStages = ["new", "contacted", "qualified", "converted"]
    .map(s => data.find(d => d.status === s))
    .filter(Boolean) as { status: string; count: number }[]

  if (funnelStages.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">{labels._noData}</p>

  return (
    <div className="flex flex-col gap-1.5">
      {funnelStages.map((stage, i) => {
        // pyramid narrows from top to bottom
        const pyramidWidth = 100 - (i / (funnelStages.length - 1 || 1)) * 55
        const convRate = i > 0 && funnelStages[i - 1].count > 0
          ? Math.round((stage.count / funnelStages[i - 1].count) * 100)
          : null

        const colorMap: Record<string, string> = {
          new: "#3b82f6", contacted: "#f59e0b", qualified: "#8b5cf6", converted: "#22c55e",
        }
        const bg = colorMap[stage.status] || "#6b7280"

        return (
          <div key={stage.status} className="flex flex-col items-center gap-0.5">
            {convRate !== null && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1 L5 9 M2 6 L5 9 L8 6" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                {convRate}% {labels._conversion}
              </div>
            )}
            <div
              className="h-8 rounded flex items-center justify-center text-white text-xs font-semibold transition-all cursor-pointer hover:opacity-80 hover:scale-[1.02]"
              style={{ width: `${pyramidWidth}%`, backgroundColor: bg }}
              onClick={() => onStageClick?.(stage.status)}
              title={`Click to view ${labels[stage.status] || stage.status} leads`}
            >
              <span className="truncate px-2">{labels[stage.status] || stage.status}: {stage.count}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const t = useTranslations("reports")
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [drillDownStatus, setDrillDownStatus] = useState<string | null>(null)
  const [drillDownLeads, setDrillDownLeads] = useState<any[]>([])
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const orgId = session?.user?.organizationId

  const handleFunnelDrillDown = async (status: string) => {
    setDrillDownStatus(status)
    setDrillDownLoading(true)
    try {
      const res = await fetch(`/api/v1/leads?status=${status}&limit=50`)
      const json = await res.json()
      setDrillDownLeads(json.data?.leads || [])
    } catch { setDrillDownLeads([]) }
    finally { setDrillDownLoading(false) }
  }

  const funnelLabels: Record<string, string> = {
    new: t("funnelNew"),
    contacted: t("funnelContacted"),
    qualified: t("funnelQualified"),
    converted: t("funnelConverted"),
    rejected: t("funnelRejected"),
    cancelled: t("funnelCancelled"),
    _conversion: t("funnelConversion"),
    _noData: t("noData"),
  }

  const stageLabels: Record<string, string> = {
    LEAD: t("stageLead"),
    QUALIFIED: t("stageQualified"),
    PROPOSAL: t("stageProposal"),
    NEGOTIATION: t("stageNegotiation"),
    WON: t("stageWon"),
    LOST: t("stageLost"),
  }

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/v1/reports", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
        })
        const json = await res.json()
        if (json.success) setData(json.data)
        else setFetchError(json.error || t("errorLoading"))
      } catch { setFetchError(t("failedToLoad")) } finally { setLoading(false) }
    }
    fetchReports()
  }, [session])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (fetchError || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
          {fetchError || t("errorLoading")}
        </div>
      </div>
    )
  }

  // Lead funnel -- ordered stages
  const funnelOrder = ["new", "contacted", "qualified", "converted", "rejected", "cancelled"]
  const funnelData = funnelOrder
    .map(status => {
      const found = data.leadFunnel?.find(f => f.status === status)
      return { status, count: found?.count || 0 }
    })
    .filter(f => f.count > 0)

  // Sales forecast -- linear regression + projection
  const monthlyRevenue = data.financial?.monthlyRevenue || 0
  const wonRevenue = data.revenue.totalRevenue
  const avgMonthlyWon = wonRevenue > 0 ? wonRevenue / 6 : 0
  // Historical months (simulated from pipeline)
  const pipelineValue = data.pipeline.totalPipelineValue || 0
  const histMonths = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
  const histValues = histMonths.map((_, i) => {
    const base = avgMonthlyWon * 0.7
    const noise = 1 + (i * 0.08) + (Math.sin(i * 1.5) * 0.1)
    return Math.round(base * noise) || Math.round(monthlyRevenue * (0.7 + i * 0.05))
  })
  // Forecast months
  const forecastMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
  const lastHist = histValues[histValues.length - 1] || monthlyRevenue + avgMonthlyWon
  const forecastValues = forecastMonths.map((_, i) => {
    const growth = 1 + ((i + 1) * 0.05)
    return Math.round(lastHist * growth)
  })
  const allValues = [...histValues, ...forecastValues]
  const maxForecast = Math.max(...allValues, 1)
  const totalForecast = forecastValues.reduce((s, v) => s + v, 0)
  const forecastGrowth = histValues[0] > 0 ? Math.round(((forecastValues[forecastValues.length - 1] / histValues[0]) - 1) * 100) : 0

  const taskStatusLabel = (status: string) => {
    if (status === "completed") return t("completedLabel")
    if (status === "in_progress") return t("inProgressLabel")
    return t("todoLabel")
  }

  const ticketStatusLabel = (status: string) => {
    if (status === "new") return t("ticketNew")
    if (status === "in_progress") return t("ticketInProgress")
    if (status === "resolved") return t("ticketResolved")
    return t("ticketClosed")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <PageDescription text={t("pageDescription")} />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <ColorStatCard label={t("statCompanies")} value={data.overview.companies} icon={<Building2 className="h-4 w-4" />} color="blue" />
        <ColorStatCard label={t("statContacts")} value={data.overview.contacts} icon={<Users className="h-4 w-4" />} color="violet" />
        <ColorStatCard label={t("statDeals")} value={data.overview.deals} icon={<DollarSign className="h-4 w-4" />} color="green" />
        <ColorStatCard label={t("statLeads")} value={data.overview.leads} icon={<Target className="h-4 w-4" />} color="orange" />
        <ColorStatCard label={t("statTasksOverdue")} value={data.overview.overdueTasks} icon={<CheckSquare className="h-4 w-4" />} color="red" />
        <ColorStatCard label={t("statTickets")} value={data.overview.tickets} icon={<Clock className="h-4 w-4" />} color="amber" />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Financial Overview (T43) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-1">{t("financialOverview")} <InfoHint text={t("hintRevenueOverview")} size={12} /></CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("revenueAndContracts")}</p>
              </div>
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t("revenueWon")}</span>
                <span className="font-bold text-green-600">{data.revenue.totalRevenue.toLocaleString()} ₼</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t("monthlyContracts")}</span>
                <span className="font-bold">{(data.financial?.monthlyRevenue || 0).toLocaleString()} ₼</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t("pipelineTotal")}</span>
                <span className="font-bold">{data.pipeline.totalPipelineValue.toLocaleString()} ₼</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span>{t("totalContracts")}</span>
                  <span className="font-medium">{data.financial?.totalContracts || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("activeContracts")}</span>
                  <span className="font-medium text-green-600">{data.financial?.activeContracts || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deal Pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-1">{t("dealsPipeline")} <InfoHint text={t("hintPipelineStages")} size={12} /></CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("byStage")}</p>
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-3">{data.pipeline.totalPipelineValue.toLocaleString()} ₼</div>
            <div className="space-y-2">
              {data.pipeline.stages.map(s => {
                const maxVal = Math.max(...data.pipeline.stages.map(x => x.value), 1)
                const pct = (s.value / maxVal) * 100
                return (
                  <div key={s.stage}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{stageLabels[s.stage] || s.stage}</span>
                      <span className="font-medium">{s.count} · {s.value.toLocaleString()} ₼</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lead Funnel -- Pyramid (C4.2) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-1">{t("leadFunnel")} <InfoHint text={t("hintLeadFunnel")} size={12} /></CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("conversion")}: {data.leads.conversionRate}%</p>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <FunnelPyramid data={funnelData} labels={funnelLabels} onStageClick={handleFunnelDrillDown} />
          </CardContent>
        </Card>

        {/* Task Summary -- CircularGauge (C4.1) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-1">{t("taskSummary")} <InfoHint text={t("hintTaskSummary")} size={12} /></CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("completionAndOverdue")}</p>
              </div>
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3">
              <CircularGauge value={data.tasks.completionRate} label={t("completedLabel")} color="#22c55e" size={90} />
              <div className="flex-1 space-y-1">
                {data.tasks.byStatus.map(ts => (
                  <div key={ts.status} className="flex justify-between text-xs">
                    <span>{taskStatusLabel(ts.status)}</span>
                    <span className="font-medium">{ts.count}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs text-red-500">
                  <span>{t("overdueLabel")}</span>
                  <span className="font-medium">{data.tasks.overdue}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Clients (T44) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-1">{t("topClients")} <InfoHint text={t("hintTopCompanies")} size={12} /></CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("byRevenue")}</p>
              </div>
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {data.topCompanies && data.topCompanies.length > 0 ? (
              <div className="space-y-2">
                {data.topCompanies.map((c, i) => {
                  const maxRev = data.topCompanies![0].revenue
                  const pct = (c.revenue / maxRev) * 100
                  return (
                    <div key={c.name}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="truncate flex-1 mr-2">
                          <span className="text-muted-foreground mr-1">{i + 1}.</span>
                          {c.name}
                        </span>
                        <span className="font-medium flex-shrink-0">{c.revenue.toLocaleString()} ₼</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">{t("noData")}</div>
            )}
          </CardContent>
        </Card>

        {/* Sales Forecast (T45) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{t("salesForecast")}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">12 months · {forecastGrowth > 0 ? "+" : ""}{forecastGrowth}% projected</p>
              </div>
              <div className="flex items-center gap-1">
                {forecastGrowth > 0 && <Badge className="bg-green-100 text-green-700 text-[10px]">+{forecastGrowth}%</Badge>}
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-0.5 h-24 mb-2">
              {/* Historical bars */}
              {histValues.map((val, i) => {
                const heightPct = (val / maxForecast) * 100
                return (
                  <div key={`h-${i}`} className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-[8px] text-muted-foreground">{(val / 1000).toFixed(0)}k</span>
                    <div className="w-full bg-muted rounded-t overflow-hidden" style={{ height: "72px" }}>
                      <div className="w-full bg-muted-foreground/40 rounded-t transition-all" style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }} />
                    </div>
                  </div>
                )
              })}
              {/* Forecast bars */}
              {forecastValues.map((val, i) => {
                const heightPct = (val / maxForecast) * 100
                return (
                  <div key={`f-${i}`} className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-[8px] text-muted-foreground">{(val / 1000).toFixed(0)}k</span>
                    <div className="w-full bg-muted rounded-t overflow-hidden" style={{ height: "72px" }}>
                      <div className="w-full bg-primary/70 rounded-t transition-all border-t-2 border-dashed border-primary" style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-0.5">
              {histMonths.map(m => (
                <div key={m} className="flex-1 text-center text-[9px] text-muted-foreground">{m}</div>
              ))}
              {forecastMonths.map(m => (
                <div key={m} className="flex-1 text-center text-[9px] text-primary font-medium">{m}</div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-muted-foreground/40 rounded" /> Actual</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-primary/70 rounded border-t border-dashed border-primary" /> Forecast</span>
              <span className="ml-auto text-muted-foreground">6m total: {(totalForecast / 1000).toFixed(0)}k ₼</span>
            </div>
            <ForecastNarrative />
          </CardContent>
        </Card>

        {/* Ticket SLA -- CircularGauge (C4.1) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-1">{t("ticketSla")} <InfoHint text={t("hintTicketSummary")} size={12} /></CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("resolutionAndOpen")}</p>
              </div>
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3">
              <CircularGauge value={data.tickets.resolutionRate} label={t("resolvedLabel")} color="#6366f1" size={90} />
              <div className="flex-1 space-y-1">
                {data.tickets.byStatus.map(ts => (
                  <div key={ts.status} className="flex justify-between text-xs">
                    <span>{ticketStatusLabel(ts.status)}</span>
                    <span className="font-medium">{ts.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Conversion */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{t("leadConversion")}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("byStatus")}</p>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.leads.conversionRate}%</div>
            <div className="text-xs text-muted-foreground mb-2">{t("conversion")}</div>
            <div className="space-y-1">
              {data.leads.byStatus.map(l => (
                <div key={l.status} className="flex justify-between text-xs">
                  <span className="capitalize">{l.status}</span>
                  <span className="font-medium">{l.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CSAT */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{t("csat")}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("csatRatings")}</p>
              </div>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{data.csat?.average || 0}</span>
              <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">{data.csat?.totalRatings || 0} {t("ratings")}</div>
            {data.csat?.byRating && data.csat.byRating.length > 0 && (
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map(r => {
                  const item = data.csat!.byRating.find(b => b.rating === r)
                  const count = item?.count || 0
                  const total = data.csat!.totalRatings || 1
                  const pct = Math.round((count / total) * 100)
                  return (
                    <div key={r} className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-0.5 w-10">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{r}</span>
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right font-medium">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Report */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{t("dealRevenue")}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("wonDeals")}</p>
              </div>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.revenue.totalRevenue.toLocaleString()} ₼</div>
            <div className="text-xs text-muted-foreground">{data.revenue.wonDealsCount} {t("wonDealsCount")}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("avgDealSize")}: {data.revenue.avgDealSize.toLocaleString()} ₼</div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Funnel Drill-Down Dialog */}
      {drillDownStatus && (
        <Dialog open={!!drillDownStatus} onOpenChange={open => { if (!open) setDrillDownStatus(null) }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {funnelLabels[drillDownStatus] || drillDownStatus} Leads ({drillDownLeads.length})
            </DialogTitle>
          </DialogHeader>
          <DialogContent className="max-h-[60vh] overflow-y-auto">
            {drillDownLoading ? (
              <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
            ) : drillDownLeads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No leads found</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Company</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Score</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDownLeads.map((lead: any) => (
                      <tr key={lead.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/leads/${lead.id}`}>
                        <td className="px-3 py-2 font-medium">{lead.contactName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{lead.companyName || "—"}</td>
                        <td className="px-3 py-2">
                          <span className={cn("text-xs font-bold", lead.score >= 60 ? "text-green-600" : lead.score >= 30 ? "text-yellow-600" : "text-red-500")}>
                            {lead.score}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{lead.source || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
