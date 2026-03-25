"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ColorStatCard } from "@/components/color-stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  PiggyBank, Plus, Trash2, Pencil, Loader2, TrendingUp, TrendingDown,
  CheckCircle, AlertCircle, BarChart2, DollarSign, CalendarRange, Link2,
  ChevronDown, ChevronRight,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Area,
} from "recharts"
import {
  useBudgetPlans,
  useCreateBudgetPlan,
  useUpdateBudgetPlan,
  useDeleteBudgetPlan,
  useBudgetLines,
  useCreateBudgetLine,
  useUpdateBudgetLine,
  useDeleteBudgetLine,
  useBudgetActuals,
  useCreateBudgetActual,
  useUpdateBudgetActual,
  useDeleteBudgetActual,
  useBudgetAnalytics,
  useBudgetSections,
  useCreateBudgetSection,
  useDeleteBudgetSection,
  useBudgetForecastEntries,
  useUpsertBudgetForecast,
  useAINarrative,
  useSyncActuals,
} from "@/lib/budgeting/hooks"
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_REVENUE_CATEGORIES,
  DEPARTMENTS,
  SECTION_TYPES,
  type BudgetLine,
} from "@/lib/budgeting/types"
import { COST_MODEL_KEY_OPTIONS, TEMPLATE_CATEGORY_MAP } from "@/lib/budgeting/cost-model-map"
import { buildMonthlyForecast, buildCategoryForecast, applyScenario } from "@/lib/budgeting/forecast"
import { BudgetWaterfallChart } from "@/components/budget-waterfall-chart"

const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#f97316", "#06b6d4", "#84cc16"]

function fmt(n: number): string {
  return Math.round(n).toLocaleString() + " ₼"
}

function statusBadge(status: string) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Утверждён</Badge>
  if (status === "closed") return <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Закрыт</Badge>
  return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Черновик</Badge>
}

function periodLabel(plan: any): string {
  if (plan.periodType === "monthly" && plan.month) {
    const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
    return `${months[plan.month - 1]} ${plan.year}`
  }
  if (plan.periodType === "quarterly" && plan.quarter) return `Q${plan.quarter} ${plan.year}`
  return `${plan.year}`
}

// ─── Create Plan Dialog ───────────────────────────────────────────────────────

function CreatePlanDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateBudgetPlan()
  const [name, setName] = useState("")
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly" | "annual">("monthly")
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [quarter, setQuarter] = useState(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync({
      name,
      periodType,
      year,
      month: periodType === "monthly" ? month : undefined,
      quarter: periodType === "quarterly" ? quarter : undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Создать бюджетный план</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Название</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Апрель 2026" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Тип периода</label>
              <select value={periodType} onChange={e => setPeriodType(e.target.value as any)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                <option value="monthly">Месячный</option>
                <option value="quarterly">Квартальный</option>
                <option value="annual">Годовой</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Год</label>
              <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} min={2020} max={2030} required />
            </div>
            {periodType === "monthly" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Месяц</label>
                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                  {["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            )}
            {periodType === "quarterly" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Квартал</label>
                <select value={quarter} onChange={e => setQuarter(Number(e.target.value))}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={create.isPending} className="flex-1">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Add Line Form ─────────────────────────────────────────────────────────────

function AddLineForm({ planId, existingCategories }: { planId: string; existingCategories: string[] }) {
  const create = useCreateBudgetLine()
  const [category, setCategory] = useState("")
  const [department, setDepartment] = useState("")
  const [customDept, setCustomDept] = useState("")
  const [lineType, setLineType] = useState<"expense" | "revenue">("expense")
  const [amount, setAmount] = useState("")
  const [forecastAmount, setForecastAmount] = useState("")
  const [costModelKey, setCostModelKey] = useState("")
  const [notes, setNotes] = useState("")
  const [show, setShow] = useState(false)

  const allCategories = useMemo(() => {
    const set = new Set([...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_REVENUE_CATEGORIES, ...existingCategories])
    return Array.from(set)
  }, [existingCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const resolvedDept = department === "__custom__" ? customDept : department
    await create.mutateAsync({
      planId,
      category,
      department: resolvedDept || undefined,
      lineType,
      plannedAmount: Number(amount),
      forecastAmount: forecastAmount ? Number(forecastAmount) : undefined,
      costModelKey: costModelKey || undefined,
      isAutoActual: !!costModelKey,
      notes: notes || undefined,
    })
    setCategory(""); setDepartment(""); setCustomDept(""); setAmount(""); setForecastAmount(""); setCostModelKey(""); setNotes("")
    setShow(false)
  }

  if (!show) return (
    <Button size="sm" onClick={() => setShow(true)} className="mb-4">
      <Plus className="h-4 w-4 mr-1" /> Добавить статью
    </Button>
  )

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <datalist id="categories-list">
            {allCategories.map(c => <option key={c} value={c} />)}
          </datalist>
          <div>
            <label className="text-xs font-medium mb-1 block">Категория</label>
            <Input list="categories-list" value={category} onChange={e => setCategory(e.target.value)}
              placeholder="Введите или выберите..." required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Департамент</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">— Все —</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="__custom__">Другой...</option>
            </select>
            {department === "__custom__" && (
              <Input className="mt-1" value={customDept} onChange={e => setCustomDept(e.target.value)}
                placeholder="Название департамента" />
            )}
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Тип</label>
            <select value={lineType} onChange={e => setLineType(e.target.value as any)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="expense">Расход</option>
              <option value="revenue">Доход</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Плановая сумма (₼)</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={0} step={0.01} required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Прогноз (₼)</label>
            <Input type="number" value={forecastAmount} onChange={e => setForecastAmount(e.target.value)} min={0} step={0.01} placeholder="= план если пусто" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium mb-1 block flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Привязка к cost model
            </label>
            <select value={costModelKey} onChange={e => setCostModelKey(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">— Ручной ввод факта —</option>
              {COST_MODEL_KEY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>[{o.group}] {o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Заметки</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Необязательно" />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={create.isPending} size="sm">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Добавить"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShow(false)}>Отмена</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Add Actual Form ───────────────────────────────────────────────────────────

function AddActualForm({ planId, existingCategories }: { planId: string; existingCategories: string[] }) {
  const create = useCreateBudgetActual()
  const [category, setCategory] = useState("")
  const [department, setDepartment] = useState("")
  const [customDept, setCustomDept] = useState("")
  const [lineType, setLineType] = useState<"expense" | "revenue">("expense")
  const [amount, setAmount] = useState("")
  const [expenseDate, setExpenseDate] = useState("")
  const [description, setDescription] = useState("")
  const [show, setShow] = useState(false)

  const allCategories = useMemo(() => {
    const set = new Set([...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_REVENUE_CATEGORIES, ...existingCategories])
    return Array.from(set)
  }, [existingCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const resolvedDept = department === "__custom__" ? customDept : department
    await create.mutateAsync({
      planId,
      category,
      department: resolvedDept || undefined,
      lineType,
      actualAmount: Number(amount),
      expenseDate: expenseDate || undefined,
      description: description || undefined,
    })
    setCategory(""); setDepartment(""); setCustomDept(""); setAmount(""); setExpenseDate(""); setDescription("")
    setShow(false)
  }

  if (!show) return (
    <Button size="sm" onClick={() => setShow(true)} className="mb-4">
      <Plus className="h-4 w-4 mr-1" /> Добавить факт
    </Button>
  )

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <datalist id="actuals-categories-list">
            {allCategories.map(c => <option key={c} value={c} />)}
          </datalist>
          <div>
            <label className="text-xs font-medium mb-1 block">Категория</label>
            <Input list="actuals-categories-list" value={category} onChange={e => setCategory(e.target.value)}
              placeholder="Введите или выберите..." required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Департамент</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">— Все —</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="__custom__">Другой...</option>
            </select>
            {department === "__custom__" && (
              <Input className="mt-1" value={customDept} onChange={e => setCustomDept(e.target.value)}
                placeholder="Название департамента" />
            )}
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Тип</label>
            <select value={lineType} onChange={e => setLineType(e.target.value as any)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="expense">Расход</option>
              <option value="revenue">Доход</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Фактическая сумма (₼)</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={0} step={0.01} required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Дата</label>
            <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Описание</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Необязательно" />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={create.isPending} size="sm">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Добавить"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShow(false)}>Отмена</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ planId }: { planId: string }) {
  const { data: analytics, isLoading, error } = useBudgetAnalytics(planId)
  const aiNarrative = useAINarrative()
  const syncActuals = useSyncActuals()
  const [narrative, setNarrative] = useState<string | null>(null)
  const [showNarrative, setShowNarrative] = useState(false)

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    </div>
  )
  if (error || !analytics) return (
    <div className="text-center py-20 text-muted-foreground">Ошибка загрузки аналитики</div>
  )

  const { totalPlanned, totalForecast, totalActual, totalVariance, executionPct, yearEndProjection, byCategory, byDepartment, autoActualTotal } = analytics

  const execEmoji = executionPct >= 90 ? "🟢" : executionPct >= 60 ? "🟡" : "🔴"

  const handleAINarrative = async () => {
    setShowNarrative(true)
    try {
      const result = await aiNarrative.mutateAsync({ planId })
      setNarrative(result.narrative)
    } catch {
      setNarrative("Ошибка генерации нарратива. Проверьте ANTHROPIC_API_KEY.")
    }
  }

  const handleSyncActuals = async () => {
    try {
      const result = await syncActuals.mutateAsync(planId)
      alert(`Обновлено ${result.synced} записей из cost model`)
    } catch {
      alert("Ошибка синхронизации с cost model")
    }
  }

  const barData = byCategory.slice(0, 12).map(c => ({
    name: c.category.length > 18 ? c.category.slice(0, 18) + "…" : c.category,
    "План": Math.round(c.planned),
    "Прогноз": Math.round(c.forecast),
    "Факт": Math.round(c.actual),
  }))

  const pieData = byCategory
    .filter(c => c.planned > 0)
    .sort((a, b) => b.planned - a.planned)
    .slice(0, 8)
    .map(c => ({ name: c.category.length > 18 ? c.category.slice(0, 18) + "…" : c.category, value: Math.round(c.planned) }))

  return (
    <div className="space-y-6">
      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <ColorStatCard label="ПЛАН" value={fmt(totalPlanned)} icon={<BarChart2 className="h-5 w-5" />} color="blue" />
        <ColorStatCard label="ПРОГНОЗ" value={fmt(totalForecast)} icon={<TrendingUp className="h-5 w-5" />} color="violet" />
        <ColorStatCard
          label={autoActualTotal > 0 ? "ФАКТ (cost model)" : "ФАКТ"}
          value={fmt(totalActual)}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
        />
        <ColorStatCard
          label="ОТКЛОНЕНИЕ"
          value={(totalVariance >= 0 ? "+" : "") + fmt(totalVariance)}
          icon={totalVariance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          color={totalVariance >= 0 ? "teal" : "red"}
        />
        <ColorStatCard
          label="ПРОЕКЦИЯ НА КОНЕЦ ГОДА"
          value={fmt(yearEndProjection)}
          icon={<CalendarRange className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* Action buttons: AI narrative + sync actuals */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleAINarrative} disabled={aiNarrative.isPending}>
          {aiNarrative.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <AlertCircle className="h-4 w-4 mr-1" />}
          Объяснить отклонения (AI)
        </Button>
        {autoActualTotal > 0 && (
          <Button size="sm" variant="outline" onClick={handleSyncActuals} disabled={syncActuals.isPending}>
            {syncActuals.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
            Обновить факт из cost model
          </Button>
        )}
      </div>

      {/* AI Narrative Card */}
      {showNarrative && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-purple-600" /> AI-анализ отклонений
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => { setShowNarrative(false); setNarrative(null) }}>✕</Button>
            </div>
          </CardHeader>
          <CardContent>
            {narrative ? (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{narrative}</div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Генерация нарратива...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Execution % */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">Исполнение бюджета:</span>
        <span className={`font-bold text-lg ${executionPct >= 90 ? "text-green-600 dark:text-green-400" : executionPct >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
          {execEmoji} {Math.round(executionPct)}%
        </span>
        {executionPct >= 90
          ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          : <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
      </div>

      {/* Charts */}
      {barData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">План / Прогноз / Факт по категориям</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(0) + "k"} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="План" fill="#ef4444" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Прогноз" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Факт" fill="#10b981" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Состав плановых расходов</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Waterfall chart */}
      {byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Водопадный анализ</CardTitle>
              <a
                href={`/api/budgeting/export?planId=${planId}`}
                className="text-xs text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:no-underline"
                download
              >
                Скачать Excel
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <BudgetWaterfallChart
              totalPlanned={totalPlanned}
              totalForecast={totalForecast}
              totalActual={totalActual}
              totalVariance={totalVariance}
              yearEndProjection={yearEndProjection}
            />
          </CardContent>
        </Card>
      )}

      {/* 3-column variance table */}
      {byCategory.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Таблица: Бюджет | Прогноз | Факт</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Категория</th>
                    <th className="px-4 py-2 text-left font-medium">Тип</th>
                    <th className="px-4 py-2 text-right font-medium">Бюджет</th>
                    <th className="px-4 py-2 text-right font-medium text-purple-600 dark:text-purple-400">Прогноз</th>
                    <th className="px-4 py-2 text-right font-medium text-green-600 dark:text-green-400">Факт</th>
                    <th className="px-4 py-2 text-right font-medium">Отклонение</th>
                    <th className="px-4 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2">{row.category}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs">
                          {row.lineType === "revenue" ? "Доход" : "Расход"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(row.planned)}</td>
                      <td className="px-4 py-2 text-right font-mono text-purple-600 dark:text-purple-400">{fmt(row.forecast)}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-600 dark:text-green-400">{fmt(row.actual)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${row.variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {row.variance >= 0 ? "+" : ""}{fmt(row.variance)}
                      </td>
                      <td className={`px-4 py-2 text-right ${row.variancePct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {row.variancePct >= 0 ? "+" : ""}{Math.round(row.variancePct)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Department */}
      {byDepartment.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">По департаментам</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Департамент</th>
                    <th className="px-4 py-2 text-right font-medium">Бюджет</th>
                    <th className="px-4 py-2 text-right font-medium text-purple-600 dark:text-purple-400">Прогноз</th>
                    <th className="px-4 py-2 text-right font-medium text-green-600 dark:text-green-400">Факт</th>
                    <th className="px-4 py-2 text-right font-medium">Отклонение</th>
                  </tr>
                </thead>
                <tbody>
                  {byDepartment.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{row.department}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(row.planned)}</td>
                      <td className="px-4 py-2 text-right font-mono text-purple-600 dark:text-purple-400">{fmt(row.forecast)}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-600 dark:text-green-400">{fmt(row.actual)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${row.variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {row.variance >= 0 ? "+" : ""}{fmt(row.variance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {byCategory.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Добавьте плановые статьи для отображения аналитики
        </div>
      )}
    </div>
  )
}

// ─── Lines Tab ────────────────────────────────────────────────────────────────

function LinesTab({ planId }: { planId: string }) {
  const { data: lines = [], isLoading } = useBudgetLines(planId)
  const updateLine = useUpdateBudgetLine()
  const deleteLine = useDeleteBudgetLine()
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<BudgetLine>>({})

  const existingCategories = lines.map(l => l.category)
  const total = lines.reduce((s, l) => s + l.plannedAmount, 0)
  const expenseTotal = lines.filter(l => l.lineType === "expense").reduce((s, l) => s + l.plannedAmount, 0)
  const revenueTotal = lines.filter(l => l.lineType === "revenue").reduce((s, l) => s + l.plannedAmount, 0)

  const startEdit = (line: BudgetLine) => {
    setEditId(line.id)
    setEditData({
      category: line.category,
      department: line.department || "",
      lineType: line.lineType,
      plannedAmount: line.plannedAmount,
      forecastAmount: line.forecastAmount ?? undefined,
      costModelKey: line.costModelKey || "",
      isAutoActual: line.isAutoActual,
      notes: line.notes || "",
    })
  }

  const saveEdit = async (id: string) => {
    await updateLine.mutateAsync({
      id,
      planId,
      category: editData.category,
      department: editData.department ?? undefined,
      lineType: editData.lineType,
      plannedAmount: editData.plannedAmount,
      forecastAmount: editData.forecastAmount ?? undefined,
      costModelKey: editData.costModelKey || undefined,
      isAutoActual: editData.isAutoActual,
      notes: editData.notes ?? undefined,
    })
    setEditId(null)
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>

  return (
    <div>
      <AddLineForm planId={planId} existingCategories={existingCategories} />
      <Card>
        <CardContent className="p-0">
          {lines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Нет статей. Добавьте первую или используйте шаблон.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Категория</th>
                    <th className="px-4 py-2 text-left font-medium">Департ.</th>
                    <th className="px-4 py-2 text-left font-medium">Тип</th>
                    <th className="px-4 py-2 text-right font-medium">Бюджет</th>
                    <th className="px-4 py-2 text-right font-medium text-purple-600 dark:text-purple-400">Прогноз</th>
                    <th className="px-4 py-2 text-left font-medium text-blue-600 dark:text-blue-400">Cost Model</th>
                    <th className="px-4 py-2 text-center font-medium">Автофакт</th>
                    <th className="px-4 py-2 text-center font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(line => (
                    <tr key={line.id} className="border-t border-border/50 hover:bg-muted/30">
                      {editId === line.id ? (
                        <>
                          <td className="px-2 py-1">
                            <datalist id={`edit-cats-${line.id}`}>
                              {[...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_REVENUE_CATEGORIES, ...existingCategories].map(c => <option key={c} value={c} />)}
                            </datalist>
                            <Input list={`edit-cats-${line.id}`} value={editData.category || ""} onChange={e => setEditData(d => ({ ...d, category: e.target.value }))} className="h-7 text-xs" />
                          </td>
                          <td className="px-2 py-1">
                            <Input value={editData.department || ""} onChange={e => setEditData(d => ({ ...d, department: e.target.value }))} className="h-7 text-xs" placeholder="Департамент" />
                          </td>
                          <td className="px-2 py-1">
                            <select value={editData.lineType} onChange={e => setEditData(d => ({ ...d, lineType: e.target.value as any }))}
                              className="border border-border rounded px-2 py-1 text-xs bg-background">
                              <option value="expense">Расход</option>
                              <option value="revenue">Доход</option>
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <Input type="number" value={editData.plannedAmount || ""} onChange={e => setEditData(d => ({ ...d, plannedAmount: Number(e.target.value) }))} className="h-7 text-xs text-right" />
                          </td>
                          <td className="px-2 py-1">
                            <Input type="number" value={editData.forecastAmount || ""} onChange={e => setEditData(d => ({ ...d, forecastAmount: e.target.value ? Number(e.target.value) : undefined }))} className="h-7 text-xs text-right" placeholder="= план" />
                          </td>
                          <td className="px-2 py-1" colSpan={2}>
                            <select value={editData.costModelKey || ""} onChange={e => setEditData(d => ({ ...d, costModelKey: e.target.value, isAutoActual: !!e.target.value }))}
                              className="border border-border rounded px-2 py-1 text-xs bg-background w-full">
                              <option value="">— Вручную —</option>
                              {COST_MODEL_KEY_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" className="h-6 px-2 text-xs" onClick={() => saveEdit(line.id)} disabled={updateLine.isPending}>
                                {updateLine.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "✓"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setEditId(null)}>✕</Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2">{line.category}</td>
                          <td className="px-4 py-2 text-muted-foreground">{line.department || "—"}</td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className="text-xs">
                              {line.lineType === "revenue" ? "Доход" : "Расход"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">{fmt(line.plannedAmount)}</td>
                          <td className="px-4 py-2 text-right font-mono text-purple-600 dark:text-purple-400">
                            {line.forecastAmount != null ? fmt(line.forecastAmount) : <span className="text-muted-foreground text-xs">= план</span>}
                          </td>
                          <td className="px-4 py-2 text-xs text-blue-600 dark:text-blue-400">
                            {line.costModelKey ? <span title={line.costModelKey} className="flex items-center gap-1"><Link2 className="h-3 w-3" />{line.costModelKey.split(".").pop()}</span> : "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {line.isAutoActual
                              ? <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">Авто</Badge>
                              : <span className="text-muted-foreground text-xs">Ручной</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => startEdit(line)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => deleteLine.mutate({ id: line.id, planId })}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/30">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 font-medium text-sm">Итого</td>
                    <td className="px-4 py-2 text-right font-bold font-mono">{fmt(total)}</td>
                    <td colSpan={4} className="px-4 py-2 text-xs text-muted-foreground">
                      Расходы: {fmt(expenseTotal)} | Доходы: {fmt(revenueTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Actuals Tab ───────────────────────────────────────────────────────────────

function ActualsTab({ planId }: { planId: string }) {
  const { data: actuals = [], isLoading } = useBudgetActuals(planId)
  const updateActual = useUpdateBudgetActual()
  const deleteActual = useDeleteBudgetActual()
  const [filterCat, setFilterCat] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ actualAmount: 0, category: "", department: "", expenseDate: "", description: "" })

  const existingCategories = actuals.map(a => a.category)
  const filtered = filterCat ? actuals.filter(a => a.category.toLowerCase().includes(filterCat.toLowerCase())) : actuals
  const total = actuals.reduce((s, a) => s + a.actualAmount, 0)

  const startEdit = (a: any) => {
    setEditId(a.id)
    setEditData({ actualAmount: a.actualAmount, category: a.category, department: a.department || "", expenseDate: a.expenseDate || "", description: a.description || "" })
  }
  const saveEdit = async (id: string) => {
    await updateActual.mutateAsync({ id, planId, actualAmount: editData.actualAmount, category: editData.category, department: editData.department || undefined, expenseDate: editData.expenseDate || undefined, description: editData.description || undefined })
    setEditId(null)
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>

  return (
    <div>
      <AddActualForm planId={planId} existingCategories={existingCategories} />
      <div className="mb-3 flex gap-2 items-center">
        <Input placeholder="Фильтр по категории..." value={filterCat} onChange={e => setFilterCat(e.target.value)} className="max-w-xs" />
        {filterCat && <Button variant="ghost" size="sm" onClick={() => setFilterCat("")}>Сбросить</Button>}
      </div>
      <Card>
        <CardContent className="p-0">
          {actuals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Нет фактических расходов. Добавьте первый.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Категория</th>
                    <th className="px-4 py-2 text-left font-medium">Департамент</th>
                    <th className="px-4 py-2 text-left font-medium">Тип</th>
                    <th className="px-4 py-2 text-right font-medium">Сумма</th>
                    <th className="px-4 py-2 text-left font-medium">Дата</th>
                    <th className="px-4 py-2 text-left font-medium">Описание</th>
                    <th className="px-4 py-2 text-center font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(actual => (
                    <tr key={actual.id} className="border-t border-border/50 hover:bg-muted/30">
                      {editId === actual.id ? (
                        <>
                          <td className="px-2 py-1"><Input value={editData.category} onChange={e => setEditData(d => ({ ...d, category: e.target.value }))} className="h-7 text-xs" /></td>
                          <td className="px-2 py-1"><Input value={editData.department} onChange={e => setEditData(d => ({ ...d, department: e.target.value }))} className="h-7 text-xs" /></td>
                          <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{actual.lineType === "revenue" ? "Доход" : "Расход"}</Badge></td>
                          <td className="px-2 py-1"><Input type="number" value={editData.actualAmount} onChange={e => setEditData(d => ({ ...d, actualAmount: Number(e.target.value) }))} className="h-7 text-xs text-right" /></td>
                          <td className="px-2 py-1"><Input value={editData.expenseDate} onChange={e => setEditData(d => ({ ...d, expenseDate: e.target.value }))} className="h-7 text-xs" placeholder="YYYY-MM-DD" /></td>
                          <td className="px-2 py-1"><Input value={editData.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} className="h-7 text-xs" /></td>
                          <td className="px-2 py-1 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => saveEdit(actual.id)}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditId(null)}>✕</Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2">{actual.category}</td>
                          <td className="px-4 py-2 text-muted-foreground">{actual.department || "—"}</td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className="text-xs">
                              {actual.lineType === "revenue" ? "Доход" : "Расход"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">{fmt(actual.actualAmount)}</td>
                          <td className="px-4 py-2 text-muted-foreground">{actual.expenseDate || "—"}</td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">{actual.description || "—"}</td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => startEdit(actual)}
                                className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => deleteActual.mutate({ id: actual.id, planId })}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/30">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 font-medium text-sm">Итого</td>
                    <td className="px-4 py-2 text-right font-bold font-mono">{fmt(total)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────

function PlansTab({ activePlanId, onSelect, onShowCreate }: { activePlanId: string; onSelect: (id: string) => void; onShowCreate: () => void }) {
  const { data: plans = [], isLoading } = useBudgetPlans()
  const updatePlan = useUpdateBudgetPlan()
  const deletePlan = useDeleteBudgetPlan()

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={onShowCreate}><Plus className="h-4 w-4 mr-1" /> Новый план</Button>
      </div>
      {plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Нет планов</p>
          <p className="text-sm mt-1">Создайте первый бюджетный план</p>
          <Button className="mt-4" onClick={onShowCreate}><Plus className="h-4 w-4 mr-1" /> Создать план</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Card key={plan.id} className={`transition-all ${activePlanId === plan.id ? "ring-2 ring-purple-500" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{plan.name}</CardTitle>
                  {statusBadge(plan.status)}
                </div>
                <p className="text-sm text-muted-foreground">{periodLabel(plan)}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant={activePlanId === plan.id ? "default" : "outline"}
                    onClick={() => onSelect(plan.id)} className="flex-1 text-xs">
                    {activePlanId === plan.id ? "Активный" : "Выбрать"}
                  </Button>
                  {plan.status === "draft" && (
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => {
                        if (confirm("Утвердить бюджет? После утверждения изменения будут запрещены.")) {
                          updatePlan.mutate({ id: plan.id, status: "approved" })
                        }
                      }}>
                      Утвердить
                    </Button>
                  )}
                  <button onClick={() => deletePlan.mutate(plan.id)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 border border-border">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Comparison Tab ────────────────────────────────────────────────────────────

const COMPARISON_COLORS = ["#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444"]

function ComparisonTab() {
  const { data: plans = [], isLoading } = useBudgetPlans()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [materialityPct, setMaterialityPct] = useState(5)
  const [materialityAbs, setMaterialityAbs] = useState(500)
  const [showAll, setShowAll] = useState(true)

  // Load analytics for each selected plan
  const a0 = useBudgetAnalytics(selectedIds[0] || "")
  const a1 = useBudgetAnalytics(selectedIds[1] || "")
  const a2 = useBudgetAnalytics(selectedIds[2] || "")
  const a3 = useBudgetAnalytics(selectedIds[3] || "")
  const analyticsArr = [a0.data, a1.data, a2.data, a3.data].filter(Boolean).slice(0, selectedIds.length)

  const togglePlan = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : prev.length < 4 ? [...prev, id] : prev
    )
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>

  if (plans.length < 2) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Недостаточно данных</p>
        <p className="text-sm mt-1">Создайте минимум 2 плана для сравнения</p>
      </div>
    )
  }

  // Build chart data from all selected plans' byCategory
  const allCategories = new Set<string>()
  for (const a of analyticsArr) {
    if (a?.byCategory) a.byCategory.forEach((c: any) => allCategories.add(c.category))
  }
  const topCategories = Array.from(allCategories).slice(0, 10)

  const chartData = topCategories.map(cat => {
    const row: any = { category: cat }
    analyticsArr.forEach((a, i) => {
      const planName = plans.find(p => p.id === selectedIds[i])?.name || `План ${i + 1}`
      const found = a?.byCategory?.find((c: any) => c.category === cat)
      row[planName] = found?.actual ?? 0
    })
    return row
  })

  // Variance table rows
  const tableCategories = topCategories.map(cat => {
    const row: any = { category: cat }
    analyticsArr.forEach((a, i) => {
      const found = a?.byCategory?.find((c: any) => c.category === cat)
      row[`p${i}_planned`] = found?.planned ?? 0
      row[`p${i}_actual`] = found?.actual ?? 0
      row[`p${i}_variance`] = found?.variance ?? 0
      row[`p${i}_pct`] = found?.variancePct ?? 0
    })
    return row
  })

  // Materiality filter
  const isMaterial = (row: any) => {
    if (showAll) return true
    for (let i = 0; i < analyticsArr.length; i++) {
      if (Math.abs(row[`p${i}_pct`] ?? 0) >= materialityPct || Math.abs(row[`p${i}_variance`] ?? 0) >= materialityAbs) return true
    }
    return false
  }

  return (
    <div className="space-y-6">
      {/* Plan selector */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Выберите планы для сравнения (до 4)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {plans.map(p => (
              <Button key={p.id} size="sm"
                variant={selectedIds.includes(p.id) ? "default" : "outline"}
                className={`text-xs ${selectedIds.includes(p.id) ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                onClick={() => togglePlan(p.id)}>
                {p.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedIds.length >= 2 && analyticsArr.length >= 2 && (
        <>
          {/* P4-02: Grouped bar chart */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Сравнение по категориям (факт)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v / 1000).toFixed(0) + "k"} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  {selectedIds.map((id, i) => {
                    const planName = plans.find(p => p.id === id)?.name || `План ${i + 1}`
                    return <Bar key={id} dataKey={planName} fill={COMPARISON_COLORS[i]} radius={[3, 3, 0, 0]} />
                  })}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* P4-04: Materiality filter */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">Порог существенности:</span>
            <div className="flex items-center gap-1">
              <Input type="number" value={materialityPct} onChange={e => setMaterialityPct(Number(e.target.value))} className="h-7 w-16 text-xs text-right" /> %
            </div>
            <div className="flex items-center gap-1">
              <Input type="number" value={materialityAbs} onChange={e => setMaterialityAbs(Number(e.target.value))} className="h-7 w-20 text-xs text-right" /> ₼
            </div>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Скрыть несущественные" : "Показать все"}
            </Button>
          </div>

          {/* P4-03: Variance table */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Таблица сравнения</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium sticky left-0 bg-muted/50">Категория</th>
                      {selectedIds.map((id, i) => {
                        const name = plans.find(p => p.id === id)?.name || `П${i + 1}`
                        return [
                          <th key={`${id}-p`} className="px-2 py-2 text-right font-medium" style={{ color: COMPARISON_COLORS[i] }}>{name} Бюджет</th>,
                          <th key={`${id}-a`} className="px-2 py-2 text-right font-medium" style={{ color: COMPARISON_COLORS[i] }}>{name} Факт</th>,
                          <th key={`${id}-v`} className="px-2 py-2 text-right font-medium" style={{ color: COMPARISON_COLORS[i] }}>Откл. %</th>,
                        ]
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {tableCategories.filter(isMaterial).map(row => (
                      <tr key={row.category} className="border-t border-border/50">
                        <td className="px-3 py-1.5 font-medium sticky left-0 bg-background">{row.category}</td>
                        {selectedIds.map((_id, i) => [
                          <td key={`${row.category}-p${i}-p`} className="px-2 py-1.5 text-right font-mono">{fmt(row[`p${i}_planned`])}</td>,
                          <td key={`${row.category}-p${i}-a`} className="px-2 py-1.5 text-right font-mono">{fmt(row[`p${i}_actual`])}</td>,
                          <td key={`${row.category}-p${i}-v`} className={`px-2 py-1.5 text-right font-mono font-bold ${(row[`p${i}_variance`] ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {(row[`p${i}_pct`] ?? 0).toFixed(1)}%
                          </td>,
                        ])}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/30">
                    <tr>
                      <td className="px-3 py-2 font-bold sticky left-0 bg-muted/30">ИТОГО</td>
                      {selectedIds.map((_id, i) => {
                        const a = analyticsArr[i]
                        return [
                          <td key={`total-p${i}-p`} className="px-2 py-2 text-right font-mono font-bold">{fmt(a?.totalPlanned ?? 0)}</td>,
                          <td key={`total-p${i}-a`} className="px-2 py-2 text-right font-mono font-bold">{fmt(a?.totalActual ?? 0)}</td>,
                          <td key={`total-p${i}-v`} className={`px-2 py-2 text-right font-mono font-bold ${(a?.totalVariance ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {a?.totalPlanned ? ((a.totalVariance / a.totalPlanned) * 100).toFixed(1) : "0.0"}%
                          </td>,
                        ]
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedIds.length < 2 && selectedIds.length > 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">Выберите ещё хотя бы 1 план</div>
      )}
    </div>
  )
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────

function PLTab({ planId }: { planId: string }) {
  const { data: analytics, isLoading: analyticsLoading } = useBudgetAnalytics(planId)
  const { data: sections = [], isLoading: sectionsLoading } = useBudgetSections(planId)
  const createSection = useCreateBudgetSection()
  const deleteSection = useDeleteBudgetSection()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionType, setNewSectionType] = useState("expense")
  const [drilldown, setDrilldown] = useState<string | null>(null)

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (analyticsLoading || sectionsLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  }

  const byCategory = analytics?.byCategory ?? []

  // Group categories by section
  const revRows = byCategory.filter(c => c.lineType === "revenue")
  const expRows = byCategory.filter(c => c.lineType === "expense")

  const totalRevenuePlanned = revRows.reduce((s, r) => s + r.planned, 0)
  const totalRevenueActual = revRows.reduce((s, r) => s + r.actual, 0)
  const totalExpensePlanned = expRows.reduce((s, r) => s + r.planned, 0)
  const totalExpenseActual = expRows.reduce((s, r) => s + r.actual, 0)
  const grossProfitPlanned = totalRevenuePlanned - totalExpensePlanned
  const grossProfitActual = totalRevenueActual - totalExpenseActual

  const renderSection = (title: string, rows: typeof byCategory, sectionId: string, isCalculated = false, calcPlanned = 0, calcActual = 0) => {
    const isCollapsed = collapsed.has(sectionId)
    return (
      <div key={sectionId} className="border border-border rounded-lg overflow-hidden mb-3">
        <div
          className={`flex items-center justify-between px-4 py-3 cursor-pointer ${isCalculated ? "bg-blue-50 dark:bg-blue-950/30" : "bg-muted/40"}`}
          onClick={() => toggleCollapse(sectionId)}
        >
          <div className="flex items-center gap-2 font-medium text-sm">
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {title}
          </div>
          <div className="flex gap-8 text-sm font-mono">
            <span className="text-muted-foreground">{fmt(isCalculated ? calcPlanned : rows.reduce((s, r) => s + r.planned, 0))}</span>
            <span className={`font-medium ${(isCalculated ? calcActual : rows.reduce((s, r) => s + r.actual, 0)) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
              {fmt(isCalculated ? calcActual : rows.reduce((s, r) => s + r.actual, 0))}
            </span>
          </div>
        </div>
        {!isCollapsed && !isCalculated && (
          <table className="w-full text-sm">
            <thead className="bg-muted/20 border-t border-border">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">Категория</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">Бюджет</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium text-purple-600 dark:text-purple-400">Прогноз</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium text-green-600 dark:text-green-400">Факт</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">Откл.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => setDrilldown(drilldown === row.category ? null : row.category)}>
                  <td className="px-4 py-2 flex items-center gap-1">
                    {drilldown === row.category && <span className="text-blue-500">▶</span>}
                    {row.category}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{fmt(row.planned)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-purple-600 dark:text-purple-400">{fmt(row.forecast)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-green-600 dark:text-green-400">{fmt(row.actual)}</td>
                  <td className={`px-4 py-2 text-right font-mono text-xs font-medium ${row.variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                    {row.variance >= 0 ? "+" : ""}{fmt(row.variance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">P&amp;L Структура</h2>
        <Button size="sm" variant="outline" onClick={() => setShowAddSection(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Добавить секцию
        </Button>
      </div>

      {showAddSection && (
        <Card className="p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block">Название секции</label>
              <Input value={newSectionName} onChange={e => setNewSectionName(e.target.value)} placeholder="Например: Операционные расходы" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Тип</label>
              <select value={newSectionType} onChange={e => setNewSectionType(e.target.value)}
                className="border border-border rounded-md px-3 py-2 text-sm bg-background">
                {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <Button size="sm" onClick={async () => {
              if (!newSectionName) return
              await createSection.mutateAsync({ planId, name: newSectionName, sectionType: newSectionType })
              setNewSectionName("")
              setShowAddSection(false)
            }} disabled={createSection.isPending}>
              {createSection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать"}
            </Button>
          </div>
        </Card>
      )}

      {/* Auto-generated P&L sections */}
      {renderSection("Выручка", revRows, "auto-revenue")}
      {renderSection("Расходы", expRows, "auto-expense")}
      {renderSection("Валовая прибыль", [], "auto-gross-profit", true, grossProfitPlanned, grossProfitActual)}

      {/* Custom sections */}
      {sections.map(sec => (
        <div key={sec.id} className="border border-border rounded-lg overflow-hidden mb-3">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
            <span className="font-medium text-sm">{sec.name}</span>
            <button onClick={() => deleteSection.mutate({ id: sec.id, planId })}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Drill-down panel */}
      {drilldown && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-blue-700 dark:text-blue-300">Детализация: {drilldown}</CardTitle>
              <button onClick={() => setDrilldown(null)} className="text-muted-foreground hover:text-foreground text-xs">✕ Закрыть</button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const row = byCategory.find(r => r.category === drilldown)
              if (!row) return <p className="text-sm text-muted-foreground">Нет данных</p>
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground">Бюджет</p><p className="font-bold font-mono">{fmt(row.planned)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Прогноз</p><p className="font-bold font-mono text-purple-600 dark:text-purple-400">{fmt(row.forecast)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Факт</p><p className="font-bold font-mono text-green-600 dark:text-green-400">{fmt(row.actual)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Отклонение</p>
                    <p className={`font-bold font-mono ${row.variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {row.variance >= 0 ? "+" : ""}{fmt(row.variance)} ({Math.round(row.variancePct)}%)
                    </p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Forecast Tab ─────────────────────────────────────────────────────────────

function ForecastTab({ planId }: { planId: string }) {
  const { data: analytics } = useBudgetAnalytics(planId)
  const { data: forecastEntries = [] } = useBudgetForecastEntries(planId)
  const { data: budgetLines = [] } = useBudgetLines(planId)
  const upsertForecast = useUpsertBudgetForecast()
  const plan = analytics?.plan

  const [scenario, setScenario] = useState<"base" | "optimistic" | "pessimistic">("base")
  const [editMonth, setEditMonth] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const [generating, setGenerating] = useState(false)
  const [showCategories, setShowCategories] = useState(false)

  const currentMonth = new Date().getMonth() + 1
  const year = plan?.year ?? new Date().getFullYear()
  const totalPlanned = analytics?.totalPlanned ?? 0
  const totalForecast = analytics?.totalForecast ?? 0
  const totalActual = analytics?.totalActual ?? 0
  const yearEndProjection = analytics?.yearEndProjection ?? 0

  // P3-01: Build overrides map from DB entries (aggregated by month)
  const overridesMap = useMemo(() => {
    if (forecastEntries.length === 0) return undefined
    const m = new Map<number, number>()
    for (const e of forecastEntries) {
      m.set(e.month, (m.get(e.month) ?? 0) + e.forecastAmount)
    }
    return m
  }, [forecastEntries])

  const rawMonthlyData = buildMonthlyForecast(year, totalPlanned, totalActual, currentMonth, undefined, undefined, overridesMap)

  // P3-05: Apply scenario
  const monthlyData = applyScenario(rawMonthlyData, scenario)

  const chartData = monthlyData.map(d => ({
    name: d.label,
    "Бюджет": d.planned,
    "Прогноз": d.forecast,
    "Факт": d.actual || undefined,
  }))

  // P3-02: Generate forecast entries for all categories
  const handleGenerate = async () => {
    if (budgetLines.length === 0) return
    setGenerating(true)
    try {
      const categories = budgetLines.map((l: BudgetLine) => ({
        category: l.category,
        plannedAmount: l.plannedAmount,
        lineType: l.lineType,
      }))
      const entries = buildCategoryForecast(categories, year, totalActual, currentMonth)
      await upsertForecast.mutateAsync(entries.map(e => ({ ...e, planId })))
    } finally {
      setGenerating(false)
    }
  }

  // P3-03: Save inline forecast edit
  const saveEdit = async (month: number) => {
    const val = Number(editValue)
    if (isNaN(val) || val < 0) return
    await upsertForecast.mutateAsync([{ planId, month, year, category: "__total__", forecastAmount: val }])
    setEditMonth(null)
    setEditValue("")
  }

  // P3-04: Category forecast matrix data
  const categoryMatrix = useMemo(() => {
    if (!showCategories) return []
    const catMap = new Map<string, Map<number, number>>()
    for (const e of forecastEntries) {
      if (e.category === "__total__") continue
      if (!catMap.has(e.category)) catMap.set(e.category, new Map())
      catMap.get(e.category)!.set(e.month, (catMap.get(e.category)!.get(e.month) ?? 0) + e.forecastAmount)
    }
    // If no entries, use even distribution from budget lines
    if (catMap.size === 0) {
      for (const l of budgetLines) {
        if (!catMap.has(l.category)) catMap.set(l.category, new Map())
        for (let m = 1; m <= 12; m++) {
          catMap.get(l.category)!.set(m, l.plannedAmount / 12)
        }
      }
    }
    return Array.from(catMap.entries()).map(([cat, months]) => ({ category: cat, months }))
  }, [forecastEntries, budgetLines, showCategories])

  if (!analytics) return (
    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  )

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <ColorStatCard label="БЮДЖЕТ (ГОД)" value={fmt(totalPlanned)} icon={<BarChart2 className="h-5 w-5" />} color="blue" />
        <ColorStatCard label="ПРОГНОЗ (ГОД)" value={fmt(totalForecast)} icon={<TrendingUp className="h-5 w-5" />} color="violet" />
        <ColorStatCard
          label="ПРОЕКЦИЯ НА КОН. ПЕРИОДА"
          value={fmt(yearEndProjection)}
          icon={<CalendarRange className="h-5 w-5" />}
          color={yearEndProjection <= totalPlanned ? "green" : "red"}
        />
      </div>

      {/* Controls: Scenario toggle + Generate button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(["base", "optimistic", "pessimistic"] as const).map(s => (
            <button key={s} onClick={() => setScenario(s)}
              className={`px-3 py-1.5 transition-colors ${scenario === s ? "bg-purple-600 text-white" : "hover:bg-muted"}`}>
              {s === "base" ? "Базовый" : s === "optimistic" ? "Оптимист." : "Пессимист."}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating || budgetLines.length === 0}>
          {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-1" />}
          Сгенерировать прогноз
        </Button>
        {forecastEntries.length > 0 && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 text-xs">
            {forecastEntries.length} записей в БД
          </Badge>
        )}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">12-месячный прогноз {scenario !== "base" && `(${scenario === "optimistic" ? "оптимист." : "пессимист."})`}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ left: 10, right: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Legend />
              <Bar dataKey="Факт" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Area dataKey="Прогноз" fill="#8b5cf640" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" type="monotone" />
              <Bar dataKey="Бюджет" fill="#ef444440" stroke="#ef4444" strokeWidth={1} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly table with inline edit */}
      <Card>
        <CardHeader><CardTitle className="text-sm">По месяцам</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Месяц</th>
                  <th className="px-4 py-2 text-right font-medium">Бюджет</th>
                  <th className="px-4 py-2 text-right font-medium text-purple-600 dark:text-purple-400">Прогноз</th>
                  <th className="px-4 py-2 text-right font-medium text-green-600 dark:text-green-400">Факт</th>
                  <th className="px-4 py-2 text-center font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(d => (
                  <tr key={d.month} className={`border-t border-border/50 ${d.isProjected ? "opacity-70" : ""}`}>
                    <td className="px-4 py-2 font-medium">{d.label} {d.year}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(d.planned)}</td>
                    <td className="px-4 py-2 text-right font-mono text-purple-600 dark:text-purple-400">
                      {editMonth === d.month ? (
                        <Input type="number" className="h-7 w-28 text-right text-xs inline-block ml-auto"
                          value={editValue} autoFocus
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(d.month)}
                          onKeyDown={e => e.key === "Enter" && saveEdit(d.month)} />
                      ) : (
                        <span className={`cursor-pointer hover:underline ${d.isOverride ? "font-bold" : ""}`}
                          onClick={() => { if (!d.isProjected || d.isOverride || true) { setEditMonth(d.month); setEditValue(String(d.forecast)) } }}>
                          {fmt(d.forecast)} {d.isOverride && <Pencil className="h-3 w-3 inline ml-1 opacity-50" />}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-green-600 dark:text-green-400">{d.isProjected ? "—" : fmt(d.actual)}</td>
                    <td className="px-4 py-2 text-center">
                      {d.isProjected
                        ? <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs">Прогноз</Badge>
                        : <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Факт</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* P3-04: Category forecast matrix */}
      <Card>
        <CardHeader>
          <button className="flex items-center gap-2 text-sm font-medium"
            onClick={() => setShowCategories(!showCategories)}>
            {showCategories ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            По категориям (матрица)
          </button>
        </CardHeader>
        {showCategories && (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium sticky left-0 bg-muted/50 min-w-[180px]">Категория</th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i} className="px-2 py-2 text-right font-medium min-w-[80px]">
                        {["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"][i]}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium min-w-[100px]">Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryMatrix.map(({ category, months }) => {
                    const total = Array.from(months.values()).reduce((s, v) => s + v, 0)
                    return (
                      <tr key={category} className="border-t border-border/50">
                        <td className="px-3 py-1.5 font-medium sticky left-0 bg-background truncate max-w-[180px]">{category}</td>
                        {Array.from({ length: 12 }, (_, i) => (
                          <td key={i} className="px-2 py-1.5 text-right font-mono">{fmt(months.get(i + 1) ?? 0)}</td>
                        ))}
                        <td className="px-3 py-1.5 text-right font-mono font-bold">{fmt(total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {categoryMatrix.length === 0 && (
              <p className="text-center text-muted-foreground py-6 text-sm">Нажмите «Сгенерировать прогноз» чтобы заполнить матрицу</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

// ─── Template Seeder ──────────────────────────────────────────────────────────

function TemplateSeedButton({ planId }: { planId: string }) {
  const createLine = useCreateBudgetLine()
  const { data: lines = [] } = useBudgetLines(planId)
  const [seeding, setSeeding] = useState(false)

  if (lines.length > 0) return null

  const seed = async () => {
    setSeeding(true)
    const expenseLines = DEFAULT_EXPENSE_CATEGORIES.map((category, i) => ({
      planId,
      category,
      lineType: "expense" as const,
      plannedAmount: 0,
      sortOrder: i,
      costModelKey: TEMPLATE_CATEGORY_MAP[category] || undefined,
      isAutoActual: !!TEMPLATE_CATEGORY_MAP[category],
    }))
    const revenueLines = DEFAULT_REVENUE_CATEGORIES.map((category, i) => ({
      planId,
      category,
      lineType: "revenue" as const,
      plannedAmount: 0,
      sortOrder: i + 100,
      costModelKey: TEMPLATE_CATEGORY_MAP[category] || undefined,
      isAutoActual: !!TEMPLATE_CATEGORY_MAP[category],
    }))
    for (const line of [...expenseLines, ...revenueLines]) {
      await createLine.mutateAsync(line)
    }
    setSeeding(false)
  }

  return (
    <button onClick={seed} disabled={seeding}
      className="ml-2 text-xs text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:no-underline disabled:opacity-50">
      {seeding ? "Заполняю…" : "Заполнить шаблоном"}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BudgetingPage() {
  const { data: plans = [], isLoading: plansLoading } = useBudgetPlans()
  const [activePlanId, setActivePlanId] = useState<string>("")
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Auto-select first plan
  const resolvedPlanId = activePlanId || (plans[0]?.id ?? "")

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 text-white">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Бюджетирование</h1>
            <p className="text-sm text-muted-foreground">Планирование, прогноз и контроль бюджета</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {plansLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
          ) : plans.length > 0 ? (
            <select value={resolvedPlanId} onChange={e => { setActivePlanId(e.target.value); setActiveTab("overview") }}
              className="border border-border rounded-md px-3 py-1.5 text-sm bg-background min-w-[180px]">
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {periodLabel(p)}</option>
              ))}
            </select>
          ) : null}
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Создать план
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!plansLoading && plans.length === 0 && (
        <div className="text-center py-24 text-muted-foreground">
          <PiggyBank className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Нет бюджетных планов</p>
          <p className="text-sm mt-2">Создайте первый план для начала работы</p>
          <Button className="mt-6" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Создать план
          </Button>
        </div>
      )}

      {/* Main content */}
      {resolvedPlanId && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Активный план:</span>
            <span className="font-medium text-foreground">{plans.find(p => p.id === resolvedPlanId)?.name}</span>
            {statusBadge(plans.find(p => p.id === resolvedPlanId)?.status || "draft")}
            <TemplateSeedButton planId={resolvedPlanId} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="pl">P&amp;L</TabsTrigger>
              <TabsTrigger value="forecast">Прогноз</TabsTrigger>
              <TabsTrigger value="lines">Статьи</TabsTrigger>
              <TabsTrigger value="actuals">Факт</TabsTrigger>
              <TabsTrigger value="plans">Планы</TabsTrigger>
              <TabsTrigger value="comparison">Сравнение</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab planId={resolvedPlanId} />
            </TabsContent>
            <TabsContent value="pl">
              <PLTab planId={resolvedPlanId} />
            </TabsContent>
            <TabsContent value="forecast">
              <ForecastTab planId={resolvedPlanId} />
            </TabsContent>
            <TabsContent value="lines">
              <LinesTab planId={resolvedPlanId} />
            </TabsContent>
            <TabsContent value="actuals">
              <ActualsTab planId={resolvedPlanId} />
            </TabsContent>
            <TabsContent value="plans">
              <PlansTab activePlanId={resolvedPlanId} onSelect={id => { setActivePlanId(id); setActiveTab("overview") }} onShowCreate={() => setShowCreate(true)} />
            </TabsContent>
            <TabsContent value="comparison">
              <ComparisonTab />
            </TabsContent>
          </Tabs>
        </>
      )}

      {showCreate && <CreatePlanDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
