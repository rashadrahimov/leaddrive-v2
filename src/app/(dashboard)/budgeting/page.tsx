"use client"

import React, { useState, useMemo } from "react"
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
  ChevronDown, ChevronRight, MessageSquare, Target, Brain, Sparkles,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, LabelList,
} from "recharts"
import { BUDGET_COLORS, ANIMATION, AXIS_TICK, GRID_STYLE, HBarGradient, VBarGradient, fmtK } from "@/lib/budget-chart-theme"
import { BudgetChartTooltip } from "@/components/budget-chart-tooltip"
import { BudgetBarLabel } from "@/components/budget-bar-label"
import { BudgetChartLegend } from "@/components/budget-chart-legend"
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
  useBudgetTemplates,
  useCreateBudgetTemplate,
  useUpdateBudgetTemplate,
  useDeleteBudgetTemplate,
  useApplyTemplates,
} from "@/lib/budgeting/hooks"
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_REVENUE_CATEGORIES,
  DEPARTMENTS,
  SECTION_TYPES,
  type BudgetLine,
  type BudgetDirectionTemplate,
} from "@/lib/budgeting/types"
import { COST_MODEL_KEY_OPTIONS, TEMPLATE_CATEGORY_MAP } from "@/lib/budgeting/cost-model-map"
import { BudgetWaterfallChart } from "@/components/budget-waterfall-chart"
import { InfoHint } from "@/components/info-hint"

const PIE_COLORS = BUDGET_COLORS.pie

function fmt(n: number): string {
  return Math.round(n).toLocaleString() + " ₼"
}

