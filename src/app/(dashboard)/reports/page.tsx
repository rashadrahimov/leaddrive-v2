"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp, DollarSign, BarChart3, CheckSquare, Clock,
  Users, Building2, Target, FileText, Wallet, ArrowRight, Star,
} from "lucide-react"

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

const funnelLabels: Record<string, string> = {
  new: "Новый",
  contacted: "Связались",
  qualified: "Квалифицирован",
  converted: "Конвертирован",
  rejected: "Не подходит",
  cancelled: "Аннулирован",
}

const funnelColors: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  qualified: "bg-purple-500",
  converted: "bg-green-500",
  rejected: "bg-gray-400",
  cancelled: "bg-red-400",
}

const stageLabels: Record<string, string> = {
  LEAD: "Лид",
  QUALIFIED: "Квалифицирован",
  PROPOSAL: "Предложение",
  NEGOTIATION: "Переговоры",
  WON: "Выигрыш",
  LOST: "Проиграно",
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
        <h1 className="text-2xl font-bold tracking-tight">Отчёты и аналитика</h1>
        <div className="animate-pulse grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // Lead funnel — ordered stages
  const funnelOrder = ["new", "contacted", "qualified", "converted", "rejected", "cancelled"]
  const funnelData = funnelOrder
    .map(status => {
      const found = data.leadFunnel?.find(f => f.status === status)
      return { status, count: found?.count || 0 }
    })
    .filter(f => f.count > 0)
  const maxFunnelCount = Math.max(...funnelData.map(f => f.count), 1)

  // Sales forecast — simple linear projection based on won deals
  const monthlyRevenue = data.financial?.monthlyRevenue || 0
  const wonRevenue = data.revenue.totalRevenue
  const avgMonthlyWon = wonRevenue > 0 ? wonRevenue / 6 : 0 // rough 6-month average
  const forecastMonths = ["Апр", "Май", "Июн", "Июл", "Авг", "Сен"]
  const forecastValues = forecastMonths.map((_, i) => {
    const base = monthlyRevenue + avgMonthlyWon
    const growth = 1 + (i * 0.05) // 5% growth per month
    return Math.round(base * growth)
  })
  const maxForecast = Math.max(...forecastValues, 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Отчёты и аналитика</h1>
          <p className="text-muted-foreground">Бизнес-аналитика и прогнозы</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Клиенты" value={data.overview.companies} icon={<Building2 className="h-4 w-4" />} />
        <StatCard title="Контакты" value={data.overview.contacts} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Сделки" value={data.overview.deals} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard title="Лиды (новый)" value={data.overview.leads} icon={<Target className="h-4 w-4" />} />
        <StatCard title="Задачи (просрочено)" value={data.overview.overdueTasks} icon={<CheckSquare className="h-4 w-4" />} trend={data.overview.overdueTasks > 0 ? "down" : "neutral"} />
        <StatCard title="Тикеты" value={data.overview.tickets} icon={<Clock className="h-4 w-4" />} />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Financial Overview (T43) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Финансовый обзор</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Доход и контракты</p>
              </div>
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Доход (выигранные)</span>
                <span className="font-bold text-green-600">{data.revenue.totalRevenue.toLocaleString()} ₼</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ежемесячный (контракты)</span>
                <span className="font-bold">{(data.financial?.monthlyRevenue || 0).toLocaleString()} ₼</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Воронка (общая)</span>
                <span className="font-bold">{data.pipeline.totalPipelineValue.toLocaleString()} ₼</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span>Контрактов всего</span>
                  <span className="font-medium">{data.financial?.totalContracts || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Активных</span>
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
                <CardTitle className="text-base">Воронка сделок</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">По этапам</p>
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

        {/* Lead Funnel (T42) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Воронка лидов</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Конверсия: {data.leads.conversionRate}%</p>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelData.map((f, i) => {
                const widthPct = (f.count / maxFunnelCount) * 100
                return (
                  <div key={f.status}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="flex items-center gap-1">
                        {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                        {funnelLabels[f.status] || f.status}
                      </span>
                      <span className="font-medium">{f.count}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${funnelColors[f.status] || "bg-gray-400"}`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Task Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Сводка задач</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Выполнение и просрочки</p>
              </div>
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tasks.completionRate}%</div>
            <div className="text-xs text-muted-foreground mb-2">Процент выполнения</div>
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${data.tasks.completionRate}%` }} />
            </div>
            <div className="space-y-1">
              {data.tasks.byStatus.map(t => (
                <div key={t.status} className="flex justify-between text-xs">
                  <span className="capitalize">{t.status === "completed" ? "Выполнено" : t.status === "in_progress" ? "В работе" : t.status === "todo" || t.status === "pending" ? "К выполнению" : t.status}</span>
                  <span className="font-medium">{t.count}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-red-500">
                <span>Просрочено</span>
                <span className="font-medium">{data.tasks.overdue}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Clients (T44) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Топ-10 клиентов</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">По доходу</p>
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
              <div className="text-sm text-muted-foreground text-center py-4">Нет данных</div>
            )}
          </CardContent>
        </Card>

        {/* Sales Forecast (T45) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Прогноз продаж</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">6 месяцев</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24 mb-2">
              {forecastValues.map((val, i) => {
                const heightPct = (val / maxForecast) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-[9px] text-muted-foreground">{(val / 1000).toFixed(1)}k</span>
                    <div className="w-full bg-muted rounded-t overflow-hidden" style={{ height: "80px" }}>
                      <div
                        className="w-full bg-primary/70 rounded-t transition-all mt-auto"
                        style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1">
              {forecastMonths.map(m => (
                <div key={m} className="flex-1 text-center text-[10px] text-muted-foreground">{m}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ticket SLA */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">SLA Тикетов</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Решение и открытые</p>
              </div>
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tickets.resolutionRate}%</div>
            <div className="text-xs text-muted-foreground mb-2">Процент решения</div>
            <div className="space-y-1">
              {data.tickets.byStatus.map(t => (
                <div key={t.status} className="flex justify-between text-xs">
                  <span className="capitalize">{t.status === "new" ? "Новый" : t.status === "in_progress" ? "В работе" : t.status === "resolved" ? "Решён" : t.status === "closed" ? "Закрыт" : t.status}</span>
                  <span className="font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lead Conversion */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Конверсия лидов</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">По статусам</p>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.leads.conversionRate}%</div>
            <div className="text-xs text-muted-foreground mb-2">Конверсия</div>
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
                <CardTitle className="text-base">Удовлетворённость (CSAT)</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Оценки клиентов</p>
              </div>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{data.csat?.average || 0}</span>
              <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">{data.csat?.totalRatings || 0} оценок</div>
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
                <CardTitle className="text-base">Доход от сделок</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Выигранные</p>
              </div>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.revenue.totalRevenue.toLocaleString()} ₼</div>
            <div className="text-xs text-muted-foreground">{data.revenue.wonDealsCount} выигранных сделок</div>
            <div className="text-xs text-muted-foreground mt-1">Ср. размер: {data.revenue.avgDealSize.toLocaleString()} ₼</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
