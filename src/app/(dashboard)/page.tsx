"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useCountUp } from "@/hooks/use-count-up"
import { t } from "@/lib/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

// Colors
const COLORS = {
  revenue: "#22c55e", cost: "#ef4444", margin: "#3b82f6",
  hot: "#ef4444", warm: "#f59e0b", cold: "#3b82f6",
  profitable: "#22c55e", loss: "#ef4444", norev: "#94a3b8",
}
const SERVICE_COLORS = ["#1B2A4A", "#2D4A7A", "#4A6FA5", "#E91E63", "#FF9800", "#4CAF50", "#9C27B0"]

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч`
  return `${Math.floor(h / 24)} дн`
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
      {/* Top accent line */}
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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Доброе утро"
  if (h < 18) return "Добрый день"
  return "Добрый вечер"
}

const statusLabels: Record<string, string> = {
  new: "Новый", in_progress: "В работе", waiting: "Ожидание",
  resolved: "Решён", closed: "Закрыт",
  LEAD: "Лид", QUALIFIED: "Квалиф.", PROPOSAL: "Предложение",
  NEGOTIATION: "Переговоры", WON: "Выиграна", LOST: "Проиграна",
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const orgId = session?.user?.organizationId
        const res = await fetch("/api/v1/dashboard/executive", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        })
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch {} finally { setLoading(false) }
    }
    load()
  }, [session])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 h-72 bg-muted rounded-lg animate-pulse" />
          <div className="lg:col-span-4 h-72 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data) return <div className="py-20 text-center text-muted-foreground">Нет данных</div>

  const { financial, clients, pipeline, leads, operations, tasks, activity, risks, financialOverview, forecast, atRiskDeals } = data
  const marginColor = financial.marginPct >= 15 ? COLORS.revenue : financial.marginPct >= 5 ? "#f59e0b" : COLORS.cost

  // Temperature data
  const tempMap: Record<string, number> = {}
  for (const t of leads.byTemperature || []) tempMap[t.temp] = t.count
  const hot = tempMap["hot"] || 0, warm = tempMap["warm"] || 0, cold = tempMap["cold"] || 0
  const totalLeads = hot + warm + cold

  // Pipeline stages
  const stageOrder = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]
  const stageColors: Record<string, string> = {
    LEAD: "#94a3b8", QUALIFIED: "#3b82f6", PROPOSAL: "#8b5cf6",
    NEGOTIATION: "#f59e0b", WON: "#22c55e", LOST: "#ef4444",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {session?.user?.name || "Директор"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Панель руководителя · {new Date().toLocaleDateString("ru", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title="Месячный доход"
          value={`${fmt(financial.monthlyRevenue)} ₼`}
          sub={`Расходы: ${fmt(financial.monthlyCost)} ₼`}
          icon={<DollarSign className="h-5 w-5" />}
          color={COLORS.revenue}
        />
        <KpiCard
          title="Маржа"
          value={`${fmt(financial.monthlyMargin)} ₼`}
          sub={`${financial.marginPct.toFixed(1)}% маржинальность`}
          icon={financial.marginPct >= 10 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          color={marginColor}
          alert={financial.marginPct < 5 && financial.monthlyRevenue > 0}
        />
        <KpiCard
          title={t("Pipeline")}
          value={`${fmt(financial.pipelineValue)} ₼`}
          sub={`${pipeline.deals} активных сделок`}
          icon={<Handshake className="h-5 w-5" />}
          color="#3b82f6"
        />
        <KpiCard
          title="Клиенты"
          value={clients.total}
          sub={`${clients.totalUsers.toLocaleString()} пользователей`}
          icon={<Building2 className="h-5 w-5" />}
          color="#6366f1"
        />
        <KpiCard
          title="Тикеты"
          value={operations.openTickets}
          sub={operations.slaBreached > 0 ? `⚠ ${operations.slaBreached} SLA нарушено` : "SLA в норме"}
          icon={<Ticket className="h-5 w-5" />}
          color={operations.slaBreached > 0 ? COLORS.cost : COLORS.revenue}
          alert={operations.slaBreached > 0}
        />
        <KpiCard
          title="Просрочка"
          value={tasks.overdue}
          sub={`${tasks.dueThisWeek} на этой неделе`}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={tasks.overdue > 0 ? COLORS.cost : COLORS.revenue}
        />
      </div>

      {/* ═══ Financial Overview ═══ */}
      {financialOverview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/30">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Выигранные сделки</p>
                  <p className="text-xl font-bold">{fmt(financialOverview.wonDealsRevenue)} ₼</p>
                  <p className="text-xs text-muted-foreground">{financialOverview.wonDealsCount} сделок · Ø {fmt(financialOverview.avgDealSize)} ₼</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Контракты (ежемес.)</p>
                  <p className="text-xl font-bold">{fmt(financialOverview.monthlyContractRevenue)} ₼</p>
                  <p className="text-xs text-muted-foreground">{financialOverview.activeContracts} активных из {financialOverview.totalContracts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/30">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Pipeline")} (в работе)</p>
                  <p className="text-xl font-bold">{fmt(financialOverview.pipelineValue)} ₼</p>
                  <p className="text-xs text-muted-foreground">{pipeline.deals} активных сделок</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/30">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Конверсия лидов</p>
                  <p className="text-xl font-bold">{leads.conversionRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">{leads.total || 0} лидов всего</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ Main Charts ═══ */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Revenue vs Cost — would need snapshots, for now show service revenue bar */}
        <Card className="lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Доход по услугам (ежемесячный)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financial.revenueByService?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={financial.revenueByService} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => `${fmt(v)} ₼`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()} ₼`, "Доход"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {financial.revenueByService.map((_: any, i: number) => (
                      <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">Нет данных</div>
            )}
          </CardContent>
        </Card>

        {/* Service Revenue Donut */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Структура дохода</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={financial.revenueByService || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  dataKey="value"
                  labelLine={false}
                >
                  {(financial.revenueByService || []).map((_: any, i: number) => (
                    <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toLocaleString()} ₼`} />
                <text x="50%" y="48%" textAnchor="middle" className="fill-foreground text-xs">Всего</text>
                <text x="50%" y="56%" textAnchor="middle" className="fill-foreground text-sm font-bold">
                  {fmt(financial.monthlyRevenue)} ₼
                </text>
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
              {(financial.revenueByService || []).map((s: any, i: number) => {
                const total = (financial.revenueByService || []).reduce((a: number, b: any) => a + b.value, 0)
                const pct = total > 0 ? ((s.value / total) * 100).toFixed(0) : "0"
                return (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: SERVICE_COLORS[i % SERVICE_COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{s.name}</span>
                    <span className="ml-auto font-mono">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Sales Forecast + Lead Funnel ═══ */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Sales Forecast */}
        <Card className="lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Прогноз продаж (6 мес.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forecast?.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={forecast} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => fmt(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, name: string) => [`${v.toLocaleString()} ₼`, name === "actual" ? "Факт" : "Прогноз"]} />
                  <Legend formatter={(v: string) => v === "actual" ? "Факт" : "Прогноз"} />
                  <Bar dataKey="actual" fill="#22c55e" radius={[4, 4, 0, 0]} name="actual" />
                  <Bar dataKey="projected" fill="#3b82f6" radius={[4, 4, 0, 0]} name="projected" opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground">Нет данных</div>
            )}
          </CardContent>
        </Card>

        {/* Lead Funnel */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDown className="h-4 w-4" /> Воронка лидов
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(leads.funnel || []).length > 0 ? (
              <div className="space-y-2">
                {(leads.funnel || []).map((item: any, i: number) => {
                  const funnelColors: Record<string, string> = {
                    new: "#3b82f6", contacted: "#f59e0b", qualified: "#8b5cf6",
                    converted: "#22c55e", rejected: "#94a3b8",
                  }
                  const funnelLabels: Record<string, string> = {
                    new: "Новый", contacted: "Связались", qualified: "Квалифицир.",
                    converted: "Конвертирован", rejected: "Не подходит",
                  }
                  const maxCount = Math.max(...(leads.funnel || []).map((f: any) => f.count || 1))
                  const width = Math.max((item.count / maxCount) * 100, 12)
                  return (
                    <div key={item.status}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>{funnelLabels[item.status] || item.status}</span>
                        <span className="font-mono">{item.count} ({item.pct}%)</span>
                      </div>
                      <div className="w-full h-6 bg-muted/50 rounded overflow-hidden">
                        <div
                          className="h-full rounded flex items-center justify-center"
                          style={{ width: `${width}%`, backgroundColor: funnelColors[item.status] || "#94a3b8" }}
                        >
                          {width > 20 && <span className="text-[10px] text-white font-medium">{item.count}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between pt-3 mt-2 border-t">
                  <span className="text-xs text-muted-foreground">Конверсия</span>
                  <span className={`text-lg font-bold ${(leads.conversionRate || 0) > 20 ? "text-green-600" : "text-amber-600"}`}>
                    {leads.conversionRate || 0}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground">Нет данных по лидам</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Three Column Analytics ═══ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pipeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Воронка продаж
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
                <div className="text-[10px] text-muted-foreground">Выиграно</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-500">{pipeline.lostThisMonth}</div>
                <div className="text-[10px] text-muted-foreground">Проиграно</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{fmt(pipeline.wonValue)} ₼</div>
                <div className="text-[10px] text-muted-foreground">Сумма побед</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Здоровье клиентов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 text-center p-2 rounded-lg bg-white dark:bg-card border">
                <div className="text-xl font-bold text-green-600">{clients.profitable}</div>
                <div className="text-[10px] text-green-600">Прибыльных</div>
              </div>
              <div className="flex-1 text-center p-2 rounded-lg bg-white dark:bg-card border">
                <div className="text-xl font-bold text-red-600">{clients.loss}</div>
                <div className="text-[10px] text-red-600">Убыточных</div>
              </div>
              <div className="flex-1 text-center p-2 rounded-lg bg-white dark:bg-card border">
                <div className="text-xl font-bold text-slate-500">{clients.noRevenue}</div>
                <div className="text-[10px] text-slate-500">Без дохода</div>
              </div>
            </div>

            {clients.topClients?.length > 0 && (
              <>
                <div className="flex items-center text-[10px] text-muted-foreground mb-1">
                  <span className="flex-1">Топ-5 клиентов</span>
                  <span className="ml-2 w-16 text-right">Доход</span>
                  <span className="ml-2 w-12 text-right">Маржа</span>
                </div>
                <div className="space-y-1">
                  {clients.topClients.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-muted/50 last:border-0">
                      <span className="truncate flex-1">{c.name}</span>
                      <span className="font-mono text-green-600 ml-2 w-16 text-right">{fmt(c.revenue)} ₼</span>
                      <span className={`font-mono ml-2 w-12 text-right ${c.marginPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {c.marginPct?.toFixed(0) || 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {clients.bottomClients?.length > 0 && (
              <>
                <p className="text-xs font-medium text-red-500 mt-3 mb-1.5">Убыточные</p>
                <div className="space-y-1">
                  {clients.bottomClients.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1">
                      <span className="truncate flex-1">{c.name}</span>
                      <span className="font-mono text-red-500 ml-2">{fmt(c.margin)} ₼</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Lead Temperature */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="h-4 w-4" /> Температура лидов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 text-center p-3 rounded-lg bg-white dark:bg-card border">
                <Flame className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-red-500">{hot}</div>
                <div className="text-[10px] text-red-500 font-medium">HOT</div>
              </div>
              <div className="flex-1 text-center p-3 rounded-lg bg-white dark:bg-card border">
                <Thermometer className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-amber-500">{warm}</div>
                <div className="text-[10px] text-amber-500 font-medium">WARM</div>
              </div>
              <div className="flex-1 text-center p-3 rounded-lg bg-white dark:bg-card border">
                <Snowflake className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-500">{cold}</div>
                <div className="text-[10px] text-blue-500 font-medium">COLD</div>
              </div>
            </div>

            {/* Temperature bar */}
            {totalLeads > 0 && (
              <div className="w-full h-3 rounded-full overflow-hidden flex mb-4">
                {hot > 0 && <div style={{ width: `${(hot/totalLeads)*100}%`, backgroundColor: COLORS.hot }} />}
                {warm > 0 && <div style={{ width: `${(warm/totalLeads)*100}%`, backgroundColor: COLORS.warm }} />}
                {cold > 0 && <div style={{ width: `${(cold/totalLeads)*100}%`, backgroundColor: COLORS.cold }} />}
              </div>
            )}

            {/* Operations mini-stats */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t">
              <div className="p-2 rounded bg-white dark:bg-card border text-center">
                <div className="text-sm font-bold">{operations.csatScore > 0 ? operations.csatScore.toFixed(1) : "—"}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                  <Star className="h-2.5 w-2.5 text-yellow-500" /> CSAT
                </div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-card border text-center">
                <div className="text-sm font-bold">{tasks.completionRate}%</div>
                <div className="text-[10px] text-muted-foreground">Задачи выполн.</div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-card border text-center">
                <div className="text-sm font-bold">{activity.count30d}</div>
                <div className="text-[10px] text-muted-foreground">Активность 30д</div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-card border text-center">
                <div className="text-sm font-bold">{operations.criticalTickets}</div>
                <div className="text-[10px] text-muted-foreground">Крит. тикеты</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Bottom Row ═══ */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Risks */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Риски и предупреждения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {risks.map((r: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border-l-4 bg-white dark:bg-card border ${
                    r.severity === "critical" ? "border-l-red-500" :
                    r.severity === "warning" ? "border-l-amber-500" :
                    "border-l-green-500"
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.description}</div>
                  </div>
                  <Badge variant={r.severity === "critical" ? "destructive" : r.severity === "warning" ? "secondary" : "default"} className="text-xs">
                    {r.metric}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* At Risk Deals */}
        {atRiskDeals && atRiskDeals.length > 0 && (
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" /> Сделки под угрозой
                <Badge variant="destructive" className="ml-auto text-xs">{atRiskDeals.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {atRiskDeals.map((d: any) => (
                  <div
                    key={d.id}
                    onClick={() => window.location.href = `/deals/${d.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-100/50 cursor-pointer transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-red-600">{d.predictive}%</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.company || "—"} · {d.stage} · {d.daysInFunnel}d in funnel
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">{d.value?.toLocaleString()} {d.currency}</p>
                      <div className="flex gap-1 justify-end mt-0.5">
                        <span className="text-[9px] bg-blue-100 text-blue-700 rounded px-1">C:{d.confidence}%</span>
                        <span className="text-[9px] bg-green-100 text-green-700 rounded px-1">P:{d.probability}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tickets by Status */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4" /> Тикеты по статусу
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(operations.ticketsByStatus || []).map((t: any, i: number) => {
                const total = (operations.ticketsByStatus || []).reduce((s: number, x: any) => s + x.count, 0)
                const pct = total > 0 ? (t.count / total) * 100 : 0
                const statusColor = t.status === "new" ? "#3b82f6" : t.status === "in_progress" ? "#f59e0b" :
                  t.status === "waiting" ? "#8b5cf6" : t.status === "resolved" ? "#22c55e" : "#94a3b8"
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{statusLabels[t.status] || t.status}</span>
                      <span className="font-mono">{t.count}</span>
                    </div>
                    <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: statusColor }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t text-center">
              <div>
                <div className="text-lg font-bold">{operations.openTickets}</div>
                <div className="text-[10px] text-muted-foreground">Открытых</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-500">
                  {operations.csatScore > 0 ? `${operations.csatScore.toFixed(1)} ★` : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">CSAT ({operations.csatCount})</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Последняя активность
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {(activity.recent || []).map((a: any) => (
                <div key={a.id} className="flex items-start gap-2.5">
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
                <div className="text-xs text-muted-foreground py-4 text-center">Нет активности</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Bottom Row — Leaderboard + This Week Summary ═══ */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Sales Leaderboard */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4" /> Лидерборд продаж
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(pipeline.topDeals || []).length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">Нет данных</div>
            ) : (
              <div className="space-y-2">
                {(pipeline.topDeals || []).slice(0, 5).map((deal: any, i: number) => (
                  <div key={deal.id || i} className="flex items-center gap-2.5">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-yellow-100 text-yellow-700" :
                      i === 1 ? "bg-gray-100 text-gray-600" :
                      i === 2 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{deal.title || deal.name}</p>
                      <p className="text-[10px] text-muted-foreground">{deal.company?.name || deal.stage || "—"}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{fmt(deal.value || deal.amount || 0)} ₼</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* This Week Summary */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> За эту неделю
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Новые лиды", value: leads.totalLeads || 0, icon: <Target className="h-3.5 w-3.5 text-blue-500" /> },
                { label: "Задачи выполнены", value: tasks?.completed || 0, icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> },
                { label: "Тикеты открыты", value: operations.openTickets || 0, icon: <Ticket className="h-3.5 w-3.5 text-violet-500" /> },
                { label: "Активности", value: activity?.total || (activity?.recent || []).length, icon: <Activity className="h-3.5 w-3.5 text-amber-500" /> },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2.5">
                  {s.icon}
                  <span className="flex-1 text-sm text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-bold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4" /> Быстрые ссылки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Сделки", href: "/deals", icon: <Handshake className="h-4 w-4" />, color: "bg-blue-50 text-blue-600" },
                { label: "Тикеты", href: "/tickets", icon: <Ticket className="h-4 w-4" />, color: "bg-violet-50 text-violet-600" },
                { label: "Мероприятия", href: "/events", icon: <Users className="h-4 w-4" />, color: "bg-green-50 text-green-600" },
                { label: "Отчёты", href: "/reports", icon: <BarChart3 className="h-4 w-4" />, color: "bg-amber-50 text-amber-600" },
              ].map(q => (
                <a key={q.label} href={q.href} className={`flex items-center gap-2 p-2.5 rounded-lg ${q.color} hover:opacity-80 transition-opacity`}>
                  {q.icon}
                  <span className="text-xs font-medium">{q.label}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