function statusBadge(status: string, t: (key: string) => string) {
  if (status === "pending_approval") return <Badge title={t("hintStatusPending")} className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t("statusPending")}</Badge>
  if (status === "approved") return <Badge title={t("hintStatusApproved")} className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t("statusApproved")}</Badge>
  if (status === "rejected") return <Badge title={t("hintStatusRejected")} className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t("statusRejected")}</Badge>
  if (status === "closed") return <Badge title={t("hintStatusClosed")} className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{t("statusClosed")}</Badge>
  return <Badge title={t("hintStatusDraft")} className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t("statusDraft")}</Badge>
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
            <select title={t("hintFieldType")} value={lineType} onChange={e => setLineType(e.target.value as any)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="expense">{t("expense")}</option>
              <option value="revenue">{t("revenue")}</option>
              <option value="cogs">COGS</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{t("fieldPlannedAmount")} (₼)</label>
            <Input title={t("hintFieldAmount")} type="number" value={amount} onChange={e => setAmount(e.target.value)} min={0} step={0.01} required />
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
              <option value="cogs">COGS</option>
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())
  const [addingSubItem, setAddingSubItem] = useState<string | null>(null)
  const [newSubItem, setNewSubItem] = useState({ category: "", amount: "", department: "" })
  const [addingSection, setAddingSection] = useState<string | null>(null) // "revenue" | "cogs" | "expense" | null
  const [addMode, setAddMode] = useState<"line" | "toGroup" | "newGroup">("line")
  const [newRow, setNewRow] = useState({ category: "", lineType: "expense", plannedAmount: "", forecastAmount: "", department: "", parentId: "" })
  const [filterText, setFilterText] = useState("")
  const [filterType, setFilterType] = useState<"all" | "expense" | "revenue">("all")
  const [showMaterialOnly, setShowMaterialOnly] = useState(false)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [showNarrative, setShowNarrative] = useState(false)
  // Drill-down sheet for fact values
  const [drillDownLine, setDrillDownLine] = useState<BudgetLine | null>(null)
  // Variance note dialog
  const [varianceNoteLine, setVarianceNoteLine] = useState<BudgetLine | null>(null)
  const [varianceNoteText, setVarianceNoteText] = useState("")

  // New actual form for expand
  const [newActual, setNewActual] = useState({ amount: "", description: "", date: "" })

  // Build actuals by category+lineType map
  const actualsByCat = useMemo(() => {
    const m = new Map<string, { total: number; items: typeof actuals }>()
    for (const a of actuals) {
      const key = `${a.category}||${a.lineType}`
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
  }, [lines, filterText, filterType, autoActualMap, actualsByCat])

  // Materiality check helper — used for opacity in table rows
  const isMaterial = (l: BudgetLine): boolean => {
    const factValue = l.isAutoActual ? (autoActualMap.get(l.category) ?? 0) : (actualsByCat.get(`${l.category}||${l.lineType}`)?.total ?? 0)
    const varianceAbs = Math.abs(l.plannedAmount - factValue)
    const variancePctVal = l.plannedAmount > 0 ? (varianceAbs / l.plannedAmount) * 100 : 0
    return variancePctVal >= 5 || varianceAbs >= 500
  }

  const expenseLines = filteredLines.filter((l: BudgetLine) => l.lineType === "expense")
  const revenueLines = filteredLines.filter((l: BudgetLine) => l.lineType === "revenue")
  const cogsLines = filteredLines.filter((l: BudgetLine) => l.lineType === "cogs")

  // Helper: get leaf amount (children sum if group parent, else own amount)
  const leafPlanned = (l: BudgetLine) => l.children?.length ? l.children.reduce((s, c) => s + c.plannedAmount, 0) : l.plannedAmount
  const leafForecast = (l: BudgetLine) => l.children?.length ? l.children.reduce((s, c) => s + (c.forecastAmount ?? c.plannedAmount), 0) : (l.forecastAmount ?? l.plannedAmount)

  // Totals
  const totExpPlanned = expenseLines.reduce((s: number, l: BudgetLine) => s + leafPlanned(l), 0)
  const totExpForecast = expenseLines.reduce((s: number, l: BudgetLine) => s + leafForecast(l), 0)
  const totRevPlanned = revenueLines.reduce((s: number, l: BudgetLine) => s + leafPlanned(l), 0)
  const totRevForecast = revenueLines.reduce((s: number, l: BudgetLine) => s + leafForecast(l), 0)
  const totCOGSPlanned = cogsLines.reduce((s: number, l: BudgetLine) => s + leafPlanned(l), 0)
  const totCOGSForecast = cogsLines.reduce((s: number, l: BudgetLine) => s + leafForecast(l), 0)

  const { totalPlanned = 0, totalForecast = 0, totalActual = 0, totalVariance = 0, executionPct = 0, expenseExecutionPct = 0, elapsedPct = 100, autoActualTotal = 0, yearEndProjection = 0, byCategory = [], totalRevenuePlanned = 0, totalRevenueActual = 0, totalRevenueForecast = 0, totalExpensePlanned = 0, totalExpenseActual = 0, totalExpenseForecast = 0, totalCOGSPlanned = 0, totalCOGSActual = 0, totalCOGSForecast = 0, grossProfit = 0, grossProfitActual = 0, margin = 0, marginActual = 0, marginForecast = 0 } = analytics ?? {}

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

  // All parent groups filtered by adding section's lineType
  const parentGroups = lines.filter((l: BudgetLine) => l.lineType === (addingSection || "expense") && ((l.children && l.children.length > 0) || (l.notes && l.notes.startsWith("group:"))))

  // Add new row (line, sub-item in group, or new group)
  const handleAddRow = async () => {
    if (!newRow.category.trim() || !addingSection) return
    if (addMode === "newGroup") {
      await createLine.mutateAsync({
        planId,
        category: newRow.category,
        lineType: addingSection as "expense" | "revenue" | "cogs",
        plannedAmount: 0,
        notes: `group:${newRow.category.toLowerCase().replace(/\s+/g, "_")}`,
      })
    } else {
      await createLine.mutateAsync({
        planId,
        category: newRow.category,
        department: newRow.department || undefined,
        lineType: addingSection as "expense" | "revenue" | "cogs",
        plannedAmount: Number(newRow.plannedAmount) || 0,
        parentId: addMode === "toGroup" ? (newRow.parentId || undefined) : undefined,
      })
    }
    setNewRow({ category: "", lineType: "expense", plannedAmount: "", forecastAmount: "", department: "", parentId: "" })
    setAddMode("line")
    setAddingSection(null)
  }

  // Add actual from expand
  const handleAddActual = async (category: string, lineType: string) => {
    if (!newActual.amount) return
    await createActual.mutateAsync({
      planId,
      category,
      lineType: lineType as "expense" | "revenue" | "cogs",
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
    const catActuals = actualsByCat.get(`${line.category}||${line.lineType}`)
    const factValue = line.isAutoActual ? (autoActualMap.get(line.category) ?? 0) : (catActuals?.total ?? 0)
    const variance = line.lineType === "revenue" ? factValue - line.plannedAmount : line.plannedAmount - factValue
    const variancePct = line.plannedAmount > 0 ? (variance / line.plannedAmount) * 100 : 0
    const isExpanded = expandId === line.id

    const rowMaterial = !showMaterialOnly || isMaterial(line)

    return (
      <tr key={line.id} className={`border-t border-border/50 hover:bg-muted/30 group ${!rowMaterial ? "opacity-40" : ""}`}>
        {/* Category */}
        <td className="px-3 py-2 text-sm font-medium">{line.category}</td>
        {/* Department */}
        <td className="px-2 py-2 text-xs text-muted-foreground">{line.department || "—"}</td>
        {/* Plan - editable */}
        <td className="px-2 py-2 text-right">
          {editCell?.id === line.id && editCell?.field === "plannedAmount" ? (
            <Input type="number" className="h-7 w-24 text-right text-xs ml-auto" value={editValue} autoFocus
              onChange={e => setEditValue(e.target.value)}
              onBlur={() => saveEdit()}
              onKeyDown={e => { if (e.key === "Enter") saveEdit() }} />
          ) : (
            <button type="button" className="font-mono text-sm cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 px-1 rounded border border-transparent hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
              onClick={() => startEdit(line.id, "plannedAmount", line.plannedAmount)}>
              {fmt(line.plannedAmount)}
              <Pencil className="h-2.5 w-2.5 inline ml-1 opacity-0 group-hover:opacity-40" />
            </button>
          )}
        </td>
        {/* Fact — clickable for drill-down */}
        <td className="px-2 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <button type="button"
              className={`font-mono text-sm cursor-pointer px-1 rounded hover:underline ${line.isAutoActual ? "text-blue-600 dark:text-blue-400" : "text-[#065f46] dark:text-[#6ee7b7]"}`}
              onClick={() => setDrillDownLine(line)}
              title={t("drillDownTitle")}>
              {fmt(factValue)}
            </button>
            {line.isAutoActual && (
              <Badge title={t("hintBadgeAuto")} className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 px-1">{t("badgeAuto")}</Badge>
            )}
            {!line.isAutoActual && (
              <button type="button" className="text-muted-foreground hover:text-foreground"
                onClick={() => setExpandId(isExpanded ? null : line.id)}>
                <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        </td>
        {/* Variance + annotation icon */}
        <td className={`px-2 py-2 text-right font-mono text-sm font-bold ${variance >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-500"}`}>
          <div className="flex items-center justify-end gap-1">
            <button type="button"
              className={`p-0.5 rounded hover:bg-muted ${line.notes ? "text-blue-500" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
              title={line.notes || t("varianceNoteTitle")}
              onClick={() => { setVarianceNoteLine(line); setVarianceNoteText(line.notes || "") }}>
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
            <span>{variance >= 0 ? "+" : ""}{variancePct.toFixed(1)}%</span>
          </div>
        </td>
        {/* Actions */}
        <td className="px-2 py-2 text-center">
          <button onClick={() => { if (confirm(t("confirmDeleteLine") + " «" + line.category + "» " + t("confirmDeleteLineSuffix"))) deleteLine.mutate({ id: line.id, planId }) }}
            title={t("hintDeleteLine")}
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
    const items = actualsByCat.get(`${line.category}||${line.lineType}`)?.items ?? []
    return (
      <tr key={`expand-${line.id}`} className="bg-muted/20">
        <td colSpan={6} className="px-4 py-2">
          <div className="text-xs space-y-1">
            <div className="font-medium text-muted-foreground mb-1">{t("actualRecordsFor")} «{line.category}»:</div>
            {items.length === 0 && <div className="text-muted-foreground italic">{t("emptyNoRecords")}</div>}
            {items.map(a => (
              <div key={a.id} className="flex items-center gap-3 py-0.5">
                <span className="font-mono">{fmt(a.actualAmount)}</span>
                <span className="text-muted-foreground">{a.expenseDate || "—"}</span>
                <span className="text-muted-foreground flex-1">{a.description || ""}</span>
                <button onClick={() => deleteActual.mutate({ id: a.id, planId })}
                  title={t("hintDeleteLine")} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
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

  // Group colors by notes tag
  const GROUP_COLORS: Record<string, string> = {
    "group:admin":      "bg-violet-500",
    "group:tech_infra": "bg-blue-500",
    "group:labor":      "bg-emerald-500",
    "group:risk":       "bg-amber-500",
  }

  // Add sub-item under a parent group
  const handleAddSubItem = async (parentLine: BudgetLine) => {
    if (!newSubItem.category.trim()) return
    await createLine.mutateAsync({
      planId,
      category: newSubItem.category,
      lineType: parentLine.lineType as "expense" | "revenue" | "cogs",
      plannedAmount: Number(newSubItem.amount) || 0,
      parentId: parentLine.id,
      department: newSubItem.department || undefined,
    })
    setNewSubItem({ category: "", amount: "", department: "" })
    setAddingSubItem(null)
  }

  // Render a group header row (collapsible)
  const renderGroupHeader = (line: BudgetLine) => {
    const groupTag = line.notes ?? ""
    const colorClass = GROUP_COLORS[groupTag] ?? "bg-slate-400"
    const children = line.children ?? []
    const groupTotal = children.reduce((s, c) => s + c.plannedAmount, 0)
    const groupActual = children.reduce((s, c) => {
      return s + (c.isAutoActual ? (autoActualMap.get(c.category) ?? 0) : (actualsByCat.get(`${c.category}||${c.lineType}`)?.total ?? 0))
    }, 0)
    const isOpen = expandedGroups.has(groupTag.replace("group:", ""))
    const toggleGroup = () => {
      const key = groupTag.replace("group:", "")
      setExpandedGroups(prev => {
        const next = new Set(prev)
        next.has(key) ? next.delete(key) : next.add(key)
        return next
      })
    }

    return (
      <tr key={line.id} className="border-t border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer select-none group" onClick={toggleGroup}>
        <td className="px-3 py-2.5" colSpan={2}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorClass}`} />
            {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="font-semibold text-sm">{line.category}</span>
            <Badge variant="outline" title={t("hintBadgeChildCount")} className="ml-1 text-[10px] px-1.5 py-0">{children.length}</Badge>
          </div>
        </td>
        <td className="px-2 py-2.5 text-right font-mono text-sm font-semibold">{fmt(groupTotal)}</td>
        <td className="px-2 py-2.5 text-right font-mono text-sm font-semibold text-[#065f46] dark:text-[#6ee7b7]">{fmt(groupActual)}</td>
        <td className="px-2 py-2.5 text-right text-sm font-semibold text-muted-foreground">
          {groupTotal > 0 ? `${(((groupTotal - groupActual) / groupTotal) * 100).toFixed(1)}%` : "—"}
        </td>
        <td className="px-2 py-2.5 text-center" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1 justify-center">
            <button
              className="p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 text-muted-foreground hover:text-purple-600 opacity-60 hover:opacity-100"
              title={t("hintAddSubItem")}
              onClick={() => setAddingSubItem(addingSubItem === line.id ? null : line.id)}>
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              title={t("hintDeleteLine")}
              onClick={() => {
                const childCount = children.length
                const msg = childCount > 0
                  ? `${t("confirmDeleteLine")} «${line.category}» (${childCount} подкатегорий будут откреплены)?`
                  : `${t("confirmDeleteLine")} «${line.category}»?`
                if (confirm(msg)) deleteLine.mutate({ id: line.id, planId })
              }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  // Render a child (sub-item) row — indented
  const renderChildRow = (child: BudgetLine) => {
    const factValue = child.isAutoActual ? (autoActualMap.get(child.category) ?? 0) : (actualsByCat.get(`${child.category}||${child.lineType}`)?.total ?? 0)
    const variance = child.lineType === "revenue" ? factValue - child.plannedAmount : child.plannedAmount - factValue
    const variancePct = child.plannedAmount > 0 ? (variance / child.plannedAmount) * 100 : 0
    const isExpanded = expandId === child.id

    const noteText = child.notes && !child.notes.startsWith("group:") ? child.notes : null

    return (
      <React.Fragment key={child.id}>
        <tr className="border-t border-border/30 hover:bg-muted/20 group">
          <td className="px-3 py-1.5 text-sm" colSpan={2}>
            <div className="flex items-center gap-1 pl-6">
              <span className="text-muted-foreground text-xs">—</span>
              <span className="flex-1">{child.category}</span>
              {child.department && <Badge variant="outline" className="text-[9px] px-1">{child.department}</Badge>}
            </div>
            {noteText && <div className="pl-8 text-[10px] text-muted-foreground italic mt-0.5">{noteText}</div>}
          </td>
          <td className="px-2 py-1.5 text-right">
            {editCell?.id === child.id && editCell?.field === "plannedAmount" ? (
              <Input type="number" className="h-6 w-24 text-right text-xs ml-auto" value={editValue} autoFocus
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => saveEdit()} onKeyDown={e => { if (e.key === "Enter") saveEdit() }} />
            ) : (
              <button type="button" className="font-mono text-sm cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 px-1 rounded border border-transparent hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                onClick={() => startEdit(child.id, "plannedAmount", child.plannedAmount)}>
                {fmt(child.plannedAmount)}
                <Pencil className="h-2.5 w-2.5 inline ml-1 opacity-0 group-hover:opacity-40" />
              </button>
            )}
          </td>
          <td className="px-2 py-1.5 text-right">
            <div className="flex items-center justify-end gap-1">
              <button type="button"
                className={`font-mono text-sm cursor-pointer px-1 rounded hover:underline ${child.isAutoActual ? "text-blue-600 dark:text-blue-400" : "text-[#065f46] dark:text-[#6ee7b7]"}`}
                onClick={() => setDrillDownLine(child)}
                title={t("drillDownTitle")}>
                {fmt(factValue)}
              </button>
              {child.isAutoActual && (
                <Badge title={t("hintBadgeAuto")} className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 px-1">{t("badgeAuto")}</Badge>
              )}
              {!child.isAutoActual && (
                <button type="button" className="text-muted-foreground hover:text-foreground"
                  onClick={() => setExpandId(isExpanded ? null : child.id)}>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
          </td>
          <td className={`px-2 py-1.5 text-right font-mono text-xs font-bold ${variance >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-500"}`}>
            <div className="flex items-center justify-end gap-1">
              <button type="button"
                className={`p-0.5 rounded hover:bg-muted ${noteText ? "text-blue-500" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                title={noteText || t("varianceNoteTitle")}
                onClick={() => { setVarianceNoteLine(child); setVarianceNoteText(child.notes || "") }}>
                <MessageSquare className="h-3 w-3" />
              </button>
              <span>{variance >= 0 ? "+" : ""}{variancePct.toFixed(1)}%</span>
            </div>
          </td>
          <td className="px-2 py-1.5 text-center">
            <button onClick={() => { if (confirm(t("confirmDeleteLine") + " «" + child.category + "»?")) deleteLine.mutate({ id: child.id, planId }) }}
              title={t("hintDeleteLine")}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </td>
        </tr>
        {renderExpand(child)}
      </React.Fragment>
    )
  }

  // Render add sub-item inline form
  const renderAddSubItemForm = (parentLine: BudgetLine) => {
    if (addingSubItem !== parentLine.id) return null
    return (
      <tr key={`add-sub-${parentLine.id}`} className="bg-purple-50 dark:bg-purple-900/10 border-t border-border/30">
        <td className="px-3 py-1.5">
          <div className="pl-6 flex items-center gap-2">
            <Input placeholder={t("placeholderCategoryShort")} className="h-6 text-xs flex-1" autoFocus value={newSubItem.category}
              onChange={e => setNewSubItem(d => ({ ...d, category: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") handleAddSubItem(parentLine) }} />
          </div>
        </td>
        <td className="px-2 py-1.5">
          <Input placeholder={t("colDepartment")} className="h-6 text-xs" value={newSubItem.department}
            onChange={e => setNewSubItem(d => ({ ...d, department: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") handleAddSubItem(parentLine) }} />
        </td>
        <td className="px-2 py-1.5">
          <Input type="number" placeholder="0" className="h-6 text-xs text-right" value={newSubItem.amount}
            onChange={e => setNewSubItem(d => ({ ...d, amount: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") handleAddSubItem(parentLine) }} />
        </td>
        <td colSpan={2} className="px-2 py-1.5">
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleAddSubItem(parentLine)}>
              <CheckCircle className="h-3 w-3 mr-1" /> {t("btnSave")}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setAddingSubItem(null)}>{t("btnCancel")}</Button>
          </div>
        </td>
        <td />
      </tr>
    )
  }

  // Section renderer (used for revenue; expenses use renderGroupedExpenses below)
  const renderSection = (title: string, sectionLines: BudgetLine[], totPlanned: number, _totForecast: number) => {
    const totActual = sectionLines.reduce((s: number, l: BudgetLine) => {
      const fact = l.isAutoActual ? (autoActualMap.get(l.category) ?? 0) : (actualsByCat.get(`${l.category}||${l.lineType}`)?.total ?? 0)
      return s + fact
    }, 0)
    return (
      <>
        <tr className="bg-muted/40">
          <td colSpan={6} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</td>
        </tr>
        {sectionLines.map(l => [renderRow(l), renderExpand(l)])}
        <tr className="border-y-2 border-border bg-muted/50">
          <td className="px-3 py-2 font-bold text-sm" colSpan={2} title={t("hintSectionTotal")}>{t("totalLabel")} {title.toLowerCase()}</td>
          <td className="px-2 py-2 text-right font-mono text-sm font-bold">{fmt(totPlanned)}</td>
          <td className="px-2 py-2 text-right font-mono text-sm font-bold text-[#065f46] dark:text-[#6ee7b7]">{fmt(totActual)}</td>
          <td className="px-2 py-2 text-right font-mono text-sm font-bold">
            {totPlanned > 0 ? `${(((totPlanned - totActual) / totPlanned) * 100).toFixed(1)}%` : "—"}
          </td>
          <td />
        </tr>
      </>
    )
  }

  // Universal grouped section renderer with per-section add form
  const renderGroupedSection = (title: string, sectionLines: BudgetLine[], totPlanned: number, sectionHintKey?: string, sectionLineType?: string) => {
    const totActual = sectionLines.reduce((s: number, l: BudgetLine) => {
      if (l.children?.length) {
        return s + l.children.reduce((cs, c) => cs + (c.isAutoActual ? (autoActualMap.get(c.category) ?? 0) : (actualsByCat.get(`${c.category}||${c.lineType}`)?.total ?? 0)), 0)
      }
      return s + (l.isAutoActual ? (autoActualMap.get(l.category) ?? 0) : (actualsByCat.get(`${l.category}||${l.lineType}`)?.total ?? 0))
    }, 0)

    return (
      <>
        <tr className="bg-muted/40">
          <td colSpan={6} className="px-3 pt-2 pb-1">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
            {sectionHintKey && <div className="text-[10px] text-muted-foreground/60 font-normal mt-0.5">{t(sectionHintKey)}</div>}
          </td>
        </tr>
        {sectionLines.map(l => {
          const isGroupParent = (l.children && l.children.length > 0) || (l.notes && l.notes.startsWith("group:"))
          const groupTag = l.notes ?? ""
          const isOpen = expandedGroups.has(groupTag.replace("group:", ""))

          if (isGroupParent) {
            return (
              <React.Fragment key={l.id}>
                {renderGroupHeader(l)}
                {renderAddSubItemForm(l)}
                {isOpen && (l.children ?? []).map(child => renderChildRow(child))}
              </React.Fragment>
            )
          }
          return <React.Fragment key={l.id}>{renderRow(l)}{renderExpand(l)}</React.Fragment>
        })}
        <tr className="border-y-2 border-border bg-muted/50">
          <td className="px-3 py-2 font-bold text-sm" colSpan={2} title={t("hintSectionTotal")}>{t("totalLabel")} {title.toLowerCase()}</td>
          <td className="px-2 py-2 text-right font-mono text-sm font-bold">{fmt(totPlanned)}</td>
          <td className="px-2 py-2 text-right font-mono text-sm font-bold text-[#065f46] dark:text-[#6ee7b7]">{fmt(totActual)}</td>
          <td className="px-2 py-2 text-right font-mono text-sm font-bold">
            {totPlanned > 0 ? `${(((totPlanned - totActual) / totPlanned) * 100).toFixed(1)}%` : "—"}
          </td>
          <td />
        </tr>
        {/* Per-section add form */}
        {sectionLineType && addingSection === sectionLineType ? (
          <>
            <tr className="bg-green-50/50 dark:bg-green-900/5">
              <td colSpan={6} className="px-3 py-1.5">
                <div className="flex items-center gap-1">
                  <Button size="sm" variant={addMode === "line" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setAddMode("line")}>{t("addAsLine")}</Button>
                  <Button size="sm" variant={addMode === "toGroup" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setAddMode("toGroup")}>{t("addToGroup")}</Button>
                  <Button size="sm" variant={addMode === "newGroup" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setAddMode("newGroup")}>{t("addAsGroup")}</Button>
                </div>
              </td>
            </tr>
            <tr className="bg-green-50 dark:bg-green-900/10">
              <td className="px-2 py-1.5">
                <div className="flex flex-col gap-1">
                  {addMode === "toGroup" && (
                    <select value={newRow.parentId} onChange={e => setNewRow(d => ({ ...d, parentId: e.target.value }))} className="h-7 rounded-md border border-input bg-background px-2 text-xs w-full">
                      <option value="">{t("selectGroup")}</option>
                      {parentGroups.map((g: BudgetLine) => <option key={g.id} value={g.id}>{g.category}</option>)}
                    </select>
                  )}
                  <Input placeholder={addMode === "newGroup" ? t("newGroupName") : t("placeholderCategoryShort")} className="h-7 text-xs" value={newRow.category} onChange={e => setNewRow(d => ({ ...d, category: e.target.value }))} autoFocus
                    onKeyDown={e => { if (e.key === "Enter") handleAddRow(); if (e.key === "Escape") setAddingSection(null) }} />
                </div>
              </td>
              {addMode !== "newGroup" ? (
                <>
                  <td className="px-2 py-1.5"><Input placeholder={t("colDepartment")} className="h-7 text-xs" value={newRow.department ?? ""} onChange={e => setNewRow(d => ({ ...d, department: e.target.value }))} /></td>
                  <td className="px-2 py-1.5"><Input type="number" placeholder="0" className="h-7 text-xs text-right" value={newRow.plannedAmount} onChange={e => setNewRow(d => ({ ...d, plannedAmount: e.target.value }))} /></td>
                </>
              ) : (
                <td colSpan={2} className="px-2 py-1 text-[10px] text-muted-foreground align-middle">Сумма = 0, подкатегории через «+»</td>
              )}
              <td />
              <td className="px-2 py-1.5 text-center">
                <div className="flex gap-1 justify-center">
                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleAddRow}><CheckCircle className="h-3 w-3 mr-1" />{t("btnSave")}</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingSection(null); setAddMode("line") }}>{t("btnCancel")}</Button>
                </div>
              </td>
              <td />
            </tr>
          </>
        ) : sectionLineType ? (
          <tr className="border-t border-dashed border-border/20">
            <td colSpan={6} className="px-3 py-1">
              <button onClick={() => { setAddingSection(sectionLineType); setAddMode("line"); setNewRow(d => ({ ...d, parentId: "" })) }} className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> {t("btnAddRow")}
              </button>
            </td>
          </tr>
        ) : null}
      </>
    )
  }

  const planLabel = t("colPlan")
  const actualLabel = t("colActual")
  const MAX_CHART_ITEMS = 8

  const expenseAllData = byCategory
    .filter((c: any) => c.lineType === "expense" && (c.planned > 0 || c.actual > 0))
    .sort((a: any, b: any) => Math.max(b.actual, b.planned) - Math.max(a.actual, a.planned))

  const expenseBarData = (() => {
    const toRow = (c: any) => ({
      name: c.category.length > 20 ? c.category.slice(0, 20) + "…" : c.category,
      [planLabel]: Math.round(c.planned),
      [actualLabel]: Math.round(c.actual),
    })
    if (expenseAllData.length <= MAX_CHART_ITEMS + 1) return expenseAllData.map(toRow)
    const top = expenseAllData.slice(0, MAX_CHART_ITEMS).map(toRow)
    const rest = expenseAllData.slice(MAX_CHART_ITEMS)
    top.push({ name: `Прочие (${rest.length})`, [planLabel]: Math.round(rest.reduce((s: number, c: any) => s + c.planned, 0)), [actualLabel]: Math.round(rest.reduce((s: number, c: any) => s + c.actual, 0)) })
    return top
  })()

  const revenueAllData = byCategory
    .filter((c: any) => c.lineType === "revenue" && (c.planned > 0 || c.actual > 0))
    .sort((a: any, b: any) => Math.max(b.actual, b.planned) - Math.max(a.actual, a.planned))

  const revenueBarData = (() => {
    const toRow = (c: any) => ({
      name: c.category.length > 20 ? c.category.slice(0, 20) + "…" : c.category,
      [planLabel]: Math.round(c.planned),
      [actualLabel]: Math.round(c.actual),
    })
    if (revenueAllData.length <= MAX_CHART_ITEMS + 1) return revenueAllData.map(toRow)
    const top = revenueAllData.slice(0, MAX_CHART_ITEMS).map(toRow)
    const rest = revenueAllData.slice(MAX_CHART_ITEMS)
    top.push({ name: `Прочие (${rest.length})`, [planLabel]: Math.round(rest.reduce((s: number, c: any) => s + c.planned, 0)), [actualLabel]: Math.round(rest.reduce((s: number, c: any) => s + c.actual, 0)) })
    return top
  })()

  // Expense execution: how much of expense budget was spent
  const expExecPct = totalExpensePlanned > 0 ? (totalExpenseActual / totalExpensePlanned) * 100 : 0
  // Overspend alert (expense-only)
  const overspendPct = expExecPct - 100
  const overspendAmount = totalExpenseActual - totalExpensePlanned

  // Overall budget execution — margin-based (actual margin / planned margin * 100)
  // Positive margin plan, positive actual = good execution
  // Negative actual with positive plan = budget failed
  const budgetExecPct = margin !== 0 ? (marginActual / margin) * 100 : 0
  const budgetExecColor = budgetExecPct >= 80 ? "green" as const : budgetExecPct >= 50 ? "amber" as const : "red" as const
  const budgetExecEmoji = budgetExecPct >= 80 ? "🟢" : budgetExecPct >= 50 ? "🟡" : "🔴"

  const totExpActual = expenseLines.reduce((s: number, l: BudgetLine) => {
    if (l.children?.length) {
      return s + l.children.reduce((cs, c) => cs + (c.isAutoActual ? (autoActualMap.get(c.category) ?? 0) : (actualsByCat.get(`${c.category}||${c.lineType}`)?.total ?? 0)), 0)
    }
    return s + (l.isAutoActual ? (autoActualMap.get(l.category) ?? 0) : (actualsByCat.get(`${l.category}||${l.lineType}`)?.total ?? 0))
  }, 0)
  const totRevActual = revenueLines.reduce((s: number, l: BudgetLine) => {
    if (l.children?.length) {
      return s + l.children.reduce((cs, c) => cs + (c.isAutoActual ? (autoActualMap.get(c.category) ?? 0) : (actualsByCat.get(`${c.category}||${c.lineType}`)?.total ?? 0)), 0)
    }
    return s + (l.isAutoActual ? (autoActualMap.get(l.category) ?? 0) : (actualsByCat.get(`${l.category}||${l.lineType}`)?.total ?? 0))
  }, 0)
  const totCOGSActual = cogsLines.reduce((s: number, l: BudgetLine) => {
    if (l.children?.length) {
      return s + l.children.reduce((cs, c) => cs + (c.isAutoActual ? (autoActualMap.get(c.category) ?? 0) : (actualsByCat.get(`${c.category}||${c.lineType}`)?.total ?? 0)), 0)
    }
    return s + (l.isAutoActual ? (autoActualMap.get(l.category) ?? 0) : (actualsByCat.get(`${l.category}||${l.lineType}`)?.total ?? 0))
  }, 0)

  return (
    <div className="space-y-6">
      {/* KPI Cards — 3 rows with headers */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("kpiPlan")} & {t("kpiActual")}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ColorStatCard label={t("sectionExpenses") + " (" + t("kpiPlan").toLowerCase() + ")"} value={fmt(totalExpensePlanned)} icon={<BarChart2 className="h-5 w-5" />} color="blue" hint={t("hintKpiExpPlan")}
          subValue={`${expenseLines.length} ${t("colCategory").toLowerCase()}`}
        />
        <ColorStatCard label={t("sectionExpenses") + " (" + t("kpiActual").toLowerCase() + ")"} value={fmt(totalExpenseActual)} icon={<DollarSign className="h-5 w-5" />} color="red" hint={t("hintKpiExpActual")}
          subValue={`${Math.round(expExecPct)}% ${t("kpiExecution").toLowerCase()}`}
        />
        <ColorStatCard label={t("sectionRevenues") + " (" + t("kpiPlan").toLowerCase() + ")"} value={fmt(totalRevenuePlanned)} icon={<TrendingUp className="h-5 w-5" />} color="violet" hint={t("hintKpiRevPlan")}
          subValue={`${revenueLines.length} ${t("colCategory").toLowerCase()}`}
        />
        <ColorStatCard label={t("sectionRevenues") + " (" + t("kpiActual").toLowerCase() + ")"} value={fmt(totalRevenueActual)} icon={<DollarSign className="h-5 w-5" />} color="green" hint={t("hintKpiRevActual")}
          subValue={`${totalRevenuePlanned > 0 ? Math.round((totalRevenueActual / totalRevenuePlanned) * 100) : 0}% ${t("kpiExecution").toLowerCase()}`}
        />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("colForecast")}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ColorStatCard label={t("sectionExpenses") + " (" + t("colForecast").toLowerCase() + ")"} value={fmt(totalExpenseForecast)} icon={<TrendingUp className="h-5 w-5" />} color="indigo" hint={t("hintColForecast")}
          subValue={totalExpenseForecast !== totalExpensePlanned ? `${totalExpenseForecast > totalExpensePlanned ? "▲" : "▼"} ${Math.abs(Math.round(((totalExpenseForecast - totalExpensePlanned) / (totalExpensePlanned || 1)) * 100))}% vs ${t("kpiPlan").toLowerCase()}` : `= ${t("kpiPlan").toLowerCase()}`}
        />
        <ColorStatCard label={t("sectionRevenues") + " (" + t("colForecast").toLowerCase() + ")"} value={fmt(totalRevenueForecast)} icon={<TrendingUp className="h-5 w-5" />} color="indigo" hint={t("hintColForecast")}
          subValue={totalRevenueForecast !== totalRevenuePlanned ? `${totalRevenueForecast > totalRevenuePlanned ? "▲" : "▼"} ${Math.abs(Math.round(((totalRevenueForecast - totalRevenuePlanned) / (totalRevenuePlanned || 1)) * 100))}% vs ${t("kpiPlan").toLowerCase()}` : `= ${t("kpiPlan").toLowerCase()}`}
        />
        <ColorStatCard label={t("sectionMargin").split("(")[0].trim() + " (" + t("colForecast").toLowerCase() + ")"} value={fmt(marginForecast)} icon={<TrendingUp className="h-5 w-5" />} color={marginForecast >= 0 ? "indigo" : "red"} hint={t("hintColForecast")}
          subValue={marginForecast !== margin ? `${marginForecast > margin ? "▲" : "▼"} ${Math.abs(Math.round(((marginForecast - margin) / (margin || 1)) * 100))}% vs ${t("kpiPlan").toLowerCase()}` : `= ${t("kpiPlan").toLowerCase()}`}
        />
        <ColorStatCard label={t("kpiProjection")} value={fmt(yearEndProjection)} icon={<Target className="h-5 w-5" />} color="slate" hint={t("hintOvYearEnd")}
          subValue={`${t("colActual")} × ${Math.round(12 / Math.max(1, elapsedPct / 100 * 12))}x`}
        />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sectionMargin")} & {t("kpiExecution")}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ColorStatCard label={t("sectionMargin").split("(")[0].trim() + " (" + t("kpiPlan").toLowerCase() + ")"} value={fmt(margin)} icon={<TrendingUp className="h-5 w-5" />} color={margin >= 0 ? "teal" : "red"} hint={t("hintKpiMarginPlan")}
          subValue={`${t("sectionRevenues")} − ${t("sectionExpenses")}${totalCOGSPlanned > 0 ? " − COGS" : ""}`}
          lines={[
            { label: t("sectionRevenues"), value: fmt(totalRevenuePlanned) },
            { label: t("sectionExpenses"), value: fmt(totalExpensePlanned) },
          ]}
        />
        <ColorStatCard label={t("sectionMargin").split("(")[0].trim() + " (" + t("kpiActual").toLowerCase() + ")"} value={fmt(marginActual)} icon={<DollarSign className="h-5 w-5" />} color={marginActual >= 0 ? "teal" : "red"} hint={t("hintKpiMarginActual")}
          subValue={`${margin !== 0 ? Math.round((marginActual / margin) * 100) : 0}% ${t("kpiExecution").toLowerCase()}`}
          lines={[
            { label: t("sectionRevenues"), value: fmt(totalRevenueActual) },
            { label: t("sectionExpenses"), value: fmt(totalExpenseActual) },
          ]}
        />
        <ColorStatCard label={t("kpiVariance")} value={(totalVariance >= 0 ? "+" : "") + fmt(totalVariance)} icon={totalVariance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />} color={totalVariance >= 0 ? "teal" : "red"} hint={t("hintKpiVariance")}
          subValue={`${totalVariance >= 0 ? "▲" : "▼"} ${Math.abs(Math.round((totalVariance / (margin || 1)) * 100))}% ${margin !== 0 ? (totalVariance >= 0 ? t("kpiPlan").toLowerCase() : t("kpiPlan").toLowerCase()) : ""}`}
          lines={[
            { label: t("sectionExpenses"), value: (totalExpensePlanned - totalExpenseActual >= 0 ? "+" : "") + fmt(totalExpensePlanned - totalExpenseActual) },
            { label: t("sectionRevenues"), value: (totalRevenueActual - totalRevenuePlanned >= 0 ? "+" : "") + fmt(totalRevenueActual - totalRevenuePlanned) },
          ]}
        />
        <ColorStatCard
          label={t("kpiExecution")}
          value={`${budgetExecEmoji} ${Math.round(budgetExecPct)}%`}
          icon={budgetExecPct >= 50 ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          color={budgetExecColor}
          hint={t("kpiExecutionTooltip")}
          subValue={`${t("expectedByTime")}: ${Math.round(elapsedPct)}%`}
          lines={[
            { label: t("sectionExpenses"), value: `${Math.round(expExecPct)}%` },
            { label: t("sectionRevenues"), value: `${totalRevenuePlanned > 0 ? Math.round((totalRevenueActual / totalRevenuePlanned) * 100) : 0}%` },
          ]}
        />
      </div>

      {/* Overspend alert banner */}
      {overspendPct > 25 && (
        <div className="rounded-lg border-2 border-red-500 bg-red-100 dark:bg-red-900/50 dark:border-red-700 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-700 dark:text-red-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800 dark:text-red-200 text-sm">{t("alertOverspendTitle")}</p>
            <p className="text-red-700 dark:text-red-300 text-xs mt-0.5">
              {t("alertOverspendDesc", { pct: Math.round(overspendPct), amount: fmt(overspendAmount) })}
            </p>
          </div>
        </div>
      )}
      {overspendPct > 10 && overspendPct <= 25 && (
        <div className="rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">{t("alertWarningTitle")}</p>
            <p className="text-amber-600 dark:text-amber-300 text-xs mt-0.5">
              {t("alertWarningDesc", { pct: Math.round(overspendPct), amount: fmt(overspendAmount) })}
            </p>
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {(totalExpensePlanned > 0 || totalRevenuePlanned > 0) && (
        <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-sm text-muted-foreground">
          {totalExpenseActual > totalExpensePlanned ? (
            <span>{t("summaryOverspend", { period: analytics?.plan?.name ?? "", pct: Math.round(overspendPct), amount: fmt(overspendAmount) })}</span>
          ) : totalExpensePlanned > 0 ? (
            <span>{t("summaryUnderBudget", { period: analytics?.plan?.name ?? "", pct: Math.round(100 - expExecPct), amount: fmt(totalExpensePlanned - totalExpenseActual) })}</span>
          ) : null}
          {totalRevenuePlanned === 0 && totalExpensePlanned > 0 && (
            <span className="ml-1 text-amber-600 dark:text-amber-400">{t("summaryNoRevenue")}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          title={t("hintBtnAiAnalysis")}
          onClick={handleAINarrative}
          disabled={aiNarrative.isPending}
          className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white border-0 shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
        >
          {aiNarrative.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <span className="relative mr-1.5 flex h-4 w-4 items-center justify-center">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </span>
          )}
          {t("btnAiAnalysis")}
        </Button>
        {autoActualTotal > 0 && (
          <Button size="sm" variant="outline" title={t("hintBtnSyncActuals")} onClick={handleSync} disabled={syncActuals.isPending}>
            {syncActuals.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
            {t("btnUpdateActual")}
          </Button>
        )}
        <ApplyTemplatesButton planId={planId} />
        <a href={`/api/budgeting/export?planId=${planId}`} download>
          <Button size="sm" variant="outline" title={t("hintBtnExport")}><DollarSign className="h-4 w-4 mr-1" /> {t("btnExport")}</Button>
        </a>
        <div className="flex-1" />
        <Input placeholder={t("searchCategory")} title={t("hintSearchCategory")} value={filterText} onChange={e => setFilterText(e.target.value)} className="h-8 w-48 text-xs" />
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)} title={t("hintFilterType")} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="all">{t("filterAll")}</option>
          <option value="expense">{t("filterExpenses")}</option>
          <option value="revenue">{t("filterRevenues")}</option>
        </select>
        <Button size="sm" variant={showMaterialOnly ? "default" : "outline"} className="h-8 text-xs"
          onClick={() => setShowMaterialOnly(!showMaterialOnly)} title={t("hintFilterMaterial")}>
          {t("filterMaterial")}
        </Button>
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
              <thead className="sticky top-0 z-10 bg-[#1a3050] border-b-2 border-white/10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/90"><span className="inline-flex items-center gap-1.5">{t("colCategory")} <InfoHint text={t("hintColCategory")} size={12} /></span></th>
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70"><span className="inline-flex items-center gap-1.5">{t("colDepartment")} <InfoHint text={t("hintColDepartment")} size={12} /></span></th>
                  <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-sky-300"><span className="inline-flex items-center gap-1 justify-end">{t("colPlan")} ₼ <InfoHint text={t("hintColPlan")} size={12} /></span></th>
                  <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-300"><span className="inline-flex items-center gap-1 justify-end">{t("colActual")} ₼ <InfoHint text={t("hintColActual")} size={12} /></span></th>
                  <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-amber-300"><span className="inline-flex items-center gap-1 justify-end">{t("colVariancePct")} <InfoHint text={t("hintColVariance")} size={12} /></span></th>
                  <th className="px-2 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {renderGroupedSection(t("sectionRevenues"), revenueLines, totRevPlanned, "hintSectionRevenue", "revenue")}
                {revenueLines.length === 0 && (
                  <tr className="bg-amber-50/50 dark:bg-amber-950/10">
                    <td colSpan={6} className="px-4 py-2 text-xs text-amber-700 dark:text-amber-400 italic">
                      {t("hintAddRevenue")}
                    </td>
                  </tr>
                )}
                {renderGroupedSection(t("sectionCOGS"), cogsLines, totCOGSPlanned, "hintSectionCOGS", "cogs")}

                {/* Gross Profit row */}
                {(revenueLines.length > 0 || cogsLines.length > 0) && (
                  <tr className="border-y-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10">
                    <td className="px-3 py-2" colSpan={2}>
                      <div className="font-bold text-sm">{t("grossProfit")}</div>
                      <div className="text-[10px] text-muted-foreground/60 font-normal">{t("hintGrossProfit")}</div>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold">{fmt(totRevPlanned - totCOGSPlanned)}</td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold text-[#065f46] dark:text-[#6ee7b7]">{fmt(totRevActual - totCOGSActual)}</td>
                    <td colSpan={2} />
                  </tr>
                )}

                {renderGroupedSection(t("sectionExpenses"), expenseLines, totExpPlanned, "hintSectionExpenses", "expense")}

                {/* Operating Profit row */}
                {(expenseLines.length > 0 || revenueLines.length > 0 || cogsLines.length > 0) && (
                  <tr className="border-y-2 border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10">
                    <td className="px-3 py-2" colSpan={2}>
                      <div className="font-bold text-sm">{t("operatingProfit")}</div>
                      <div className="text-[10px] text-muted-foreground/60 font-normal">{t("hintOperatingProfit")}</div>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold">{fmt(totRevPlanned - totCOGSPlanned - totExpPlanned)}</td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold text-[#065f46] dark:text-[#6ee7b7]">{fmt(totRevActual - totCOGSActual - totExpActual)}</td>
                    <td colSpan={2} />
                  </tr>
                )}

                {/* Empty state */}
                {lines.length === 0 && !addingSection && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      {t("emptyNoLines")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts — separate for expenses and revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {expenseBarData.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">{t("sectionExpenses")}: {t("colPlan")} vs {t("colActual")} <InfoHint text={t("hintChartExpenses")} size={14} /></CardTitle>
                {expenseAllData.length > MAX_CHART_ITEMS + 1 && (
                  <span className="text-[10px] text-muted-foreground">Top {MAX_CHART_ITEMS} + прочие</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={Math.min(420, Math.max(220, expenseBarData.length * 44))}>
                <BarChart data={expenseBarData} layout="vertical" margin={{ left: 10, right: 70, top: 5, bottom: 5 }}>
                  <defs>
                    <HBarGradient id="exp-plan-grad" color={BUDGET_COLORS.expensePlan} />
                    <HBarGradient id="exp-actual-grad" color={BUDGET_COLORS.expenseActual} />
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" horizontal={false} vertical={true} />
                  <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v: number) => fmtK(v)} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={140} axisLine={false} tickLine={false} />
                  <Tooltip content={<BudgetChartTooltip mode="plan-vs-actual" planKey={planLabel} actualKey={actualLabel} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey={planLabel} fill="url(#exp-plan-grad)" radius={[0, 4, 4, 0]} animationDuration={ANIMATION.duration} animationEasing={ANIMATION.easing} barSize={14} />
                  <Bar dataKey={actualLabel} fill="url(#exp-actual-grad)" radius={[0, 4, 4, 0]} animationDuration={ANIMATION.duration} animationEasing={ANIMATION.easing} barSize={14}>
                    <LabelList content={(props: any) => <BudgetBarLabel {...props} horizontal />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <BudgetChartLegend items={[
                { label: planLabel, color: BUDGET_COLORS.expensePlan, total: expenseBarData.reduce((s: number, d: any) => s + (d[planLabel] || 0), 0) },
                { label: actualLabel, color: BUDGET_COLORS.expenseActual, total: expenseBarData.reduce((s: number, d: any) => s + (d[actualLabel] || 0), 0) },
              ]} />
            </CardContent>
          </Card>
        )}
        {revenueBarData.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">{t("sectionRevenues")}: {t("colPlan")} vs {t("colActual")} <InfoHint text={t("hintChartRevenues")} size={14} /></CardTitle>
                {revenueAllData.length > MAX_CHART_ITEMS + 1 && (
                  <span className="text-[10px] text-muted-foreground">Top {MAX_CHART_ITEMS} + прочие</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={Math.min(420, Math.max(220, revenueBarData.length * 44))}>
                <BarChart data={revenueBarData} layout="vertical" margin={{ left: 10, right: 70, top: 5, bottom: 5 }}>
                  <defs>
                    <HBarGradient id="rev-plan-grad" color={BUDGET_COLORS.revenuePlan} />
                    <HBarGradient id="rev-actual-grad" color={BUDGET_COLORS.revenueActual} />
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" horizontal={false} vertical={true} />
                  <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v: number) => fmtK(v)} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={140} axisLine={false} tickLine={false} />
                  <Tooltip content={<BudgetChartTooltip mode="plan-vs-actual" planKey={planLabel} actualKey={actualLabel} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey={planLabel} fill="url(#rev-plan-grad)" radius={[0, 4, 4, 0]} animationDuration={ANIMATION.duration} animationEasing={ANIMATION.easing} barSize={14} />
                  <Bar dataKey={actualLabel} fill="url(#rev-actual-grad)" radius={[0, 4, 4, 0]} animationDuration={ANIMATION.duration} animationEasing={ANIMATION.easing} barSize={14}>
                    <LabelList content={(props: any) => <BudgetBarLabel {...props} horizontal />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <BudgetChartLegend items={[
                { label: planLabel, color: BUDGET_COLORS.revenuePlan, total: revenueBarData.reduce((s: number, d: any) => s + (d[planLabel] || 0), 0) },
                { label: actualLabel, color: BUDGET_COLORS.revenueActual, total: revenueBarData.reduce((s: number, d: any) => s + (d[actualLabel] || 0), 0) },
              ]} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Waterfall Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-1.5">Waterfall: {t("kpiPlan")} → {t("kpiForecast")} → {t("colActual")} → {t("kpiProjection")} <InfoHint text={t("hintWaterfall")} size={14} /></CardTitle></CardHeader>
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

      {/* Drill-down Sheet for fact values */}
      <Sheet open={!!drillDownLine} onOpenChange={open => { if (!open) setDrillDownLine(null) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("drillDownTitle")}: {drillDownLine?.category}</SheetTitle>
            <SheetDescription className="sr-only">{t("drillDownTitle")}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {drillDownLine?.isAutoActual ? (
              <div className="space-y-2">
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30">{t("costModelSource")}</Badge>
                <div className="text-sm text-muted-foreground">{t("costModelKey")}: <code className="bg-muted px-1 rounded">{drillDownLine.costModelKey || "—"}</code></div>
                <div className="text-lg font-mono font-bold">{fmt(autoActualMap.get(drillDownLine.category) ?? 0)}</div>
              </div>
            ) : (
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1.5 text-xs font-medium">{t("colDate")}</th>
                      <th className="text-left py-1.5 text-xs font-medium">{t("colDescription")}</th>
                      <th className="text-right py-1.5 text-xs font-medium">{t("colAmount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(drillDownLine ? (actualsByCat.get(`${drillDownLine.category}||${drillDownLine.lineType}`)?.items ?? []) : []).map(a => (
                      <tr key={a.id} className="border-b border-border/30">
                        <td className="py-1.5 text-xs">{a.expenseDate || "—"}</td>
                        <td className="py-1.5 text-xs">{a.description || "—"}</td>
                        <td className="py-1.5 text-right font-mono text-xs">{fmt(a.actualAmount)}</td>
                      </tr>
                    ))}
                    {drillDownLine && (actualsByCat.get(`${drillDownLine.category}||${drillDownLine.lineType}`)?.items ?? []).length === 0 && (
                      <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-xs italic">{t("noActuals")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Variance note Dialog */}
      <Dialog open={!!varianceNoteLine} onOpenChange={open => { if (!open) setVarianceNoteLine(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("varianceNoteTitle")}: {varianceNoteLine?.category}</DialogTitle>
            <DialogDescription className="sr-only">{t("varianceNotePlaceholder")}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("varianceNotePlaceholder")}
            value={varianceNoteText}
            onChange={e => setVarianceNoteText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVarianceNoteLine(null)}>{t("btnCancel")}</Button>
            <Button onClick={() => {
              if (varianceNoteLine) {
                updateLine.mutate({ id: varianceNoteLine.id, planId, notes: varianceNoteText })
                setVarianceNoteLine(null)
              }
            }}>{t("btnSave")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  const { totalPlanned, totalForecast, totalActual, totalVariance, executionPct, expenseExecutionPct = 0, yearEndProjection, byCategory, byDepartment, autoActualTotal, totalExpensePlanned = 0, totalExpenseActual = 0 } = analytics

  // Expense execution: <100% = under budget (green), 100-110% = warning, >110% = overspend (red)
  const expExecPct = expenseExecutionPct || (totalExpensePlanned > 0 ? (totalExpenseActual / totalExpensePlanned) * 100 : 0)
  const execEmoji = expExecPct <= 100 ? "🟢" : expExecPct <= 110 ? "🟡" : "🔴"

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
  const barData = byCategory.slice(0, 14).map(c => {
    const suffix = c.lineType === "revenue" ? " ↑" : " ↓"
    const name = (c.category.length > 14 ? c.category.slice(0, 14) + "…" : c.category) + suffix
    return { name, [ovPlanLabel]: Math.round(c.planned), [ovForecastLabel]: Math.round(c.forecast), [ovActualLabel]: Math.round(c.actual) }
  })

  const pieData = byCategory
    .filter(c => c.planned > 0)
    .sort((a, b) => b.planned - a.planned)
    .slice(0, 8)
    .map(c => ({ name: c.category.length > 18 ? c.category.slice(0, 18) + "…" : c.category, value: Math.round(c.planned) }))

  return (
    <div className="space-y-6">
      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <ColorStatCard label={t("kpiPlan")} value={fmt(totalPlanned)} icon={<BarChart2 className="h-5 w-5" />} color="blue" hint={t("hintOvPlan")} />
        <ColorStatCard label={t("kpiForecast")} value={fmt(totalForecast)} icon={<TrendingUp className="h-5 w-5" />} color="violet" hint={t("hintOvForecast")} />
        <ColorStatCard
          label={autoActualTotal > 0 ? t("kpiActualCostModel") : t("kpiActual")}
          value={fmt(totalActual)}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
          hint={t("hintOvActual")}
        />
        <ColorStatCard
          label={t("kpiVariance")}
          value={(totalVariance >= 0 ? "+" : "") + fmt(totalVariance)}
          icon={totalVariance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          color={totalVariance >= 0 ? "teal" : "red"}
          hint={t("hintOvVariance")}
        />
        <ColorStatCard
          label={t("kpiYearEnd")}
          value={fmt(yearEndProjection)}
          icon={<CalendarRange className="h-5 w-5" />}
          color="amber"
          hint={t("hintOvYearEnd")}
        />
      </div>

      {/* Action buttons: AI narrative + sync actuals */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={handleAINarrative}
          disabled={aiNarrative.isPending}
          className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white border-0 shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
        >
          {aiNarrative.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <span className="relative mr-1.5 flex h-4 w-4 items-center justify-center">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </span>
          )}
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
      <div className="flex items-center gap-3 text-sm" title={t("kpiExecutionTooltip")}>
        <span className="text-muted-foreground">{t("budgetExecution")}</span>
        <span className={`font-bold text-lg ${expExecPct <= 100 ? "text-[#065f46] dark:text-[#6ee7b7]" : expExecPct <= 110 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
          {execEmoji} {Math.round(expExecPct)}%
        </span>
        {expExecPct <= 100
          ? <CheckCircle className="h-4 w-4 text-[#065f46] dark:text-[#6ee7b7]" />
          : <AlertCircle className="h-4 w-4 text-red-500" />}
        {expExecPct > 110 && <span className="text-xs font-bold text-red-500 uppercase">{t("overspend")}</span>}
      </div>

      {/* Charts */}
      {barData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t("chartPlanForecastActual")}</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={Math.max(300, barData.length * 40)}>
                <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 70, top: 5, bottom: 5 }}>
                  <defs>
                    <HBarGradient id="ov-plan-grad" color={BUDGET_COLORS.planIndigo} />
                    <HBarGradient id="ov-forecast-grad" color={BUDGET_COLORS.forecastAmber} />
                    <HBarGradient id="ov-actual-grad" color={BUDGET_COLORS.actualGreen} />
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" horizontal={false} vertical={true} />
                  <XAxis type="number" tick={AXIS_TICK} tickFormatter={v => fmtK(v)} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={140} axisLine={false} tickLine={false} />
                  <Tooltip content={<BudgetChartTooltip mode="plan-forecast-actual" planKey={ovPlanLabel} actualKey={ovActualLabel} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey={ovPlanLabel} fill="url(#ov-plan-grad)" radius={[0, 4, 4, 0]} animationDuration={ANIMATION.duration} animationEasing={ANIMATION.easing} barSize={12} />
                  <Bar dataKey={ovForecastLabel} fill="url(#ov-forecast-grad)" radius={[0, 4, 4, 0]} animationDuration={ANIMATION.duration} animationEasing={ANIMATION.easing} barSize={12} />
                  <Bar dataKey={ovActualLabel} fill="url(#ov-actual-grad)" radius={[0, 4, 4, 0]} animationDuration={ANIMATION.duration} animationEasing={ANIMATION.easing} barSize={12}>
                    <LabelList content={(props: any) => <BudgetBarLabel {...props} horizontal />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <BudgetChartLegend items={[
                { label: ovPlanLabel, color: BUDGET_COLORS.planIndigo },
                { label: ovForecastLabel, color: BUDGET_COLORS.forecastAmber },
                { label: ovActualLabel, color: BUDGET_COLORS.actualGreen },
              ]} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t("chartExpenseComposition")}</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <defs>
                    {PIE_COLORS.map((color: string, i: number) => (
                      <linearGradient key={i} id={`pie-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.85} />
                        <stop offset="100%" stopColor={color} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    animationDuration={ANIMATION.duration}
                    animationEasing={ANIMATION.easing}
                    stroke="none"
                  >
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={`url(#pie-grad-${i % PIE_COLORS.length})`} />
                    ))}
                  </Pie>
                  {/* Center label */}
                  <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground" fontSize={11}>
                    {t("kpiPlan")}
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" className="fill-foreground" fontSize={14} fontWeight="bold">
                    {fmt(totalPlanned)}
                  </text>
                  <Tooltip content={<BudgetChartTooltip mode="composition" totalValue={totalPlanned} />} />
                </PieChart>
              </ResponsiveContainer>
              <BudgetChartLegend items={pieData.map((d: any, i: number) => ({
                label: d.name,
                color: PIE_COLORS[i % PIE_COLORS.length] as string,
                total: d.value,
              }))} />
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
                <thead className="bg-[#1a3050] border-b-2 border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/90">{t("colCategory")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">{t("colType")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-sky-300">{t("colBudget")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-purple-300">{t("colForecast")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-300">{t("colActual")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-amber-300">{t("colVariance")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-amber-300">%</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2">{row.category}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs">
                          {row.lineType === "revenue" ? t("revenue") : row.lineType === "cogs" ? t("cogs") : t("expense")}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(row.planned)}</td>
                      <td className="px-4 py-2 text-right font-mono text-purple-600 dark:text-purple-400">{fmt(row.forecast)}</td>
                      <td className="px-4 py-2 text-right font-mono text-[#065f46] dark:text-[#6ee7b7]">{fmt(row.actual)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${row.variance >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-500"}`}>
                        {row.variance >= 0 ? "+" : ""}{fmt(row.variance)}
                      </td>
                      <td className={`px-4 py-2 text-right ${row.variancePct >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-500"}`}>
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
                <thead className="bg-[#1a3050] border-b-2 border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/90">{t("colDepartment")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-sky-300">{t("colBudget")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-purple-300">{t("colForecast")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-300">{t("colActual")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-amber-300">{t("colVariance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {byDepartment.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{row.department}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(row.planned)}</td>
                      <td className="px-4 py-2 text-right font-mono text-purple-600 dark:text-purple-400">{fmt(row.forecast)}</td>
                      <td className="px-4 py-2 text-right font-mono text-[#065f46] dark:text-[#6ee7b7]">{fmt(row.actual)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${row.variance >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-500"}`}>
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
                <thead className="bg-[#1a3050] border-b-2 border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/90">{t("colCategory")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">{t("colDepartmentShort")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">{t("colType")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-sky-300">{t("colBudget")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-purple-300">{t("colForecast")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-300">{t("colCostModel")}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/70">{t("colAutoActual")}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/70">{t("colActions")}</th>
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
                              {line.lineType === "revenue" ? t("revenue") : line.lineType === "cogs" ? t("cogs") : t("expense")}
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
                <thead className="bg-[#1a3050] border-b-2 border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/90">{t("colCategory")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">{t("colDepartment")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">{t("colType")}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-300">{t("colAmount")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">{t("colDate")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">{t("colDescription")}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/70">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(actual => (
                    <tr key={actual.id} className="border-t border-border/50 hover:bg-muted/30">
                      {editId === actual.id ? (
                        <>
                          <td className="px-2 py-1"><Input value={editData.category} onChange={e => setEditData(d => ({ ...d, category: e.target.value }))} className="h-7 text-xs" /></td>
                          <td className="px-2 py-1"><Input value={editData.department} onChange={e => setEditData(d => ({ ...d, department: e.target.value }))} className="h-7 text-xs" /></td>
                          <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{actual.lineType === "revenue" ? t("revenue") : actual.lineType === "cogs" ? t("cogs") : t("expense")}</Badge></td>
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
                              {actual.lineType === "revenue" ? t("revenue") : actual.lineType === "cogs" ? t("cogs") : t("expense")}
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
                {/* Approval info */}
                {plan.approvedAt && (
                  <p className="text-xs text-muted-foreground mt-1">{t("statusApproved")}: {new Date(plan.approvedAt).toLocaleDateString()}</p>
                )}
                {plan.submittedAt && !plan.approvedAt && (
                  <p className="text-xs text-muted-foreground mt-1">{t("statusPending")}: {new Date(plan.submittedAt).toLocaleDateString()}</p>
                )}
                {plan.status === "rejected" && plan.rejectedReason && (
                  <p className="text-xs text-red-500 mt-1">{t("statusRejected")}: {plan.rejectedReason}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant={activePlanId === plan.id ? "default" : "outline"}
                    onClick={() => onSelect(plan.id)} className="flex-1 text-xs">
                    {activePlanId === plan.id ? t("btnActive") : t("btnSelect")}
                  </Button>
                  {plan.status === "draft" && (
                    <Button size="sm" variant="outline" className="text-xs" title={t("hintBtnSubmitApproval")}
                      onClick={() => updatePlan.mutate({ id: plan.id, status: "pending_approval" })}>
                      {t("btnSubmitApproval")}
                    </Button>
                  )}
                  {plan.status === "pending_approval" && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs text-green-600 border-green-300 hover:bg-green-50" title={t("hintBtnApprove")}
                        onClick={() => {
                          if (confirm(t("confirmApprove"))) {
                            updatePlan.mutate({ id: plan.id, status: "approved" })
                          }
                        }}>
                        {t("btnApprove")}
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-300 hover:bg-red-50" title={t("hintBtnReject")}
                        onClick={() => {
                          const reason = prompt(t("rejectReason"))
                          if (reason !== null) {
                            updatePlan.mutate({ id: plan.id, status: "rejected", rejectedReason: reason || undefined })
                          }
                        }}>
                        {t("btnReject")}
                      </Button>
                    </>
                  )}
                  {plan.status === "approved" && (
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => updatePlan.mutate({ id: plan.id, status: "closed" })}>
                      {t("statusClosed")}
                    </Button>
                  )}
                  {plan.status === "rejected" && (
                    <Button size="sm" variant="outline" className="text-xs" title={t("hintBtnRevise")}
                      onClick={() => updatePlan.mutate({ id: plan.id, status: "draft" })}>
                      {t("btnRevise")}
                    </Button>
                  )}
                  {(plan.status === "draft" || plan.status === "rejected") && (
                    <button onClick={() => deletePlan.mutate(plan.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 border border-border">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
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

const COMPARISON_COLORS = BUDGET_COLORS.comparison

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
          <Card className="overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t("chartComparisonByCategory")}</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={chartData} margin={{ left: 10, right: 10, top: 20, bottom: 5 }}>
                  <defs>
                    {selectedIds.map((_, i) => (
                      <VBarGradient key={i} id={`comp-grad-${i}`} color={COMPARISON_COLORS[i]} />
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" horizontal={true} vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-25} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} tickFormatter={(v: number) => fmtK(v)} axisLine={false} tickLine={false} />
                  <Tooltip content={<BudgetChartTooltip mode="comparison" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  {selectedIds.map((id, i) => {
                    const planName = plans.find(p => p.id === id)?.name || `${t("colPlan")} ${i + 1}`
                    return (
                      <Bar
                        key={id}
                        dataKey={planName}
                        fill={`url(#comp-grad-${i})`}
                        radius={[4, 4, 0, 0]}
                        animationDuration={ANIMATION.duration}
                        animationEasing={ANIMATION.easing}
                        barSize={24}
                      >
                        <LabelList content={(props: any) => <BudgetBarLabel {...props} horizontal={false} />} />
                      </Bar>
                    )
                  })}
                </BarChart>
              </ResponsiveContainer>
              <BudgetChartLegend items={selectedIds.map((id, i) => ({
                label: plans.find(p => p.id === id)?.name || `${t("colPlan")} ${i + 1}`,
                color: COMPARISON_COLORS[i],
              }))} />
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
                  <thead className="bg-[#1a3050] border-b-2 border-white/10">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/90 sticky left-0 bg-[#1a3050]">{t("colCategory")}</th>
                      {selectedIds.map((id, i) => {
                        const name = plans.find(p => p.id === id)?.name || `${t("colPlan")} ${i + 1}`
                        return [
                          <th key={`${id}-p`} className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: COMPARISON_COLORS[i] }}>{name} {t("colBudget")}</th>,
                          <th key={`${id}-a`} className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: COMPARISON_COLORS[i] }}>{name} {t("colActual")}</th>,
                          <th key={`${id}-v`} className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: COMPARISON_COLORS[i] }}>{t("colVarianceShort")} %</th>,
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
                          <td key={`${row.category}-p${i}-v`} className={`px-2 py-1.5 text-right font-mono font-bold ${(row[`p${i}_variance`] ?? 0) >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-500"}`}>
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
                          <td key={`total-p${i}-v`} className={`px-2 py-2 text-right font-mono font-bold ${(a?.totalVariance ?? 0) >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-500"}`}>
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
  const collapsedInitRef = React.useRef(false)
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

  const byCategory = analytics?.byCategory ?? []

  // Filter out parent-only rows (planned=0 with children represented by parentCategory)
  const parentCategories = new Set(byCategory.filter(c => c.parentCategory).map(c => c.parentCategory!))
  const leafRows = byCategory.filter(c => !parentCategories.has(c.category) || c.parentCategory)

  // Group categories by section
  const revRows = leafRows.filter(c => c.lineType === "revenue")
  const cogsRows = leafRows.filter(c => c.lineType === "cogs")
  const expRows = leafRows.filter(c => c.lineType === "expense")

  // Build grouped structure: { parentCategory → children[] }
  const buildGrouped = (rows: typeof byCategory) => {
    const groups: { parent: string; children: typeof byCategory }[] = []
    const standalone: typeof byCategory = []
    const groupMap = new Map<string, typeof byCategory>()

    for (const r of rows) {
      if (r.parentCategory) {
        const existing = groupMap.get(r.parentCategory) ?? []
        existing.push(r)
        groupMap.set(r.parentCategory, existing)
      } else {
        standalone.push(r)
      }
    }

    for (const [parent, children] of groupMap) {
      groups.push({ parent, children })
    }

    return { groups, standalone }
  }

  const expGrouped = buildGrouped(expRows)
  const revGrouped = buildGrouped(revRows)
  const cogsGrouped = buildGrouped(cogsRows)

  // Collapse all sections and groups by default (run once when data loads)
  const categoryCount = byCategory.length
  const sectionCount = sections.length
  React.useEffect(() => {
    if (collapsedInitRef.current || categoryCount === 0) return
    collapsedInitRef.current = true
    setCollapsed(prev => {
      const ids = new Set(prev)
      ids.add("auto-revenue")
      ids.add("auto-cogs")
      ids.add("auto-expense")
      // Groups and custom sections will be collapsed as they appear
      return ids
    })
  }, [categoryCount, sectionCount])

  if (analyticsLoading || sectionsLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  }

  const totalRevenuePlanned = revRows.reduce((s, r) => s + r.planned, 0)
  const totalRevenueActual = revRows.reduce((s, r) => s + r.actual, 0)
  const totalCOGSPlanned = cogsRows.reduce((s, r) => s + r.planned, 0)
  const totalCOGSActual = cogsRows.reduce((s, r) => s + r.actual, 0)
  const totalExpensePlanned = expRows.reduce((s, r) => s + r.planned, 0)
  const totalExpenseActual = expRows.reduce((s, r) => s + r.actual, 0)
  const grossProfitPlanned = totalRevenuePlanned - totalCOGSPlanned
  const grossProfitActual = totalRevenueActual - totalCOGSActual

  const renderSection = (title: string, rows: typeof byCategory, sectionId: string, isCalculated = false, calcPlanned = 0, calcActual = 0, grouped?: { groups: { parent: string; children: typeof byCategory }[]; standalone: typeof byCategory }) => {
    const isCollapsed = collapsed.has(sectionId)
    return (
      <div key={sectionId} className="border border-border rounded-lg overflow-hidden mb-3">
        <div
          className={`flex items-center justify-between px-4 py-3 cursor-pointer ${isCalculated ? "bg-blue-50 dark:bg-blue-950/30" : "bg-muted/40"}`}
          onClick={() => toggleCollapse(sectionId)}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {title}
          </div>
          <div className="flex gap-8 text-sm font-mono font-bold">
            <span>{fmt(isCalculated ? calcPlanned : rows.reduce((s, r) => s + r.planned, 0))}</span>
            <span className={`${(isCalculated ? calcActual : rows.reduce((s, r) => s + r.actual, 0)) >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-600 dark:text-red-400"}`}>
              {fmt(isCalculated ? calcActual : rows.reduce((s, r) => s + r.actual, 0))}
            </span>
          </div>
        </div>
        {!isCollapsed && !isCalculated && (
          <table className="w-full text-sm">
            <thead className="bg-[#1a3050] border-b-2 border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/90">{t("colCategory")}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-sky-300">{t("colBudget")}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-purple-300">{t("colForecast")}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-300">{t("colActual")}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-amber-300">{t("colVarianceShort")}</th>
              </tr>
            </thead>
            <tbody>
              {grouped ? (
                <>
                  {grouped.groups.map(g => {
                    const gPlanned = g.children.reduce((s, r) => s + r.planned, 0)
                    const gForecast = g.children.reduce((s, r) => s + r.forecast, 0)
                    const gActual = g.children.reduce((s, r) => s + r.actual, 0)
                    const gVariance = g.children.reduce((s, r) => s + r.variance, 0)
                    const isGroupOpen = !collapsed.has(`pl-group-${g.parent}`)
                    return (
                      <React.Fragment key={g.parent}>
                        <tr className="border-t border-border/30 bg-muted/10 cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleCollapse(`pl-group-${g.parent}`)}>
                          <td className="px-4 py-2 font-semibold flex items-center gap-2">
                            {isGroupOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            {g.parent}
                            <Badge variant="outline" title={t("hintBadgeChildCount")} className="text-[10px] px-1 py-0">{g.children.length}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm font-bold">{fmt(gPlanned)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm font-bold">{fmt(gForecast)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm font-bold">{fmt(gActual)}</td>
                          <td className={`px-4 py-2.5 text-right font-mono text-sm font-bold ${gVariance >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-600 dark:text-red-400"}`}>
                            {gVariance >= 0 ? "+" : ""}{fmt(gVariance)}
                          </td>
                        </tr>
                        {isGroupOpen && g.children.map((row, i) => (
                          <tr key={i} className="border-t border-border/20 hover:bg-muted/20 cursor-pointer" onClick={() => setDrilldown(drilldown === row.category ? null : row.category)}>
                            <td className="px-4 py-1.5 pl-10 text-muted-foreground flex items-center gap-1">
                              {drilldown === row.category && <span className="text-blue-500">▶</span>}
                              — {row.category}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-sm">{fmt(row.planned)}</td>
                            <td className="px-4 py-2 text-right font-mono text-sm">{fmt(row.forecast)}</td>
                            <td className="px-4 py-2 text-right font-mono text-sm">{fmt(row.actual)}</td>
                            <td className={`px-4 py-2 text-right font-mono text-sm font-semibold ${row.variance >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-600 dark:text-red-400"}`}>
                              {row.variance >= 0 ? "+" : ""}{fmt(row.variance)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })}
                  {grouped.standalone.map((row, i) => (
                    <tr key={`s-${i}`} className="border-t border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => setDrilldown(drilldown === row.category ? null : row.category)}>
                      <td className="px-4 py-2 flex items-center gap-1">
                        {drilldown === row.category && <span className="text-blue-500">▶</span>}
                        {row.category}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm">{fmt(row.planned)}</td>
                      <td className="px-4 py-2 text-right font-mono text-sm">{fmt(row.forecast)}</td>
                      <td className="px-4 py-2 text-right font-mono text-sm">{fmt(row.actual)}</td>
                      <td className={`px-4 py-2 text-right font-mono text-sm font-semibold ${row.variance >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-600 dark:text-red-400"}`}>
                        {row.variance >= 0 ? "+" : ""}{fmt(row.variance)}
                      </td>
                    </tr>
                  ))}
                </>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-t border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => setDrilldown(drilldown === row.category ? null : row.category)}>
                    <td className="px-4 py-2 flex items-center gap-1">
                      {drilldown === row.category && <span className="text-blue-500">▶</span>}
                      {row.category}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{fmt(row.planned)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-purple-600 dark:text-purple-400">{fmt(row.forecast)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-[#065f46] dark:text-[#6ee7b7]">{fmt(row.actual)}</td>
                    <td className={`px-4 py-2 text-right font-mono text-xs font-medium ${row.variance >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-500"}`}>
                      {row.variance >= 0 ? "+" : ""}{fmt(row.variance)}
                    </td>
                  </tr>
                ))
              )}
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

      {/* Auto-generated P&L — Income Statement */}
      {renderSection(t("plRevenue"), revRows, "auto-revenue", false, 0, 0, revGrouped)}
      {renderSection(t("sectionCOGS"), cogsRows, "auto-cogs", false, 0, 0, cogsGrouped)}

      {/* Gross Profit = Revenue - COGS */}
      <div className="border-2 border-emerald-500 dark:border-emerald-600 rounded-lg overflow-hidden mb-3 bg-white dark:bg-emerald-950/40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="font-bold text-base">{t("grossProfit")}</div>
          <div className="flex gap-8 font-mono font-bold text-base">
            <span>{fmt(grossProfitPlanned)}</span>
            <span className={grossProfitActual >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-600 dark:text-red-400"}>{fmt(grossProfitActual)}</span>
          </div>
        </div>
        {totalRevenuePlanned > 0 && (
          <div className="px-4 pb-2 text-xs text-muted-foreground">
            Gross Margin: {((grossProfitPlanned / totalRevenuePlanned) * 100).toFixed(1)}% (план) / {totalRevenueActual > 0 ? ((grossProfitActual / totalRevenueActual) * 100).toFixed(1) : "—"}% (факт)
          </div>
        )}
      </div>

      {renderSection(t("plExpenses"), expRows, "auto-expense", false, 0, 0, expGrouped)}

      {/* Operating Profit (EBITDA) = Gross Profit - OpEx */}
      {(() => {
        const opProfitPlanned = grossProfitPlanned - totalExpensePlanned
        const opProfitActual = grossProfitActual - totalExpenseActual
        return (
          <div className="border-2 border-slate-400 dark:border-slate-500 rounded-lg overflow-hidden mb-3 bg-slate-50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="font-bold text-base">{t("operatingProfit")} (EBITDA)</div>
              <div className="flex gap-8 font-mono font-bold text-base">
                <span>{fmt(opProfitPlanned)}</span>
                <span className={opProfitActual >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-600 dark:text-red-400"}>{fmt(opProfitActual)}</span>
              </div>
            </div>
            {totalRevenuePlanned > 0 && (
              <div className="px-4 pb-2 text-xs text-muted-foreground">
                EBITDA Margin: {((opProfitPlanned / totalRevenuePlanned) * 100).toFixed(1)}% (план) / {totalRevenueActual > 0 ? ((opProfitActual / totalRevenueActual) * 100).toFixed(1) : "—"}% (факт)
              </div>
            )}
          </div>
        )
      })()}

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
                  <div><p className="text-xs text-muted-foreground">{t("colActual")}</p><p className="font-bold font-mono text-[#065f46] dark:text-[#6ee7b7]">{fmt(row.actual)}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("colVariance")}</p>
                    <p className={`font-bold font-mono ${row.variance >= 0 ? "text-[#065f46] dark:text-[#6ee7b7]" : "text-red-500"}`}>
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

// ─── Forecast Tab (Monthly Matrix) ───────────────────────────────────────────

function ForecastTab({ planId }: { planId: string }) {
  const t = useTranslations("budgeting")
  const { data: analytics, isLoading: analyticsLoading } = useBudgetAnalytics(planId)
  const { data: forecastEntries = [] } = useBudgetForecastEntries(planId)
  const { data: budgetLines = [], isLoading: linesLoading } = useBudgetLines(planId)
  const upsertForecast = useUpsertBudgetForecast()
  const createLine = useCreateBudgetLine()

  const [editCell, setEditCell] = useState<{ category: string; lineType: string; month: number } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [addingRevenue, setAddingRevenue] = useState(false)
  const [addingCogs, setAddingCogs] = useState(false)
  const [addingExpense, setAddingExpense] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())
  const [scenario, setScenario] = useState<"base" | "optimistic" | "pessimistic">("base")

  const plan = analytics?.plan
  const year = plan?.year ?? new Date().getFullYear()

  // Determine months for this period
  const months = useMemo(() => {
    if (!plan) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    if (plan.periodType === "quarterly" && plan.quarter) {
      const start = (plan.quarter - 1) * 3 + 1
      return [start, start + 1, start + 2]
    }
    if (plan.periodType === "monthly" && plan.month) {
      return [plan.month]
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  }, [plan])

  const periodMonths = months.length

  const monthLabels = useMemo(() => {
    const all = t("monthsShort").split(",")
    return months.map(m => all[m - 1] || `M${m}`)
  }, [months, t])

  // Build forecast lookup: category+lineType+month -> forecastAmount
  const forecastMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of forecastEntries) {
      if (e.category === "__total__") continue
      const lt = (e as any).lineType || "expense"
      const key = `${e.category}||${lt}||${e.month}`
      m.set(key, (m.get(key) ?? 0) + e.forecastAmount)
    }
    return m
  }, [forecastEntries])

  // Build lines map for default values (includes children)
  const linesMap = useMemo(() => {
    const m = new Map<string, BudgetLine>()
    for (const l of budgetLines) {
      m.set(l.category, l)
      if (l.children) {
        for (const c of l.children) m.set(c.category, c)
      }
    }
    return m
  }, [budgetLines])

  const revenueLines = useMemo(() => budgetLines.filter((l: BudgetLine) => l.lineType === "revenue"), [budgetLines])
  const cogsLines = useMemo(() => budgetLines.filter((l: BudgetLine) => l.lineType === "cogs"), [budgetLines])
  const expenseLines = useMemo(() => budgetLines.filter((l: BudgetLine) => l.lineType === "expense"), [budgetLines])

  // Scenario multiplier
  const getScenarioMultiplier = (lineType: string): number => {
    if (scenario === "base") return 1.0
    if (scenario === "optimistic") {
      return lineType === "revenue" ? 1.10 : lineType === "cogs" ? 0.92 : 0.90
    }
    // pessimistic
    return lineType === "revenue" ? 0.90 : lineType === "cogs" ? 1.10 : 1.15
  }

  // Get cell value: saved forecast or default (planned / periodMonths), with scenario
  const getCellValue = (category: string, lineType: string, month: number): { value: number; isDefault: boolean } => {
    const key = `${category}||${lineType}||${month}`
    const saved = forecastMap.get(key)
    const multiplier = getScenarioMultiplier(lineType)
    if (saved !== undefined) return { value: saved * multiplier, isDefault: false }
    const line = linesMap.get(category)
    if (line) return { value: (line.plannedAmount / periodMonths) * multiplier, isDefault: true }
    return { value: 0, isDefault: true }
  }

  // Row total
  const getRowTotal = (category: string, lineType: string): number => {
    return months.reduce((s, m) => s + getCellValue(category, lineType, m).value, 0)
  }

  // Get all leaf lines from a set (expanding parent→children)
  const getLeafLines = (lines: BudgetLine[]): BudgetLine[] => {
    const result: BudgetLine[] = []
    for (const l of lines) {
      if (l.children?.length) {
        result.push(...l.children)
      } else {
        result.push(l)
      }
    }
    return result
  }

  // Column total for a set of lines (uses leaf lines to avoid double-counting)
  const getColTotal = (lines: BudgetLine[], month: number): number => {
    return getLeafLines(lines).reduce((s, l) => s + getCellValue(l.category, l.lineType, month).value, 0)
  }

  // Section total
  const getSectionTotal = (lines: BudgetLine[]): number => {
    return getLeafLines(lines).reduce((s, l) => s + getRowTotal(l.category, l.lineType), 0)
  }

  // Group row total (sum children)
  const getGroupColTotal = (children: BudgetLine[], month: number): number => {
    return children.reduce((s, c) => s + getCellValue(c.category, c.lineType, month).value, 0)
  }
  const getGroupRowTotal = (children: BudgetLine[]): number => {
    return children.reduce((s, c) => s + getRowTotal(c.category, c.lineType), 0)
  }

  // KPI values
  const totalRevenue = getSectionTotal(revenueLines)
  const totalCogs = getSectionTotal(cogsLines)
  const totalExpense = getSectionTotal(expenseLines)
  const totalGrossProfit = totalRevenue - totalCogs
  const totalMargin = totalRevenue - totalCogs - totalExpense

  // Inline edit handlers
  const startEdit = (category: string, lineType: string, month: number) => {
    const { value } = getCellValue(category, lineType, month)
    setEditCell({ category, lineType, month })
    setEditValue(String(Math.round(value)))
  }

  const saveEdit = async () => {
    if (!editCell) return
    const val = Number(editValue)
    if (isNaN(val) || val < 0) { setEditCell(null); return }
    await upsertForecast.mutateAsync([{
      planId,
      month: editCell.month,
      year,
      category: editCell.category,
      lineType: editCell.lineType,
      forecastAmount: val,
    }])
    setEditCell(null)
    setEditValue("")
  }

  // Add new category
  const handleAddCategory = async (lineType: "revenue" | "expense" | "cogs") => {
    if (!newCategory.trim()) return
    await createLine.mutateAsync({
      planId,
      category: newCategory.trim(),
      lineType,
      plannedAmount: 0,
    })
    // Create zero forecast entries for each month
    const entries = months.map(m => ({
      planId,
      month: m,
      year,
      category: newCategory.trim(),
      forecastAmount: 0,
    }))
    await upsertForecast.mutateAsync(entries)
    setNewCategory("")
    setAddingRevenue(false)
    setAddingExpense(false)
  }

  if (analyticsLoading || linesLoading) return (
    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  )

  const renderRow = (line: BudgetLine) => {
    const rowTotal = getRowTotal(line.category, line.lineType)
    const isChild = !!line.parentId
    return (
      <tr key={`${line.id}-${line.lineType}`} className="border-t border-border/50 hover:bg-muted/30">
        <td className="px-3 py-2 text-sm font-medium sticky left-0 bg-background z-10 min-w-[180px]">
          {isChild ? <span className="pl-5 text-muted-foreground">— {line.category}</span> : line.category}
        </td>
        {months.map(m => {
          const { value, isDefault } = getCellValue(line.category, line.lineType, m)
          const isEditing = editCell?.category === line.category && editCell?.lineType === line.lineType && editCell?.month === m
          return (
            <td key={m} className="px-2 py-2 text-right min-w-[90px]">
              {isEditing ? (
                <Input type="number" className="h-7 w-24 text-right text-xs ml-auto" value={editValue} autoFocus
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => saveEdit()}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditCell(null) }} />
              ) : (
                <button type="button"
                  className={`font-mono text-sm cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 px-1 rounded border border-transparent hover:border-purple-300 dark:hover:border-purple-700 transition-colors ${isDefault ? "text-muted-foreground italic" : ""}`}
                  onClick={() => startEdit(line.category, line.lineType, m)}>
                  {fmt(value)}
                </button>
              )}
            </td>
          )
        })}
        <td className="px-3 py-2 text-right font-mono text-sm font-bold min-w-[100px]">{fmt(rowTotal)}</td>
      </tr>
    )
  }

  const GROUP_COLORS: Record<string, string> = {
    "group:admin":      "bg-violet-500",
    "group:tech_infra": "bg-sky-500",
    "group:labor":      "bg-emerald-500",
    "group:risk":       "bg-amber-500",
  }

  const renderGroupHeaderRow = (line: BudgetLine) => {
    const children = line.children ?? []
    const groupTag = line.notes ?? ""
    const colorClass = GROUP_COLORS[groupTag] ?? "bg-slate-400"
    const isOpen = expandedGroups.has(groupTag.replace("group:", ""))
    const toggleGroup = () => {
      const key = groupTag.replace("group:", "")
      setExpandedGroups(prev => {
        const next = new Set(prev)
        next.has(key) ? next.delete(key) : next.add(key)
        return next
      })
    }

    return (
      <React.Fragment key={line.id}>
        <tr className="border-t border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer select-none" onClick={toggleGroup}>
          <td className="px-3 py-2 sticky left-0 bg-muted/20 z-10 min-w-[180px]">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${colorClass}`} />
              {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <span className="font-semibold text-sm">{line.category}</span>
              <Badge variant="outline" title={t("hintBadgeChildCount")} className="text-[10px] px-1 py-0">{children.length}</Badge>
            </div>
          </td>
          {months.map(m => (
            <td key={m} className="px-2 py-2 text-right font-mono text-sm font-semibold">{fmt(getGroupColTotal(children, m))}</td>
          ))}
          <td className="px-3 py-2 text-right font-mono text-sm font-bold">{fmt(getGroupRowTotal(children))}</td>
        </tr>
        {isOpen && children.map(child => renderRow(child))}
      </React.Fragment>
    )
  }

  const renderSection = (title: string, lines: BudgetLine[], isAdding: boolean, setIsAdding: (v: boolean) => void, lineType: "revenue" | "expense" | "cogs") => (
    <>
      <tr className="bg-muted/40">
        <td colSpan={months.length + 2} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </td>
      </tr>
      {lines.map(l => {
        if (l.children && l.children.length > 0) return renderGroupHeaderRow(l)
        return renderRow(l)
      })}
      {/* Add row */}
      {isAdding ? (
        <tr className="border-t border-border/50 bg-green-50 dark:bg-green-900/10">
          <td className="px-3 py-1 sticky left-0 bg-green-50 dark:bg-green-900/10 z-10">
            <div className="flex items-center gap-1">
              <Input placeholder={t("placeholderCategoryShort")} className="h-7 text-xs" value={newCategory}
                onChange={e => setNewCategory(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleAddCategory(lineType); if (e.key === "Escape") { setIsAdding(false); setNewCategory("") } }} />
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleAddCategory(lineType)}
                disabled={createLine.isPending}>
                {createLine.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setIsAdding(false); setNewCategory("") }}>
                {t("btnCancel")}
              </Button>
            </div>
          </td>
          <td colSpan={months.length + 1} />
        </tr>
      ) : (
        <tr className="border-t border-dashed border-border/30">
          <td colSpan={months.length + 2} className="px-3 py-1.5">
            <button onClick={() => { setIsAdding(true); setNewCategory("") }}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> {t("btnAddRow")}
            </button>
          </td>
        </tr>
      )}
      {/* Section totals */}
      <tr className="border-t-2 border-border bg-muted/30">
        <td className="px-3 py-1.5 font-bold text-xs sticky left-0 bg-muted/30 z-10" title={t("hintSectionTotal")}>{t("totalLabel")} {title.toLowerCase()}</td>
        {months.map(m => (
          <td key={m} className="px-2 py-1.5 text-right font-mono text-xs font-bold">{fmt(getColTotal(lines, m))}</td>
        ))}
        <td className="px-3 py-1.5 text-right font-mono text-xs font-bold">{fmt(getSectionTotal(lines))}</td>
      </tr>
    </>
  )

  return (
    <div className="space-y-6">
      {/* Scenario toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{t("scenarioLabel")}</span>
        <div className="flex gap-1">
          {(["base", "optimistic", "pessimistic"] as const).map(s => (
            <Button key={s} size="sm" variant={scenario === s ? "default" : "outline"} className="h-8 text-sm px-4"
              title={s === "base" ? t("hintScenarioBase") : s === "optimistic" ? t("hintScenarioOptimistic") : t("hintScenarioPessimistic")}
              onClick={() => setScenario(s)}>
              {s === "base" ? t("scenarioBase") : s === "optimistic" ? t("scenarioOptimistic") : t("scenarioPessimistic")}
            </Button>
          ))}
        </div>
        {scenario !== "base" && (
          <Badge variant="secondary" className="text-xs">
            {scenario === "optimistic" ? t("hintScenarioOptimistic") : t("hintScenarioPessimistic")}
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ColorStatCard label={t("forecastRevenueTotal") || `${t("sectionRevenues")} (${t("colForecast").toLowerCase()})`} value={fmt(totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} color="green" />
        <ColorStatCard label={t("sectionCOGS")} value={fmt(totalCogs)} icon={<DollarSign className="h-5 w-5" />} color="amber" />
        <ColorStatCard label={t("forecastExpenseTotal") || `${t("sectionExpenses")} (${t("colForecast").toLowerCase()})`} value={fmt(totalExpense)} icon={<BarChart2 className="h-5 w-5" />} color="red" />
        <ColorStatCard
          label={t("operatingProfit")}
          value={fmt(totalMargin)}
          icon={totalMargin >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          color={totalMargin >= 0 ? "teal" : "red"}
        />
      </div>

      {/* Monthly matrix table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#1a3050] border-b-2 border-white/10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/90 sticky left-0 bg-[#1a3050] z-20 min-w-[180px]">{t("colCategory")}</th>
                  {monthLabels.map((label, i) => (
                    <th key={i} className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-sky-300/80 min-w-[90px]">{label}</th>
                  ))}
                  <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-amber-300 min-w-[100px]">{t("totalLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {renderSection(t("sectionRevenues"), revenueLines, addingRevenue, setAddingRevenue, "revenue")}
                {renderSection(t("sectionCOGS"), cogsLines, addingCogs, setAddingCogs, "cogs")}

                {/* Gross Profit row */}
                <tr className="border-t-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10">
                  <td className="px-3 py-2 font-bold text-sm sticky left-0 bg-emerald-50 dark:bg-emerald-900/10 z-10">{t("grossProfit")}</td>
                  {months.map(m => (
                    <td key={m} className="px-2 py-2 text-right font-mono text-sm font-bold">
                      {fmt(getColTotal(revenueLines, m) - getColTotal(cogsLines, m))}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono text-sm font-bold">{fmt(totalGrossProfit)}</td>
                </tr>

                {renderSection(t("sectionExpenses"), expenseLines, addingExpense, setAddingExpense, "expense")}

                {/* Operating Profit row */}
                <tr className="border-t-2 border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10">
                  <td className="px-3 py-2 font-bold text-sm sticky left-0 bg-purple-50 dark:bg-purple-900/10 z-10">{t("operatingProfit")}</td>
                  {months.map(m => (
                    <td key={m} className="px-2 py-2 text-right font-mono text-sm font-bold">
                      {fmt(getColTotal(revenueLines, m) - getColTotal(cogsLines, m) - getColTotal(expenseLines, m))}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono text-sm font-bold">{fmt(totalMargin)}</td>
                </tr>

                {/* Empty state */}
                {budgetLines.length === 0 && (
                  <tr>
                    <td colSpan={months.length + 2} className="text-center py-12 text-muted-foreground">
                      {t("emptyNoLines")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Templates Tab ───────────────────────────────────────────────────────────

function TemplatesTab() {
  const t = useTranslations("budgeting")
  const { data: templates = [], isLoading } = useBudgetTemplates()
  const createTemplate = useCreateBudgetTemplate()
  const updateTemplate = useUpdateBudgetTemplate()
  const deleteTemplate = useDeleteBudgetTemplate()

  const [adding, setAdding] = useState(false)
  const [newTpl, setNewTpl] = useState({ name: "", lineType: "expense" as "revenue" | "expense" | "cogs", lineSubtype: "service", defaultAmount: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newTpl.name) return
    await createTemplate.mutateAsync({
      name: newTpl.name,
      lineType: newTpl.lineType,
      lineSubtype: newTpl.lineSubtype,
      defaultAmount: Number(newTpl.defaultAmount) || 0,
    })
    setNewTpl({ name: "", lineType: "expense", lineSubtype: "service", defaultAmount: "" })
    setAdding(false)
  }

  const toggleActive = async (tpl: BudgetDirectionTemplate) => {
    await updateTemplate.mutateAsync({ id: tpl.id, isActive: !tpl.isActive })
  }

  const handleDelete = async (id: string) => {
    await deleteTemplate.mutateAsync(id)
    setConfirmDelete(null)
  }

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>

  const subtypeLabel = (s: string | null | undefined) => {
    if (s === "service") return t("subtypeService")
    if (s === "product") return t("subtypeProduct")
    if (s === "cogs") return t("subtypeCogs")
    return s || "—"
  }

  const typeLabel = (lt: string) => {
    if (lt === "revenue") return t("revenue")
    if (lt === "cogs") return "COGS"
    return t("expense")
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t("templatesTitle")}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{t("templatesDescription")}</p>
            </div>
            {!adding && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t("btnAddTemplate")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1a3050] border-b-2 border-white/10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/90"><span className="inline-flex items-center gap-1.5">{t("templateName")} <InfoHint text={t("hintTemplateName")} size={12} /></span></th>
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">{t("templateType")}</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">{t("templateSubtype")}</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-300">{t("templateAmount")}</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/70"><span className="inline-flex items-center gap-1.5 justify-center">{t("templateActive")} <InfoHint text={t("hintTemplateActive")} size={12} /></span></th>
                  <th className="px-2 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {adding && (
                  <tr className="border-b border-border/50 bg-green-50 dark:bg-green-900/10">
                    <td className="px-2 py-1">
                      <Input className="h-7 text-xs" placeholder={t("templateName")} value={newTpl.name}
                        onChange={e => setNewTpl(d => ({ ...d, name: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && handleAdd()} autoFocus />
                    </td>
                    <td className="px-2 py-1">
                      <select value={newTpl.lineType} onChange={e => setNewTpl(d => ({ ...d, lineType: e.target.value as any }))}
                        className="h-7 w-full rounded-md border border-input bg-background px-1 text-xs">
                        <option value="expense">{t("expense")}</option>
                        <option value="revenue">{t("revenue")}</option>
                        <option value="cogs">COGS</option>
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select value={newTpl.lineSubtype} onChange={e => setNewTpl(d => ({ ...d, lineSubtype: e.target.value }))}
                        className="h-7 w-full rounded-md border border-input bg-background px-1 text-xs">
                        <option value="service">{t("subtypeService")}</option>
                        <option value="product">{t("subtypeProduct")}</option>
                        <option value="cogs">{t("subtypeCogs")}</option>
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <Input type="number" className="h-7 text-xs text-right" placeholder="0" value={newTpl.defaultAmount}
                        onChange={e => setNewTpl(d => ({ ...d, defaultAmount: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && handleAdd()} />
                    </td>
                    <td />
                    <td className="px-2 py-1 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleAdd} disabled={createTemplate.isPending}>
                          {createTemplate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>{t("btnCancel")}</Button>
                      </div>
                    </td>
                  </tr>
                )}
                {templates.map((tpl: BudgetDirectionTemplate) => (
                  <tr key={tpl.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-1.5 text-xs font-medium">{tpl.name}</td>
                    <td className="px-2 py-1.5 text-xs">
                      <Badge variant="outline" className="text-[10px]">{typeLabel(tpl.lineType)}</Badge>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-muted-foreground">{subtypeLabel(tpl.lineSubtype)}</td>
                    <td className="px-2 py-1.5 text-xs text-right font-mono">{fmt(tpl.defaultAmount)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => toggleActive(tpl)} className={`inline-block w-8 h-4 rounded-full transition-colors ${tpl.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                        <span className={`block w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${tpl.isActive ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {confirmDelete === tpl.id ? (
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2" onClick={() => handleDelete(tpl.id)}>
                            {deleteTemplate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Trash2 className="h-3 w-3 mr-0.5" /> OK</>}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setConfirmDelete(null)}>{t("btnCancel")}</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setConfirmDelete(tpl.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && !adding && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground text-xs">{t("emptyNoLines")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Apply Templates Dialog ─────────────────────────────────────────────────

function ApplyTemplatesButton({ planId }: { planId: string }) {
  const t = useTranslations("budgeting")
  const { data: templates = [] } = useBudgetTemplates()
  const applyTemplates = useApplyTemplates()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)

  const activeTemplates = templates.filter((tpl: BudgetDirectionTemplate) => tpl.isActive)

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleApply = async () => {
    if (selected.size === 0) return
    const res = await applyTemplates.mutateAsync({ planId, templateIds: Array.from(selected) })
    setResult(res)
    setTimeout(() => { setOpen(false); setResult(null); setSelected(new Set()) }, 2000)
  }

  if (activeTemplates.length === 0) return null

  return (
    <>
      <Button size="sm" variant="outline" title={t("hintTemplateApply")} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> {t("btnApplyTemplates")}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-sm">{t("selectTemplates")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result ? (
                <div className="flex items-center gap-2 text-sm text-[#065f46] dark:text-[#6ee7b7]">
                  <CheckCircle className="h-4 w-4" />
                  {t("templateApplied", { created: result.created, skipped: result.skipped })}
                </div>
              ) : (
                <>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {activeTemplates.map((tpl: BudgetDirectionTemplate) => (
                      <label key={tpl.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/40 cursor-pointer text-xs">
                        <input type="checkbox" checked={selected.has(tpl.id)} onChange={() => toggle(tpl.id)} className="rounded" />
                        <span className="flex-1">{tpl.name}</span>
                        <Badge variant="outline" className="text-[10px]">{tpl.lineType}</Badge>
                        <span className="font-mono text-muted-foreground">{fmt(tpl.defaultAmount)}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={handleApply} disabled={selected.size === 0 || applyTemplates.isPending} className="flex-1">
                      {applyTemplates.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("btnApplyTemplates")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setOpen(false); setSelected(new Set()) }} className="flex-1">{t("btnCancel")}</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
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
            <select value={resolvedPlanId} onChange={e => { setActivePlanId(e.target.value) }}
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
              <TabsTrigger value="workspace" className="gap-1">{t("tabWorkspace")} <InfoHint text={t("hintTabWorkspace")} size={12} /></TabsTrigger>
              <TabsTrigger value="pl" className="gap-1">{t("tabPL")} <InfoHint text={t("hintTabPL")} size={12} /></TabsTrigger>
              <TabsTrigger value="forecast" className="gap-1">{t("tabForecast")} <InfoHint text={t("hintTabForecast")} size={12} /></TabsTrigger>
              <TabsTrigger value="comparison" className="gap-1">{t("tabComparison")} <InfoHint text={t("hintTabComparison")} size={12} /></TabsTrigger>
              <TabsTrigger value="plans" className="gap-1">{t("tabPlans")} <InfoHint text={t("hintTabPlans")} size={12} /></TabsTrigger>
              <TabsTrigger value="templates" className="gap-1">{t("tabTemplates")} <InfoHint text={t("hintTabTemplates")} size={12} /></TabsTrigger>
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
            <TabsContent value="templates">
              <TemplatesTab />
            </TabsContent>
          </Tabs>
        </>
      )}

      {showCreate && <CreatePlanDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
