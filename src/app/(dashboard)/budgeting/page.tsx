"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
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

function statusBadge(status: string, t: (key: string) => string) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t("statusApproved")}</Badge>
  if (status === "closed") return <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{t("statusClosed")}</Badge>
  return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{t("statusDraft")}</Badge>
}

function periodLabel(plan: any, t: (key: string) => string): string {
  if (plan.periodType === "monthly" && plan.month) {
    const months = t("monthsShort").split(",")
    return `${months[plan.month - 1]} ${plan.year}`
  }
  if (plan.periodType === "quarterly" && plan.quarter) return `Q${plan.quarter} ${plan.year}`
  return `${plan.year}`
}

// ─── Create Plan Dialog ───────────────────────────────────────────────────────

function CreatePlanDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("budgeting")
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
          <CardTitle>{t("dlgCreateTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("dlgName")}</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("dlgNamePlaceholder")} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("dlgPeriodType")}</label>
              <select value={periodType} onChange={e => setPeriodType(e.target.value as any)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                <option value="monthly">{t("periodMonthly")}</option>
                <option value="quarterly">{t("periodQuarterly")}</option>
                <option value="annual">{t("periodAnnual")}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("dlgYear")}</label>
              <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} min={2020} max={2030} required />
            </div>
            {periodType === "monthly" && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t("dlgMonth")}</label>
                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                  {t("monthsFull").split(",").map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            )}
            {periodType === "quarterly" && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t("dlgQuarter")}</label>
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
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("btnCreate")}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">{t("btnCancel")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Add Line Form ─────────────────────────────────────────────────────────────

