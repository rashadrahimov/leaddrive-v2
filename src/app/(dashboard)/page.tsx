"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useCountUp } from "@/hooks/use-count-up"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ColorStatCard } from "@/components/color-stat-card"
import {
  Building2, Users, Handshake, Ticket, TrendingUp, TrendingDown,
  DollarSign, AlertTriangle, Shield, Clock, CheckCircle2, Star,
  Activity, BarChart3, Target, Flame, Thermometer, Snowflake,
  FileText, Wallet, ArrowRight, ArrowDown,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"

const COLORS = {
  revenue: "#22c55e", cost: "#ef4444", margin: "#3b82f6",
  hot: "#ef4444", warm: "#f59e0b", cold: "#3b82f6",
}
const SERVICE_COLORS = ["#1B2A4A", "#2D4A7A", "#4A6FA5", "#E91E63", "#FF9800", "#4CAF50", "#9C27B0"]

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

const actIcons: Record<string, string> = {
  call: "📞", email: "📧", meeting: "🤝", note: "📝", task: "✅", deal: "💰", ticket: "🎫",
}

function AnimatedNumber({ value }: { value: string | number }) {
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value
  const suffix = typeof value === "string" ? value.replace(/[0-9.,\-\s]/g, "").trim() : ""
  const isNum = !isNaN(num) && isFinite(num)
  const animated = useCountUp({ end: isNum ? num : 0, duration: 1400 })
  if (!isNum) return <>{value}</>
  return <>{animated}{suffix ? ` ${suffix}` : ""}</>
}

function KpiCard({ title, value, sub, icon, color, alert }: {
  title: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; alert?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 ${alert ? "ring-2 ring-red-400/30" : ""}`}
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

const statusLabels: Record<string, string> = {
  new: "Yeni", in_progress: "İcrada", waiting: "Gözləyir",
  resolved: "Həll edildi", closed: "Bağlı",
  LEAD: "Lid", QUALIFIED: "Kvalif.", PROPOSAL: "Təklif",
  NEGOTIATION: "Danışıqlar", WON: "Qazanıldı", LOST: "İtirildi",
}

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
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 h-72 bg-muted rounded-lg animate-pulse" />
          <div className="lg:col-span-4 h-72 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data) return <div className="py-20 text-center text-muted-foreground">{t("noData")}</div>

  const { financial, clients, pipeline, leads, operations, tasks, activity, risks, financialOverview, forecast, atRiskDeals } = data
  const marginColor = financial.marginPct >= 15 ? COLORS.revenue : financial.marginPct >= 5 ? "#f59e0b" : COLORS.cost

  const stageOrder = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]
  const stageColors: Record<string, string> = {
    LEAD: "#94a3b8", QUALIFIED: "#3b82f6", PROPOSAL: "#8b5cf6",
    NEGOTIATION: "#f59e0b", WON: "#22c55e", LOST: "#ef4444",
  }

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {session?.user?.name || "Director"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("executivePanel")} · {new Date().toLocaleDateString("az", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ═══ 4 Main KPIs ═══ */}
      {widgets.statCards && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ColorStatCard
          label={t("monthlyRevenue")}
          value={`${fmt(financial.monthlyRevenue)} ₼`}
          icon={<DollarSign className="h-4 w-4" />}
          color="green"
        />
        <ColorStatCard
          label={t("pipeline")}
          value={`${fmt(financial.pipelineValue)} ₼`}
          icon={<Handshake className="h-4 w-4" />}
          color="blue"
        />
        <ColorStatCard
          label={t("clients")}
          value={clients.total}
          icon={<Building2 className="h-4 w-4" />}
          color="indigo"
        />
        <ColorStatCard
          label={t("openTickets")}
          value={operations.openTickets}
          icon={<Ticket className="h-4 w-4" />}
          color={operations.slaBreached > 0 ? "red" : "teal"}
        />
      </div>}

      {/* ═══ Risks Banner (only if there are problems) ═══ */}
      {risks?.length > 0 && risks.some((r: any) => r.severity === "critical" || r.severity === "warning") && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {risks.filter((r: any) => r.severity === "critical" || r.severity === "warning").map((r: any, i: number) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border-l-4 bg-white dark:bg-card border shrink-0 ${
                r.severity === "critical" ? "border-l-red-500" : "border-l-amber-500"
              }`}
            >
              <AlertTriangle className={`h-4 w-4 shrink-0 ${r.severity === "critical" ? "text-red-500" : "text-amber-500"}`} />
              <div>
                <span className="text-sm font-medium">{r.title}</span>
                <span className="text-xs text-muted-foreground ml-2">{r.description}</span>
              </div>
              <Badge variant={r.severity === "critical" ? "destructive" : "secondary"} className="text-xs shrink-0 ml-2">
                {r.metric}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Charts Row: Revenue + Pipeline ═══ */}
      {(widgets.revenueChart || widgets.dealPipeline) && <div className="grid gap-4 lg:grid-cols-12">
        {widgets.revenueChart && <Card className="lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> {t("revenueByService")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financial.revenueByService?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
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
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">{t("noData")}</div>
            )}
          </CardContent>
        </Card>}

        {/* Pipeline Funnel */}
        {widgets.dealPipeline && <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> {t("salesPipeline")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stageOrder.map(stage => {
                const s = (pipeline.stages || []).find((x: any) => x.stage === stage)
                if (!s) return null
                const maxVal = Math.max(...(pipeline.stages || []).map((x: any) => x.value || 1))
                const width = maxVal > 0 ? Math.max(((s.value || 0) / maxVal) * 100, 8) : 8
                return (
                  <div key={stage} className="flex items-center gap-2">
                    <span className="text-xs w-20 text-muted-foreground">{statusLabels[stage] || stage}</span>
                    <div className="flex-1 h-5 bg-muted/50 rounded overflow-hidden">
                      <div
                        className="h-full rounded flex items-center px-1.5"
                        style={{ width: `${width}%`, backgroundColor: stageColors[stage] || "#94a3b8" }}
                      >
                        <span className="text-[10px] text-white font-medium">{s.count}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono w-16 text-right">{fmt(s.value)} ₼</span>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t text-center">
              <div>
                <div className="text-lg font-bold text-green-600">{pipeline.wonThisMonth}</div>
                <div className="text-[10px] text-muted-foreground">{t("won")}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-500">{pipeline.lostThisMonth}</div>
                <div className="text-[10px] text-muted-foreground">{t("lost")}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{fmt(pipeline.wonValue)} ₼</div>
                <div className="text-[10px] text-muted-foreground">{t("totalWon")}</div>
              </div>
            </div>
          </CardContent>
        </Card>}
      </div>}

      {/* ═══ Forecast + Clients + Activity ═══ */}
      {(widgets.forecast || widgets.clientHealth || widgets.activityFeed) && <div className="grid gap-4 lg:grid-cols-12">
        {/* Sales Forecast */}
        {widgets.forecast && <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> {t("salesForecast")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forecast?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={forecast} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => fmt(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={((v: number, name: string) => [`${v.toLocaleString()} ₼`, name === "actual" ? t("actual") : t("projected")]) as any} />
                  <Legend formatter={(v: string) => v === "actual" ? t("actual") : t("projected")} />
                  <Bar dataKey="actual" fill="#22c55e" radius={[4, 4, 0, 0]} name="actual" />
                  <Bar dataKey="projected" fill="#3b82f6" radius={[4, 4, 0, 0]} name="projected" opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">{t("noData")}</div>
            )}
          </CardContent>
        </Card>}

        {/* Client Health — compact */}
        {widgets.clientHealth && <Card className="lg:col-span-4">
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
              <div className="flex-1 text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50">
                <div className="text-xl font-bold text-slate-500">{clients.noRevenue}</div>
                <div className="text-[10px] text-slate-500">{tc("noData")}</div>
              </div>
            </div>
            {clients.topClients?.length > 0 && (
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
            )}
          </CardContent>
        </Card>}

        {/* Activity Feed */}
        {widgets.activityFeed && <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> {t("activity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {(activity.recent || []).slice(0, 7).map((a: any) => (
                <div key={a.id} className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">{actIcons[a.type] || "📋"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{a.subject || a.description || a.type}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {a.contact?.fullName || a.company?.name || ""} · {timeAgo(a.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              {(activity.recent || []).length === 0 && (
                <div className="text-xs text-muted-foreground py-4 text-center">{t("noActivity")}</div>
              )}
            </div>
          </CardContent>
        </Card>}
      </div>}

      {/* ═══ Bottom: At Risk Deals + Quick Actions ═══ */}
      {(widgets.taskSummary || widgets.ticketSummary) && <div className="grid gap-4 lg:grid-cols-12">
        {/* At Risk Deals */}
        {atRiskDeals && atRiskDeals.length > 0 && (
          <Card className="lg:col-span-8">
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

        {/* Quick Summary + Links */}
        <Card className={atRiskDeals?.length > 0 ? "lg:col-span-4" : "lg:col-span-12"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> {t("summary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-3 ${atRiskDeals?.length > 0 ? "" : "md:grid-cols-2 lg:grid-cols-4"}`}>
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
      </div>}
    </div>
  )
}
