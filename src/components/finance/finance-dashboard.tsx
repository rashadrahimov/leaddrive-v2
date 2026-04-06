"use client"

import { useState } from "react"
import { useFinanceDashboard } from "@/lib/finance/hooks"
import { FinanceKpiCard } from "./finance-kpi-card"
import { FinanceAlerts } from "./finance-alerts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, FileText,
  CreditCard,
} from "lucide-react"
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart,
} from "recharts"

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

export function FinanceDashboard() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading, error } = useFinanceDashboard(year)

  if (isLoading) return <DashboardSkeleton />
  if (error) return <div className="p-8 text-center text-red-500">Ошибка загрузки: {(error as Error).message}</div>
  if (!data) return <div className="p-8 text-center text-muted-foreground">Нет данных</div>

  const { kpis, revenueTrend, expenseBreakdown, arAging, alerts } = data

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Финансовый обзор</h2>
          <p className="text-sm text-muted-foreground">Ключевые показатели и тренды за {year} год</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Alerts */}
      <FinanceAlerts alerts={alerts} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <FinanceKpiCard
          title="Выручка"
          value={kpis.revenue.fact}
          plan={kpis.revenue.plan}
          variancePct={kpis.revenue.variancePct}
          icon={<TrendingUp className="w-5 h-5" />}
          color="#22c55e"
        />
        <FinanceKpiCard
          title="Расходы"
          value={kpis.expenses.fact}
          plan={kpis.expenses.plan}
          variancePct={kpis.expenses.variancePct}
          icon={<TrendingDown className="w-5 h-5" />}
          color="#ef4444"
          invertVariance
        />
        <FinanceKpiCard
          title="Чистая прибыль"
          value={kpis.netProfit.fact}
          icon={<DollarSign className="w-5 h-5" />}
          color={kpis.netProfit.fact >= 0 ? "#22c55e" : "#ef4444"}
        />
        <FinanceKpiCard
          title="Остаток ДС"
          value={kpis.cashBalance.current}
          icon={<Wallet className="w-5 h-5" />}
          color={kpis.cashBalance.current >= 0 ? "#3b82f6" : "#ef4444"}
        />
        <FinanceKpiCard
          title="Дебиторка"
          value={kpis.arTotal.amount}
          sub={kpis.arTotal.overdueCount > 0 ? `${kpis.arTotal.overdueCount} просрочено` : undefined}
          icon={<FileText className="w-5 h-5" />}
          color="#f59e0b"
        />
        <FinanceKpiCard
          title="Кредиторка"
          value={kpis.apTotal.amount}
          sub={kpis.apTotal.overdueCount > 0 ? `${kpis.apTotal.overdueCount} просрочено` : undefined}
          icon={<CreditCard className="w-5 h-5" />}
          color="#8b5cf6"
        />
      </div>

      {/* Charts Row 1: Revenue Trend + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue & Expense Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Тренд выручки и расходов</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip
                  formatter={((value: number, name: string) => [fmt(value) + " AZN", name === "revenue" ? "Выручка" : name === "expenses" ? "Расходы" : "Нетто"]) as any}
                  labelFormatter={(label) => `${label} ${year}`}
                />
                <Bar dataKey="revenue" fill="#22c55e" opacity={0.8} radius={[4, 4, 0, 0]} name="revenue" />
                <Bar dataKey="expenses" fill="#ef4444" opacity={0.8} radius={[4, 4, 0, 0]} name="expenses" />
                <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot={false} name="net" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Структура расходов</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="amount"
                    >
                      {expenseBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={((value: number) => fmt(value) + " AZN") as any} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {expenseBreakdown.map((item) => (
                    <div key={item.category} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate max-w-[120px]">{item.category}</span>
                      </div>
                      <span className="font-medium tabular-nums">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Нет данных по расходам</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: A/R Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Возраст дебиторки</CardTitle>
          </CardHeader>
          <CardContent>
            {arAging.some((b) => b.amount > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={arAging} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={((value: number) => fmt(value) + " AZN") as any} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {arAging.map((_, i) => (
                      <Cell key={i} fill={["#3b82f6", "#22c55e", "#f59e0b", "#f97316", "#ef4444"][i % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Нет данных по дебиторке</div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Финансовая сводка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <SummaryRow label="Выручка (план)" value={kpis.revenue.plan} color="#22c55e" />
              <SummaryRow label="Выручка (факт)" value={kpis.revenue.fact} color="#16a34a" />
              <SummaryRow label="Расходы (план)" value={kpis.expenses.plan} color="#f59e0b" />
              <SummaryRow label="Расходы (факт)" value={kpis.expenses.fact} color="#ef4444" />
              <div className="border-t pt-2" />
              <SummaryRow label="Чистая прибыль" value={kpis.netProfit.fact} color={kpis.netProfit.fact >= 0 ? "#22c55e" : "#ef4444"} bold />
              <SummaryRow label="Остаток ДС" value={kpis.cashBalance.current} color="#3b82f6" bold />
              <div className="border-t pt-2" />
              <SummaryRow label="Дебиторка (A/R)" value={kpis.arTotal.amount} color="#f59e0b" />
              <SummaryRow label="Кредиторка (A/P)" value={kpis.apTotal.amount} color="#8b5cf6" />
              <SummaryRow label="Нетто-позиция (A/R − A/P)" value={kpis.arTotal.amount - kpis.apTotal.amount} color="#3b82f6" bold />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${bold ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? "font-bold" : "font-medium"}`} style={{ color }}>
        {fmt(value)} AZN
      </span>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="h-8 w-48" />
        <div className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[100px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-[340px] lg:col-span-2 rounded-xl" />
        <div className="h-[340px] rounded-xl" />
      </div>
    </div>
  )
}