function AddLineForm({ planId, existingCategories }: { planId: string; existingCategories: string[] }) {
  const t = useTranslations("budgeting")
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
      <Plus className="h-4 w-4 mr-1" /> {t("btnAddLine")}
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
            <label className="text-xs font-medium mb-1 block">{t("fieldCategory")}</label>
            <Input list="categories-list" value={category} onChange={e => setCategory(e.target.value)}
              placeholder={t("placeholderCategory")} required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldDepartment")}</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">{t("optAll")}</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="__custom__">{t("optOther")}</option>
            </select>
            {department === "__custom__" && (
              <Input className="mt-1" value={customDept} onChange={e => setCustomDept(e.target.value)}
                placeholder={t("placeholderDepartment")} />
            )}
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldType")}</label>
            <select value={lineType} onChange={e => setLineType(e.target.value as any)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="expense">{t("expense")}</option>
              <option value="revenue">{t("revenue")}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldPlannedAmount")} (₼)</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={0} step={0.01} required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldForecastAmount")} (₼)</label>
            <Input type="number" value={forecastAmount} onChange={e => setForecastAmount(e.target.value)} min={0} step={0.01} placeholder={t("placeholderForecast")} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium mb-1 block flex items-center gap-1">
              <Link2 className="h-3 w-3" /> {t("fieldCostModelKey")}
            </label>
            <select value={costModelKey} onChange={e => setCostModelKey(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">{t("optManualActual")}</option>
              {COST_MODEL_KEY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>[{o.group}] {o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldNotes")}</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("placeholderNotes")} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={create.isPending} size="sm">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("btnAdd")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShow(false)}>{t("btnCancel")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Add Actual Form ───────────────────────────────────────────────────────────

function AddActualForm({ planId, existingCategories }: { planId: string; existingCategories: string[] }) {
  const t = useTranslations("budgeting")
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
      <Plus className="h-4 w-4 mr-1" /> {t("btnAddActual")}
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
            <label className="text-xs font-medium mb-1 block">{t("fieldCategory")}</label>
            <Input list="actuals-categories-list" value={category} onChange={e => setCategory(e.target.value)}
              placeholder={t("placeholderCategory")} required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldDepartment")}</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">{t("optAll")}</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="__custom__">{t("optOther")}</option>
            </select>
            {department === "__custom__" && (
              <Input className="mt-1" value={customDept} onChange={e => setCustomDept(e.target.value)}
                placeholder={t("placeholderDepartment")} />
            )}
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldType")}</label>
            <select value={lineType} onChange={e => setLineType(e.target.value as any)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="expense">{t("expense")}</option>
              <option value="revenue">{t("revenue")}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldActualAmount")} (₼)</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={0} step={0.01} required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldDate")}</label>
            <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldDescription")}</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={t("placeholderDescription")} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={create.isPending} size="sm">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("btnAdd")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShow(false)}>{t("btnCancel")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Workspace Tab (G-01 through G-09) ───────────────────────────────────────

function WorkspaceTab({ planId }: { planId: string }) {
  const t = useTranslations("budgeting")
  const { data: analytics, isLoading: analyticsLoading } = useBudgetAnalytics(planId)
  const { data: lines = [], isLoading: linesLoading } = useBudgetLines(planId)
  const { data: actuals = [] } = useBudgetActuals(planId)
  const updateLine = useUpdateBudgetLine()
  const createLine = useCreateBudgetLine()
  const deleteLine = useDeleteBudgetLine()
  const createActual = useCreateBudgetActual()
  const deleteActual = useDeleteBudgetActual()
  const aiNarrative = useAINarrative()
  const syncActuals = useSyncActuals()

  // Edit state
  const [editCell, setEditCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [expandId, setExpandId] = useState<string | null>(null)
  const [addingRow, setAddingRow] = useState(false)
  const [newRow, setNewRow] = useState({ category: "", lineType: "expense", plannedAmount: "", forecastAmount: "" })
  const [filterText, setFilterText] = useState("")
  const [filterType, setFilterType] = useState<"all" | "expense" | "revenue">("all")
  const [narrative, setNarrative] = useState<string | null>(null)
  const [showNarrative, setShowNarrative] = useState(false)

  // New actual form for expand
  const [newActual, setNewActual] = useState({ amount: "", description: "", date: "" })

  // Build actuals by category map
  const actualsByCat = useMemo(() => {
    const m = new Map<string, { total: number; items: typeof actuals }>()
    for (const a of actuals) {
      const key = a.category
      const existing = m.get(key) ?? { total: 0, items: [] }
      existing.total += a.actualAmount
      existing.items.push(a)
      m.set(key, existing)
    }
    return m
  }, [actuals])

  // Auto-actual values from analytics
  const autoActualMap = useMemo(() => {
    const m = new Map<string, number>()
    if (analytics?.byCategory) {
      for (const c of analytics.byCategory) {
        // If the line has auto-actual, the analytics already resolved it
        m.set(c.category, c.actual)
      }
    }
    return m
  }, [analytics])

  // Filter and group lines
  const filteredLines = useMemo(() => {
    let result = [...lines]
    if (filterText) result = result.filter((l: BudgetLine) => l.category.toLowerCase().includes(filterText.toLowerCase()))
    if (filterType !== "all") result = result.filter((l: BudgetLine) => l.lineType === filterType)
    return result
  }, [lines, filterText, filterType])

  const expenseLines = filteredLines.filter((l: BudgetLine) => l.lineType === "expense")
  const revenueLines = filteredLines.filter((l: BudgetLine) => l.lineType === "revenue")

  // Totals
  const totExpPlanned = expenseLines.reduce((s: number, l: BudgetLine) => s + l.plannedAmount, 0)
  const totExpForecast = expenseLines.reduce((s: number, l: BudgetLine) => s + (l.forecastAmount ?? l.plannedAmount), 0)
  const totRevPlanned = revenueLines.reduce((s: number, l: BudgetLine) => s + l.plannedAmount, 0)
  const totRevForecast = revenueLines.reduce((s: number, l: BudgetLine) => s + (l.forecastAmount ?? l.plannedAmount), 0)

  const { totalPlanned = 0, totalForecast = 0, totalActual = 0, totalVariance = 0, executionPct = 0, autoActualTotal = 0, yearEndProjection = 0, byCategory = [] } = analytics ?? {}

  // Inline edit handlers
  const startEdit = (id: string, field: string, currentVal: number) => {
    setEditCell({ id, field })
    setEditValue(String(currentVal))
  }

  const saveEdit = async () => {
    if (!editCell) return
    const val = Number(editValue)
    if (isNaN(val) || val < 0) { setEditCell(null); return }
    const { id, field } = editCell
    if (field === "plannedAmount" || field === "forecastAmount") {
      const line = lines.find((l: BudgetLine) => l.id === id)
      if (line) await updateLine.mutateAsync({ id, planId, [field]: val })
    }
    setEditCell(null)
  }

  // Add new row
  const handleAddRow = async () => {
    if (!newRow.category.trim()) return
    await createLine.mutateAsync({
      planId,
      category: newRow.category,
      lineType: newRow.lineType as "expense" | "revenue",
      plannedAmount: Number(newRow.plannedAmount) || 0,
      forecastAmount: Number(newRow.forecastAmount) || undefined,
    })
    setNewRow({ category: "", lineType: "expense", plannedAmount: "", forecastAmount: "" })
    setAddingRow(false)
  }

  // Add actual from expand
  const handleAddActual = async (category: string, lineType: string) => {
    if (!newActual.amount) return
    await createActual.mutateAsync({
      planId,
      category,
      lineType: lineType as "expense" | "revenue",
      actualAmount: Number(newActual.amount),
      description: newActual.description || undefined,
      expenseDate: newActual.date || undefined,
    })
    setNewActual({ amount: "", description: "", date: "" })
  }

  // AI narrative
  const handleAINarrative = async () => {
    setShowNarrative(true)
    try {
      const result = await aiNarrative.mutateAsync({ planId })
      setNarrative(result.narrative)
    } catch {
      setNarrative(t("errorAiGeneration"))
    }
  }

  // Sync actuals
  const handleSync = async () => {
    try {
      const result = await syncActuals.mutateAsync(planId)
      alert(t("msgSynced", { count: result.synced }))
    } catch { alert(t("errorSync")) }
  }

  if (analyticsLoading || linesLoading) return (
    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  )

  // Render one grid row
  const renderRow = (line: BudgetLine) => {
    const catActuals = actualsByCat.get(line.category)
    const factValue = line.isAutoActual ? (autoActualMap.get(line.category) ?? 0) : (catActuals?.total ?? 0)
    const variance = line.lineType === "revenue" ? factValue - line.plannedAmount : line.plannedAmount - factValue
    const variancePct = line.plannedAmount > 0 ? (variance / line.plannedAmount) * 100 : 0
    const isExpanded = expandId === line.id

    return (
      <tr key={line.id} className="border-t border-border/50 hover:bg-muted/30 group">
        {/* Category */}
        <td className="px-3 py-2 text-sm font-medium">{line.category}</td>
        {/* Department */}
        <td className="px-2 py-2 text-xs text-muted-foreground">{line.department || "—"}</td>
        {/* Plan - editable */}
        <td className="px-2 py-2 text-right">
          {editCell?.id === line.id && editCell?.field === "plannedAmount" ? (
            <Input type="number" className="h-7 w-24 text-right text-xs ml-auto" value={editValue} autoFocus
              onChange={e => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={e => e.key === "Enter" && saveEdit()} />
          ) : (
            <span className="font-mono text-sm cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 px-1 rounded"
              onClick={() => startEdit(line.id, "plannedAmount", line.plannedAmount)}>
              {fmt(line.plannedAmount)}
            </span>
          )}
        </td>
        {/* Forecast - editable */}
        <td className="px-2 py-2 text-right">
          {editCell?.id === line.id && editCell?.field === "forecastAmount" ? (
            <Input type="number" className="h-7 w-24 text-right text-xs ml-auto" value={editValue} autoFocus
              onChange={e => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={e => e.key === "Enter" && saveEdit()} />
          ) : (
            <span className="font-mono text-sm text-purple-600 dark:text-purple-400 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 px-1 rounded"
              onClick={() => startEdit(line.id, "forecastAmount", line.forecastAmount ?? line.plannedAmount)}>
              {fmt(line.forecastAmount ?? line.plannedAmount)}
            </span>
          )}
        </td>
        {/* Fact */}
        <td className="px-2 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            {line.isAutoActual ? (
              <span className="font-mono text-sm text-blue-600 dark:text-blue-400" title={t("badgeAutoTooltip")}>
                {fmt(factValue)}
                <Badge className="ml-1 text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 px-1">{t("badgeAuto")}</Badge>
              </span>
            ) : (
              <span className="font-mono text-sm text-green-600 dark:text-green-400 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 px-1 rounded"
                onClick={() => setExpandId(isExpanded ? null : line.id)}>
                {fmt(factValue)}
                <ChevronDown className={`h-3 w-3 inline ml-0.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </span>
            )}
          </div>
        </td>
        {/* Variance */}
        <td className={`px-2 py-2 text-right font-mono text-sm font-bold ${variance >= 0 ? "text-green-600" : "text-red-500"}`}>
          {variance >= 0 ? "+" : ""}{variancePct.toFixed(1)}%
        </td>
        {/* Actions */}
        <td className="px-2 py-2 text-center">
          <button onClick={() => { if (confirm(t("confirmDeleteLine") + " «" + line.category + "» " + t("confirmDeleteLineSuffix"))) deleteLine.mutate({ id: line.id, planId }) }}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
    )
  }

  // Render expand detail row for actuals
  const renderExpand = (line: BudgetLine) => {
    if (expandId !== line.id || line.isAutoActual) return null
    const items = actualsByCat.get(line.category)?.items ?? []
    return (
      <tr key={`expand-${line.id}`} className="bg-muted/20">
        <td colSpan={7} className="px-4 py-2">
          <div className="text-xs space-y-1">
            <div className="font-medium text-muted-foreground mb-1">{t("actualRecordsFor")} «{line.category}»:</div>
            {items.length === 0 && <div className="text-muted-foreground italic">{t("emptyNoRecords")}</div>}
            {items.map(a => (
              <div key={a.id} className="flex items-center gap-3 py-0.5">
                <span className="font-mono">{fmt(a.actualAmount)}</span>
                <span className="text-muted-foreground">{a.expenseDate || "—"}</span>
                <span className="text-muted-foreground flex-1">{a.description || ""}</span>
                <button onClick={() => deleteActual.mutate({ id: a.id, planId })}
                  className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <Input type="number" placeholder={t("colAmount")} className="h-6 w-20 text-xs" value={newActual.amount}
                onChange={e => setNewActual(d => ({ ...d, amount: e.target.value }))} />
              <Input placeholder={t("colDescription")} className="h-6 flex-1 text-xs" value={newActual.description}
                onChange={e => setNewActual(d => ({ ...d, description: e.target.value }))} />
              <Input type="date" className="h-6 w-32 text-xs" value={newActual.date}
                onChange={e => setNewActual(d => ({ ...d, date: e.target.value }))} />
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                onClick={() => handleAddActual(line.category, line.lineType)}>
                <Plus className="h-3 w-3 mr-1" /> {t("btnAdd")}
              </Button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  // Section renderer
  const renderSection = (title: string, sectionLines: BudgetLine[], totPlanned: number, totForecast: number) => {
    const totActual = sectionLines.reduce((s: number, l: BudgetLine) => {
      const fact = l.isAutoActual ? (autoActualMap.get(l.category) ?? 0) : (actualsByCat.get(l.category)?.total ?? 0)
      return s + fact
    }, 0)
    return (
      <>
        <tr className="bg-muted/40">
          <td colSpan={7} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</td>
        </tr>
        {sectionLines.map(l => [renderRow(l), renderExpand(l)])}
        <tr className="border-t-2 border-border bg-muted/30">
          <td className="px-3 py-1.5 font-bold text-xs" colSpan={2}>{t("totalLabel")} {title.toLowerCase()}</td>
          <td className="px-2 py-1.5 text-right font-mono text-xs font-bold">{fmt(totPlanned)}</td>
          <td className="px-2 py-1.5 text-right font-mono text-xs font-bold text-purple-600">{fmt(totForecast)}</td>
          <td className="px-2 py-1.5 text-right font-mono text-xs font-bold text-green-600">{fmt(totActual)}</td>
          <td className="px-2 py-1.5 text-right font-mono text-xs font-bold">
            {totPlanned > 0 ? `${(((totPlanned - totActual) / totPlanned) * 100).toFixed(1)}%` : "—"}
          </td>
          <td />
        </tr>
      </>
    )
  }

  const planLabel = t("colPlan")
  const actualLabel = t("colActual")
  const barData = byCategory.slice(0, 10).map((c: any) => ({
    name: c.category.length > 16 ? c.category.slice(0, 16) + "…" : c.category,
    [planLabel]: Math.round(c.planned),
    [actualLabel]: Math.round(c.actual),
  }))

  const pieData = byCategory
    .filter((c: any) => c.planned > 0)
    .sort((a: any, b: any) => b.planned - a.planned)
    .slice(0, 8)
    .map((c: any) => ({ name: c.category.length > 16 ? c.category.slice(0, 16) + "…" : c.category, value: Math.round(c.planned) }))

  const execEmoji = executionPct >= 90 ? "🟢" : executionPct >= 60 ? "🟡" : "🔴"

  const totExpActual = expenseLines.reduce((s: number, l: BudgetLine) => s + (l.isAutoActual ? (autoActualMap.get(l.category) ?? 0) : (actualsByCat.get(l.category)?.total ?? 0)), 0)
  const totRevActual = revenueLines.reduce((s: number, l: BudgetLine) => s + (l.isAutoActual ? (autoActualMap.get(l.category) ?? 0) : (actualsByCat.get(l.category)?.total ?? 0)), 0)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <ColorStatCard label={t("kpiPlan")} value={fmt(totalPlanned)} icon={<BarChart2 className="h-5 w-5" />} color="blue" />
        <ColorStatCard label={t("kpiForecast")} value={fmt(totalForecast)} icon={<TrendingUp className="h-5 w-5" />} color="violet" />
        <ColorStatCard label={autoActualTotal > 0 ? t("kpiActualAuto") : t("kpiActual")} value={fmt(totalActual)} icon={<DollarSign className="h-5 w-5" />} color="green" />
        <ColorStatCard label={t("kpiVariance")} value={(totalVariance >= 0 ? "+" : "") + fmt(totalVariance)} icon={totalVariance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />} color={totalVariance >= 0 ? "teal" : "red"} />
        <ColorStatCard label={t("kpiExecution")} value={`${execEmoji} ${Math.round(executionPct)}%`} icon={<CheckCircle className="h-5 w-5" />} color={executionPct >= 90 ? "green" : executionPct >= 60 ? "amber" : "red"} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleAINarrative} disabled={aiNarrative.isPending}>
          {aiNarrative.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <AlertCircle className="h-4 w-4 mr-1" />}
          {t("btnAiAnalysis")}
        </Button>
        {autoActualTotal > 0 && (
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncActuals.isPending}>
            {syncActuals.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
            {t("btnUpdateActual")}
          </Button>
        )}
        <a href={`/api/budgeting/export?planId=${planId}`} download>
          <Button size="sm" variant="outline"><DollarSign className="h-4 w-4 mr-1" /> {t("btnExport")}</Button>
        </a>
        <div className="flex-1" />
        <Input placeholder={t("searchCategory")} value={filterText} onChange={e => setFilterText(e.target.value)} className="h-8 w-48 text-xs" />
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="all">{t("filterAll")}</option>
          <option value="expense">{t("filterExpenses")}</option>
          <option value="revenue">{t("filterRevenues")}</option>
        </select>
      </div>

      {/* AI Narrative */}
      {showNarrative && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-purple-600" /> {t("aiAnalysisTitle")}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => { setShowNarrative(false); setNarrative(null) }}>✕</Button>
            </div>
          </CardHeader>
          <CardContent>
            {narrative ? <div className="text-sm whitespace-pre-wrap leading-relaxed">{narrative}</div>
              : <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("generating")}</div>}
          </CardContent>
        </Card>
      )}

      {/* === MAIN EDITABLE GRID === */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-xs">{t("colCategory")}</th>
                  <th className="px-2 py-2 text-left font-medium text-xs">{t("colDepartment")}</th>
                  <th className="px-2 py-2 text-right font-medium text-xs">{t("colPlan")} ₼</th>
                  <th className="px-2 py-2 text-right font-medium text-xs text-purple-600">{t("colForecast")} ₼</th>
                  <th className="px-2 py-2 text-right font-medium text-xs text-green-600">{t("colActual")} ₼</th>
                  <th className="px-2 py-2 text-right font-medium text-xs">{t("colVariancePct")}</th>
                  <th className="px-2 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {expenseLines.length > 0 && renderSection(t("sectionExpenses"), expenseLines, totExpPlanned, totExpForecast)}
                {revenueLines.length > 0 && renderSection(t("sectionRevenues"), revenueLines, totRevPlanned, totRevForecast)}

                {/* Margin row */}
                {(expenseLines.length > 0 || revenueLines.length > 0) && (
                  <tr className="border-t-2 border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10">
                    <td className="px-3 py-2 font-bold text-sm" colSpan={2}>{t("sectionMargin")}</td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold">{fmt(totRevPlanned - totExpPlanned)}</td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold text-purple-600">{fmt(totRevForecast - totExpForecast)}</td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold text-green-600">{fmt(totRevActual - totExpActual)}</td>
                    <td colSpan={2} />
                  </tr>
                )}

                {/* Add new row */}
                {addingRow ? (
                  <tr className="border-t border-border/50 bg-green-50 dark:bg-green-900/10">
                    <td className="px-2 py-1"><Input placeholder={t("placeholderCategoryShort")} className="h-7 text-xs" value={newRow.category} onChange={e => setNewRow(d => ({ ...d, category: e.target.value }))} autoFocus /></td>
                    <td className="px-2 py-1">
                      <select value={newRow.lineType} onChange={e => setNewRow(d => ({ ...d, lineType: e.target.value }))} className="h-7 rounded-md border border-input bg-background px-1 text-xs w-full">
                        <option value="expense">{t("expense")}</option>
                        <option value="revenue">{t("revenue")}</option>
                      </select>
                    </td>
                    <td className="px-2 py-1"><Input type="number" placeholder="0" className="h-7 text-xs text-right" value={newRow.plannedAmount} onChange={e => setNewRow(d => ({ ...d, plannedAmount: e.target.value }))} /></td>
                    <td className="px-2 py-1"><Input type="number" placeholder={t("placeholderForecastShort")} className="h-7 text-xs text-right" value={newRow.forecastAmount} onChange={e => setNewRow(d => ({ ...d, forecastAmount: e.target.value }))} /></td>
                    <td colSpan={2} className="px-2 py-1 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleAddRow}><CheckCircle className="h-3.5 w-3.5 mr-1" /> {t("btnSave")}</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingRow(false)}>{t("btnCancel")}</Button>
                      </div>
                    </td>
                    <td />
                  </tr>
                ) : (
                  <tr className="border-t border-dashed border-border/30">
                    <td colSpan={7} className="px-3 py-2">
                      <button onClick={() => setAddingRow(true)} className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                        <Plus className="h-3.5 w-3.5" /> {t("btnAddRow")}
                      </button>
                    </td>
                  </tr>
                )}

                {/* Empty state */}
                {lines.length === 0 && !addingRow && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      {t("emptyNoLines")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {barData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">{t("chartPlanVsActual")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v / 1000).toFixed(0) + "k"} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  <Bar dataKey={planLabel} fill="#ef4444" radius={[0, 3, 3, 0]} />
                  <Bar dataKey={actualLabel} fill="#10b981" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">{t("chartBudgetStructure")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {pieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ planId }: { planId: string }) {
  const t = useTranslations("budgeting")
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
    <div className="text-center py-20 text-muted-foreground">{t("errorLoading")}</div>
  )

  const { totalPlanned, totalForecast, totalActual, totalVariance, executionPct, yearEndProjection, byCategory, byDepartment, autoActualTotal } = analytics

  const execEmoji = executionPct >= 90 ? "🟢" : executionPct >= 60 ? "🟡" : "🔴"

  const handleAINarrative = async () => {
    setShowNarrative(true)
    try {
      const result = await aiNarrative.mutateAsync({ planId })
      setNarrative(result.narrative)
    } catch {
      setNarrative(t("errorAiGenerationNarrative"))
    }
  }

  const handleSyncActuals = async () => {
    try {
      const result = await syncActuals.mutateAsync(planId)
      alert(t("msgSyncedCostModel", { count: result.synced }))
    } catch {
      alert(t("errorSyncCostModel"))
    }
  }

  const ovPlanLabel = t("colPlan")
  const ovForecastLabel = t("colForecast")
  const ovActualLabel = t("colActual")
  const barData = byCategory.slice(0, 12).map(c => ({
    name: c.category.length > 18 ? c.category.slice(0, 18) + "…" : c.category,
    [ovPlanLabel]: Math.round(c.planned),
    [ovForecastLabel]: Math.round(c.forecast),
    [ovActualLabel]: Math.round(c.actual),
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
        <ColorStatCard label={t("kpiPlan")} value={fmt(totalPlanned)} icon={<BarChart2 className="h-5 w-5" />} color="blue" />
        <ColorStatCard label={t("kpiForecast")} value={fmt(totalForecast)} icon={<TrendingUp className="h-5 w-5" />} color="violet" />
        <ColorStatCard
          label={autoActualTotal > 0 ? t("kpiActualCostModel") : t("kpiActual")}
          value={fmt(totalActual)}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
        />
        <ColorStatCard
          label={t("kpiVariance")}
          value={(totalVariance >= 0 ? "+" : "") + fmt(totalVariance)}
          icon={totalVariance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          color={totalVariance >= 0 ? "teal" : "red"}
        />
        <ColorStatCard
          label={t("kpiYearEnd")}
          value={fmt(yearEndProjection)}
          icon={<CalendarRange className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* Action buttons: AI narrative + sync actuals */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleAINarrative} disabled={aiNarrative.isPending}>
          {aiNarrative.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <AlertCircle className="h-4 w-4 mr-1" />}
          {t("btnExplainVariances")}
        </Button>
        {autoActualTotal > 0 && (
          <Button size="sm" variant="outline" onClick={handleSyncActuals} disabled={syncActuals.isPending}>
            {syncActuals.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
            {t("btnUpdateActualCostModel")}
          </Button>
        )}
      </div>

      {/* AI Narrative Card */}
      {showNarrative && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-purple-600" /> {t("aiAnalysisTitle")}
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => { setShowNarrative(false); setNarrative(null) }}>✕</Button>
            </div>
          </CardHeader>
          <CardContent>
            {narrative ? (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{narrative}</div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("generatingNarrative")}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Execution % */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{t("budgetExecution")}</span>
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
            <CardHeader><CardTitle className="text-sm">{t("chartPlanForecastActual")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(0) + "k"} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  <Bar dataKey={ovPlanLabel} fill="#ef4444" radius={[0, 3, 3, 0]} />
                  <Bar dataKey={ovForecastLabel} fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                  <Bar dataKey={ovActualLabel} fill="#10b981" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">{t("chartExpenseComposition")}</CardTitle></CardHeader>
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
              <CardTitle className="text-sm">{t("chartWaterfall")}</CardTitle>
              <a
                href={`/api/budgeting/export?planId=${planId}`}
                className="text-xs text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:no-underline"
                download
              >
                {t("btnDownloadExcel")}
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
          <CardHeader><CardTitle className="text-sm">{t("tableBudgetForecastActual")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">{t("colCategory")}</th>
                    <th className="px-4 py-2 text-left font-medium">{t("colType")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("colBudget")}</th>
                    <th className="px-4 py-2 text-right font-medium text-purple-600 dark:text-purple-400">{t("colForecast")}</th>
                    <th className="px-4 py-2 text-right font-medium text-green-600 dark:text-green-400">{t("colActual")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("colVariance")}</th>
                    <th className="px-4 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2">{row.category}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs">
                          {row.lineType === "revenue" ? t("revenue") : t("expense")}
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
          <CardHeader><CardTitle className="text-sm">{t("tableByDepartment")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">{t("colDepartment")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("colBudget")}</th>
                    <th className="px-4 py-2 text-right font-medium text-purple-600 dark:text-purple-400">{t("colForecast")}</th>
                    <th className="px-4 py-2 text-right font-medium text-green-600 dark:text-green-400">{t("colActual")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("colVariance")}</th>
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
          {t("emptyAddLinesForAnalytics")}
        </div>
      )}
    </div>
  )
}

// ─── Lines Tab ────────────────────────────────────────────────────────────────

function LinesTab({ planId }: { planId: string }) {
  const t = useTranslations("budgeting")
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
            <div className="text-center py-12 text-muted-foreground">{t("emptyNoLinesHint")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">{t("colCategory")}</th>
                    <th className="px-4 py-2 text-left font-medium">{t("colDepartmentShort")}</th>
                    <th className="px-4 py-2 text-left font-medium">{t("colType")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("colBudget")}</th>
                    <th className="px-4 py-2 text-right font-medium text-purple-600 dark:text-purple-400">{t("colForecast")}</th>
                    <th className="px-4 py-2 text-left font-medium text-blue-600 dark:text-blue-400">{t("colCostModel")}</th>
                    <th className="px-4 py-2 text-center font-medium">{t("colAutoActual")}</th>
                    <th className="px-4 py-2 text-center font-medium">{t("colActions")}</th>
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
                            <Input value={editData.department || ""} onChange={e => setEditData(d => ({ ...d, department: e.target.value }))} className="h-7 text-xs" placeholder={t("colDepartment")} />
                          </td>
                          <td className="px-2 py-1">
                            <select value={editData.lineType} onChange={e => setEditData(d => ({ ...d, lineType: e.target.value as any }))}
                              className="border border-border rounded px-2 py-1 text-xs bg-background">
                              <option value="expense">{t("expense")}</option>
                              <option value="revenue">{t("revenue")}</option>
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <Input type="number" value={editData.plannedAmount || ""} onChange={e => setEditData(d => ({ ...d, plannedAmount: Number(e.target.value) }))} className="h-7 text-xs text-right" />
                          </td>
                          <td className="px-2 py-1">
                            <Input type="number" value={editData.forecastAmount || ""} onChange={e => setEditData(d => ({ ...d, forecastAmount: e.target.value ? Number(e.target.value) : undefined }))} className="h-7 text-xs text-right" placeholder={t("placeholderForecastShort")} />
                          </td>
                          <td className="px-2 py-1" colSpan={2}>
                            <select value={editData.costModelKey || ""} onChange={e => setEditData(d => ({ ...d, costModelKey: e.target.value, isAutoActual: !!e.target.value }))}
                              className="border border-border rounded px-2 py-1 text-xs bg-background w-full">
                              <option value="">{t("optManual")}</option>
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
                              {line.lineType === "revenue" ? t("revenue") : t("expense")}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">{fmt(line.plannedAmount)}</td>
                          <td className="px-4 py-2 text-right font-mono text-purple-600 dark:text-purple-400">
                            {line.forecastAmount != null ? fmt(line.forecastAmount) : <span className="text-muted-foreground text-xs">{t("placeholderForecastShort")}</span>}
                          </td>
                          <td className="px-4 py-2 text-xs text-blue-600 dark:text-blue-400">
                            {line.costModelKey ? <span title={line.costModelKey} className="flex items-center gap-1"><Link2 className="h-3 w-3" />{line.costModelKey.split(".").pop()}</span> : "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {line.isAutoActual
                              ? <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">{t("badgeAutoLabel")}</Badge>
                              : <span className="text-muted-foreground text-xs">{t("badgeManual")}</span>}
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
                    <td colSpan={3} className="px-4 py-2 font-medium text-sm">{t("totalLabel")}</td>
                    <td className="px-4 py-2 text-right font-bold font-mono">{fmt(total)}</td>
                    <td colSpan={4} className="px-4 py-2 text-xs text-muted-foreground">
                      {t("expensesLabel")} {fmt(expenseTotal)} | {t("revenuesLabel")} {fmt(revenueTotal)}
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
  const t = useTranslations("budgeting")
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
        <Input placeholder={t("placeholderFilterCategory")} value={filterCat} onChange={e => setFilterCat(e.target.value)} className="max-w-xs" />
        {filterCat && <Button variant="ghost" size="sm" onClick={() => setFilterCat("")}>{t("btnReset")}</Button>}
      </div>
      <Card>
        <CardContent className="p-0">
          {actuals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t("emptyNoActuals")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">{t("colCategory")}</th>
                    <th className="px-4 py-2 text-left font-medium">{t("colDepartment")}</th>
                    <th className="px-4 py-2 text-left font-medium">{t("colType")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("colAmount")}</th>
                    <th className="px-4 py-2 text-left font-medium">{t("colDate")}</th>
                    <th className="px-4 py-2 text-left font-medium">{t("colDescription")}</th>
                    <th className="px-4 py-2 text-center font-medium">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(actual => (
                    <tr key={actual.id} className="border-t border-border/50 hover:bg-muted/30">
                      {editId === actual.id ? (
                        <>
                          <td className="px-2 py-1"><Input value={editData.category} onChange={e => setEditData(d => ({ ...d, category: e.target.value }))} className="h-7 text-xs" /></td>
                          <td className="px-2 py-1"><Input value={editData.department} onChange={e => setEditData(d => ({ ...d, department: e.target.value }))} className="h-7 text-xs" /></td>
                          <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{actual.lineType === "revenue" ? t("revenue") : t("expense")}</Badge></td>
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
                              {actual.lineType === "revenue" ? t("revenue") : t("expense")}
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
                    <td colSpan={3} className="px-4 py-2 font-medium text-sm">{t("totalLabel")}</td>
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
  const t = useTranslations("budgeting")
  const { data: plans = [], isLoading } = useBudgetPlans()
  const updatePlan = useUpdateBudgetPlan()
  const deletePlan = useDeleteBudgetPlan()

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={onShowCreate}><Plus className="h-4 w-4 mr-1" /> {t("btnNewPlan")}</Button>
      </div>
      {plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("noPlansCardTitle")}</p>
          <p className="text-sm mt-1">{t("noPlansCardSubtitle")}</p>
          <Button className="mt-4" onClick={onShowCreate}><Plus className="h-4 w-4 mr-1" /> {t("createPlan")}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Card key={plan.id} className={`transition-all ${activePlanId === plan.id ? "ring-2 ring-purple-500" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{plan.name}</CardTitle>
                  {statusBadge(plan.status, t)}
                </div>
                <p className="text-sm text-muted-foreground">{periodLabel(plan, t)}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant={activePlanId === plan.id ? "default" : "outline"}
                    onClick={() => onSelect(plan.id)} className="flex-1 text-xs">
                    {activePlanId === plan.id ? t("btnActive") : t("btnSelect")}
                  </Button>
                  {plan.status === "draft" && (
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => {
                        if (confirm(t("confirmApprove"))) {
                          updatePlan.mutate({ id: plan.id, status: "approved" })
                        }
                      }}>
                      {t("btnApprove")}
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
  const t = useTranslations("budgeting")
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
        <p className="font-medium">{t("emptyNotEnoughData")}</p>
        <p className="text-sm mt-1">{t("emptyNotEnoughDataSub")}</p>
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
      const planName = plans.find(p => p.id === selectedIds[i])?.name || `${t("colPlan")} ${i + 1}`
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
        <CardHeader><CardTitle className="text-sm">{t("selectPlansTitle")}</CardTitle></CardHeader>
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
            <CardHeader><CardTitle className="text-sm">{t("chartComparisonByCategory")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v / 1000).toFixed(0) + "k"} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  {selectedIds.map((id, i) => {
                    const planName = plans.find(p => p.id === id)?.name || `${t("colPlan")} ${i + 1}`
                    return <Bar key={id} dataKey={planName} fill={COMPARISON_COLORS[i]} radius={[3, 3, 0, 0]} />
                  })}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* P4-04: Materiality filter */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">{t("materialityThreshold")}</span>
            <div className="flex items-center gap-1">
              <Input type="number" value={materialityPct} onChange={e => setMaterialityPct(Number(e.target.value))} className="h-7 w-16 text-xs text-right" /> %
            </div>
            <div className="flex items-center gap-1">
              <Input type="number" value={materialityAbs} onChange={e => setMaterialityAbs(Number(e.target.value))} className="h-7 w-20 text-xs text-right" /> ₼
            </div>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowAll(!showAll)}>
              {showAll ? t("btnHideMaterial") : t("btnShowAll")}
            </Button>
          </div>

          {/* P4-03: Variance table */}
          <Card>
            <CardHeader><CardTitle className="text-sm">{t("tableComparison")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium sticky left-0 bg-muted/50">{t("colCategory")}</th>
                      {selectedIds.map((id, i) => {
                        const name = plans.find(p => p.id === id)?.name || `${t("colPlan")} ${i + 1}`
                        return [
                          <th key={`${id}-p`} className="px-2 py-2 text-right font-medium" style={{ color: COMPARISON_COLORS[i] }}>{name} {t("colBudget")}</th>,
                          <th key={`${id}-a`} className="px-2 py-2 text-right font-medium" style={{ color: COMPARISON_COLORS[i] }}>{name} {t("colActual")}</th>,
                          <th key={`${id}-v`} className="px-2 py-2 text-right font-medium" style={{ color: COMPARISON_COLORS[i] }}>{t("colVarianceShort")} %</th>,
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
                      <td className="px-3 py-2 font-bold sticky left-0 bg-muted/30">{t("totalLabel")}</td>
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
        <div className="text-center py-8 text-muted-foreground text-sm">{t("emptySelectMorePlans")}</div>
      )}
    </div>
  )
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────

function PLTab({ planId }: { planId: string }) {
  const t = useTranslations("budgeting")
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
                <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">{t("colCategory")}</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">{t("colBudget")}</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium text-purple-600 dark:text-purple-400">{t("colForecast")}</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium text-green-600 dark:text-green-400">{t("colActual")}</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">{t("colVarianceShort")}</th>
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("plTitle")}</h2>
        <Button size="sm" variant="outline" onClick={() => setShowAddSection(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("btnAddSection")}
        </Button>
      </div>

      {showAddSection && (
        <Card className="p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block">{t("plSectionNameLabel")}</label>
              <Input value={newSectionName} onChange={e => setNewSectionName(e.target.value)} placeholder={t("plSectionNamePlaceholder")} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t("plTypeLabel")}</label>
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
              {createSection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("btnCreate")}
            </Button>
          </div>
        </Card>
      )}

      {/* Auto-generated P&L sections */}
      {renderSection(t("plRevenue"), revRows, "auto-revenue")}
      {renderSection(t("plExpenses"), expRows, "auto-expense")}
      {renderSection(t("plGrossProfit"), [], "auto-gross-profit", true, grossProfitPlanned, grossProfitActual)}

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
              <CardTitle className="text-sm text-blue-700 dark:text-blue-300">{t("plDrilldown")} {drilldown}</CardTitle>
              <button onClick={() => setDrilldown(null)} className="text-muted-foreground hover:text-foreground text-xs">✕ {t("btnClose")}</button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const row = byCategory.find(r => r.category === drilldown)
              if (!row) return <p className="text-sm text-muted-foreground">{t("emptyNoData")}</p>
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground">{t("colBudget")}</p><p className="font-bold font-mono">{fmt(row.planned)}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("colForecast")}</p><p className="font-bold font-mono text-purple-600 dark:text-purple-400">{fmt(row.forecast)}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("colActual")}</p><p className="font-bold font-mono text-green-600 dark:text-green-400">{fmt(row.actual)}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("colVariance")}</p>
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
  const t = useTranslations("budgeting")
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

  const fcBudgetLabel = t("colBudget")
  const fcForecastLabel = t("colForecast")
  const fcActualLabel = t("colActual")
  const chartData = monthlyData.map(d => ({
    name: d.label,
    [fcBudgetLabel]: d.planned,
    [fcForecastLabel]: d.forecast,
    [fcActualLabel]: d.actual || undefined,
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
        <ColorStatCard label={t("forecastBudgetYear")} value={fmt(totalPlanned)} icon={<BarChart2 className="h-5 w-5" />} color="blue" />
        <ColorStatCard label={t("forecastForecastYear")} value={fmt(totalForecast)} icon={<TrendingUp className="h-5 w-5" />} color="violet" />
        <ColorStatCard
          label={t("forecastYearEndProjection")}
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
              {s === "base" ? t("scenarioBase") : s === "optimistic" ? t("scenarioOptimistic") : t("scenarioPessimistic")}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating || budgetLines.length === 0}>
          {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-1" />}
          {t("btnGenerateForecast")}
        </Button>
        {forecastEntries.length > 0 && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 text-xs">
            {t("forecastRecordsInDB", { count: forecastEntries.length })}
          </Badge>
        )}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{t("chartMonthlyForecast")} {scenario !== "base" && `(${scenario === "optimistic" ? t("forecastScenarioSuffix") : t("forecastScenarioPessimSuffix")})`}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ left: 10, right: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Legend />
              <Bar dataKey={fcActualLabel} fill="#10b981" radius={[3, 3, 0, 0]} />
              <Area dataKey={fcForecastLabel} fill="#8b5cf640" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" type="monotone" />
              <Bar dataKey={fcBudgetLabel} fill="#ef444440" stroke="#ef4444" strokeWidth={1} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly table with inline edit */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{t("tableByMonth")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">{t("colMonth")}</th>
                  <th className="px-4 py-2 text-right font-medium">{t("colBudget")}</th>
                  <th className="px-4 py-2 text-right font-medium text-purple-600 dark:text-purple-400">{t("colForecast")}</th>
                  <th className="px-4 py-2 text-right font-medium text-green-600 dark:text-green-400">{t("colActual")}</th>
                  <th className="px-4 py-2 text-center font-medium">{t("colStatus")}</th>
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
                        ? <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs">{t("badgeProjected")}</Badge>
                        : <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">{t("badgeActual")}</Badge>}
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
            {t("tableCategoryMatrix")}
          </button>
        </CardHeader>
        {showCategories && (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium sticky left-0 bg-muted/50 min-w-[180px]">{t("colCategory")}</th>
                    {t("monthsShort").split(",").map((m, i) => (
                      <th key={i} className="px-2 py-2 text-right font-medium min-w-[80px]">
                        {m}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium min-w-[100px]">{t("totalLabel")}</th>
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
              <p className="text-center text-muted-foreground py-6 text-sm">{t("forecastGenerateHint")}</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

// ─── Template Seeder ──────────────────────────────────────────────────────────

function TemplateSeedButton({ planId }: { planId: string }) {
  const t = useTranslations("budgeting")
  const createLine = useCreateBudgetLine()
  const { data: lines = [] } = useBudgetLines(planId)
  const [seeding, setSeeding] = useState(false)

  if (lines.length > 0) return null

  const seed = async () => {
    setSeeding(true)

    // Collect all costModelKeys to resolve from cost model
    const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_REVENUE_CATEGORIES]
    const keysToResolve = allCategories
      .map(cat => TEMPLATE_CATEGORY_MAP[cat])
      .filter(Boolean) as string[]

    // Resolve cost model values in one API call
    let costValues: Record<string, number> = {}
    if (keysToResolve.length > 0) {
      try {
        const res = await fetch("/api/budgeting/resolve-costs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: keysToResolve }),
        })
        const json = await res.json()
        if (json.success) costValues = json.data
      } catch { /* fallback to 0 if cost model unavailable */ }
    }

    const expenseLines = DEFAULT_EXPENSE_CATEGORIES.map((category, i) => {
      const cmKey = TEMPLATE_CATEGORY_MAP[category] || undefined
      const cmValue = cmKey ? (costValues[cmKey] ?? 0) : 0
      return {
        planId,
        category,
        lineType: "expense" as const,
        plannedAmount: cmValue,
        forecastAmount: cmValue || undefined,
        sortOrder: i,
        costModelKey: cmKey,
        isAutoActual: !!cmKey,
      }
    })
    const revenueLines = DEFAULT_REVENUE_CATEGORIES.map((category, i) => {
      const cmKey = TEMPLATE_CATEGORY_MAP[category] || undefined
      const cmValue = cmKey ? (costValues[cmKey] ?? 0) : 0
      return {
        planId,
        category,
        lineType: "revenue" as const,
        plannedAmount: cmValue,
        forecastAmount: cmValue || undefined,
        sortOrder: i + 100,
        costModelKey: cmKey,
        isAutoActual: !!cmKey,
      }
    })
    for (const line of [...expenseLines, ...revenueLines]) {
      await createLine.mutateAsync(line)
    }
    setSeeding(false)
  }

  return (
    <button onClick={seed} disabled={seeding}
      className="ml-2 text-xs text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:no-underline disabled:opacity-50">
      {seeding ? t("templateLoading") : t("templateReady")}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BudgetingPage() {
  const t = useTranslations("budgeting")
  const { data: plans = [], isLoading: plansLoading } = useBudgetPlans()
  const [activePlanId, setActivePlanId] = useState<string>("")
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState("workspace")

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
            <h1 className="text-xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {plansLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
          ) : plans.length > 0 ? (
            <select value={resolvedPlanId} onChange={e => { setActivePlanId(e.target.value); setActiveTab("overview") }}
              className="border border-border rounded-md px-3 py-1.5 text-sm bg-background min-w-[180px]">
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {periodLabel(p, t)}</option>
              ))}
            </select>
          ) : null}
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t("createPlan")}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!plansLoading && plans.length === 0 && (
        <div className="text-center py-24 text-muted-foreground">
          <PiggyBank className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">{t("noPlans")}</p>
          <p className="text-sm mt-2">{t("noPlansSubtitle")}</p>
          <Button className="mt-6" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t("createPlan")}
          </Button>
        </div>
      )}

      {/* Main content */}
      {resolvedPlanId && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("activePlan")}</span>
            <span className="font-medium text-foreground">{plans.find(p => p.id === resolvedPlanId)?.name}</span>
            {statusBadge(plans.find(p => p.id === resolvedPlanId)?.status || "draft", t)}
            <TemplateSeedButton planId={resolvedPlanId} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="workspace">{t("tabWorkspace")}</TabsTrigger>
              <TabsTrigger value="pl">{t("tabPL")}</TabsTrigger>
              <TabsTrigger value="forecast">{t("tabForecast")}</TabsTrigger>
              <TabsTrigger value="comparison">{t("tabComparison")}</TabsTrigger>
              <TabsTrigger value="plans">{t("tabPlans")}</TabsTrigger>
            </TabsList>

            <TabsContent value="workspace">
              <WorkspaceTab planId={resolvedPlanId} />
            </TabsContent>
            <TabsContent value="pl">
              <PLTab planId={resolvedPlanId} />
            </TabsContent>
            <TabsContent value="forecast">
              <ForecastTab planId={resolvedPlanId} />
            </TabsContent>
            <TabsContent value="comparison">
              <ComparisonTab />
            </TabsContent>
            <TabsContent value="plans">
              <PlansTab activePlanId={resolvedPlanId} onSelect={id => { setActivePlanId(id); setActiveTab("workspace") }} onShowCreate={() => setShowCreate(true)} />
            </TabsContent>
          </Tabs>
        </>
      )}

      {showCreate && <CreatePlanDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
