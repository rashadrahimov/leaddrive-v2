"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ColorStatCard } from "@/components/color-stat-card"
import {
  DollarSign, Download, Search, ChevronDown, ChevronRight,
  RotateCcw, Trash2, Loader2, Plus, Save, X, Trophy, ArrowRight, BarChart3, TrendingUp,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { PageDescription } from "@/components/page-description"
import { fmtAmountDecimal } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/constants"
import {
  GROUP_ORDER, BOARD_CATS, CATEGORY_MAP,
  catTotal, applyAdjustments, aggregateBoardCats, emptyAdjustments,
  type PricingData, type PricingAdjustments, type PricingCompany, type CategoryValue, type PricingCategory,
} from "@/lib/pricing"

// ─── Chart colors ───────────────────────────────────────────
const GROUP_COLORS = ["#1B2A4A", "#2D4A7A", "#4A6FA5", "#6B8FBF", "#8CB0D9", "#ADC8E6", "#96A3B0"]
const CAT_COLORS = ["#1B2A4A", "#4A6FA5", "#E91E63", "#FF9800", "#4CAF50", "#9C27B0", "#00BCD4", "#FF5722", "#795548", "#607D8B", "#3F51B5"]

// ─── Slider component ──────────────────────────────────────
function AdjSlider({ value, onChange, label, count, datePicker, dateValue, onDateChange }: {
  value: number
  onChange: (v: number) => void
  label: string
  count?: number
  datePicker?: boolean
  dateValue?: string
  onDateChange?: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}{count !== undefined ? ` (${count})` : ""}</span>
        <span className={`text-sm font-mono font-bold ${value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-muted-foreground"}`}>{value}%</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={-50}
          max={50}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
          style={{ direction: "ltr" }}
        />
        <div className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ left: "50%" }}>
          <div className="w-0.5 h-4 bg-muted-foreground/50 rounded" />
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>-50%</span>
        <span>0%</span>
        <span>+50%</span>
      </div>
      {datePicker && (
        <input
          type="date"
          value={dateValue || ""}
          onChange={(e) => onDateChange?.(e.target.value)}
          className="w-full h-8 px-2 text-xs border rounded mt-1"
          placeholder="dd.mm.yyyy"
        />
      )}
    </div>
  )
}

// ─── Collapsible section ────────────────────────────────────
function CollapsibleSection({ title, defaultOpen, children }: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-sm font-medium"
      >
        {title}
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────
export default function PricingPage() {
  const { data: session } = useSession()
  const tp = useTranslations("pricing")
  const orgId = session?.user?.organizationId

  const [pricingData, setPricingData] = useState<PricingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"model" | "edit" | "sales">("model")
  const [adjustments, setAdj] = useState<PricingAdjustments>(emptyAdjustments())
  const [tableSearch, setTableSearch] = useState("")
  const [tableSortCol, setTableSortCol] = useState<string>("group")
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("asc")
  const [compSliderSearch, setCompSliderSearch] = useState("")
  const [exportLoading, setExportLoading] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportTemplate, setExportTemplate] = useState("1")
  const [exportDate, setExportDate] = useState("")

  // Edit tab state
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [editSearch, setEditSearch] = useState("")
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Sales tab state
  const [salesData, setSalesData] = useState<any[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesFilter, setSalesFilter] = useState<{ type: string; status: string }>({ type: "all", status: "all" })
  const [showAddSale, setShowAddSale] = useState(false)
  const [newSale, setNewSale] = useState({
    profileId: "", type: "recurring" as string, name: "", description: "",
    categoryName: "", unit: "Per Device", qty: 1, price: 0,
    effectiveDate: new Date().toISOString().split("T")[0], endDate: "",
  })
  const [salesSearch, setSalesSearch] = useState("")
  const [profilesList, setProfilesList] = useState<any[]>([])
  const [savingSale, setSavingSale] = useState(false)
  // Won deals state
  const [wonDeals, setWonDeals] = useState<any[]>([])
  const [wonDealsLoading, setWonDealsLoading] = useState(false)
  const [addingDealId, setAddingDealId] = useState<string | null>(null)

  const headers = orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/pricing/data", { headers: headers as any })
      const json = await res.json()
      if (json.success) setPricingData(json.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [orgId])

  const fetchSales = useCallback(async () => {
    setSalesLoading(true)
    try {
      const res = await fetch("/api/v1/pricing/additional-sales?limit=500", { headers: headers as any })
      const json = await res.json()
      if (json.success) setSalesData(json.data.sales || [])
    } catch { /* ignore */ }
    finally { setSalesLoading(false) }
  }, [orgId])

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/pricing/profiles?all=true", { headers: headers as any })
      const json = await res.json()
      if (json.success) setProfilesList(json.data.profiles || [])
    } catch { /* ignore */ }
  }, [orgId])

  const fetchWonDeals = useCallback(async () => {
    setWonDealsLoading(true)
    try {
      const res = await fetch("/api/v1/deals?limit=500&stage=WON", { headers: headers as any })
      const json = await res.json()
      const deals = json.success ? (json.data?.deals || json.data || []) : []
      // Filter out deals already linked to additional sales
      const linkedDealIds = new Set(salesData.filter((s: any) => s.dealId).map((s: any) => s.dealId))
      setWonDeals(deals.filter((d: any) => !linkedDealIds.has(d.id)))
    } catch { /* ignore */ }
    finally { setWonDealsLoading(false) }
  }, [orgId, salesData])

  useEffect(() => { if (session) fetchData() }, [session])
  useEffect(() => { if (session && activeTab === "sales") { fetchSales(); fetchProfiles() } }, [session, activeTab])
  useEffect(() => { if (session && activeTab === "sales" && salesData.length >= 0) fetchWonDeals() }, [session, activeTab, salesData])

  // ─── Computed values ────────────────────────────────────
  const adjustedData = useMemo(() => {
    if (!pricingData) return null
    return applyAdjustments(pricingData, adjustments)
  }, [pricingData, adjustments])

  const baseTotal = useMemo(() => {
    if (!pricingData) return 0
    return Object.values(pricingData).reduce((s, c) => s + c.monthly, 0)
  }, [pricingData])

  const adjTotal = useMemo(() => {
    if (!adjustedData) return 0
    return Object.values(adjustedData).reduce((s, c) => s + c.monthly, 0)
  }, [adjustedData])

  const rawDiff = adjTotal - baseTotal
  const annualEffect = Math.abs(rawDiff) < 0.01 ? 0 : rawDiff * 12
  const avgChange = baseTotal > 0 && Math.abs(rawDiff) >= 0.01 ? (rawDiff / baseTotal) * 100 : 0

  // Group company counts
  const groupCounts = useMemo(() => {
    if (!pricingData) return {} as Record<string, number>
    const counts: Record<string, number> = {}
    for (const info of Object.values(pricingData)) {
      counts[info.group] = (counts[info.group] || 0) + 1
    }
    return counts
  }, [pricingData])

  // All categories
  const allCategories = useMemo(() => {
    if (!pricingData) return [] as string[]
    const cats = new Set<string>()
    for (const info of Object.values(pricingData)) {
      for (const cat of Object.keys(info.categories)) cats.add(cat)
    }
    return Array.from(cats).sort()
  }, [pricingData])

  // ─── Chart data ─────────────────────────────────────────
  const groupChartData = useMemo(() => {
    if (!pricingData || !adjustedData) return []
    return GROUP_ORDER.map((group) => {
      const baseRev = Object.values(pricingData)
        .filter((c) => c.group === group)
        .reduce((s, c) => s + c.monthly, 0)
      const adjRev = Object.values(adjustedData)
        .filter((c) => c.group === group)
        .reduce((s, c) => s + c.monthly, 0)
      return { name: group, "Базовая": Math.round(baseRev), "Новая": Math.round(adjRev) }
    }).filter((d) => d["Базовая"] > 0 || d["Новая"] > 0)
  }, [pricingData, adjustedData])

  const catChartData = useMemo(() => {
    if (!adjustedData) return []
    const totals: Record<string, number> = {}
    for (const info of Object.values(adjustedData)) {
      for (const [cat, val] of Object.entries(info.categories)) {
        totals[cat] = (totals[cat] || 0) + catTotal(val)
      }
    }
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [adjustedData])

  const topCompaniesData = useMemo(() => {
    if (!adjustedData) return []
    return Object.entries(adjustedData)
      .sort((a, b) => b[1].monthly - a[1].monthly)
      .slice(0, 15)
      .map(([name, info]) => ({ name, "Новая": Math.round(info.monthly) }))
  }, [adjustedData])

  // ─── Table data ─────────────────────────────────────────
  const tableData = useMemo(() => {
    if (!pricingData || !adjustedData) return []
    let entries = Object.entries(adjustedData).map(([code, adj]) => {
      const base = pricingData[code]?.monthly || 0
      const newVal = adj.monthly
      const diff = newVal - base
      const pct = base > 0 ? (diff / base) * 100 : 0
      const compAdj = adjustments.companies[code] || 0
      return { code, group: adj.group, base, newVal, diff, pct, compAdj }
    })

    if (tableSearch) {
      const q = tableSearch.toLowerCase()
      entries = entries.filter((e) => e.code.toLowerCase().includes(q) || e.group.toLowerCase().includes(q))
    }

    entries.sort((a, b) => {
      let cmp = 0
      if (tableSortCol === "group") {
        const ai = GROUP_ORDER.indexOf(a.group)
        const bi = GROUP_ORDER.indexOf(b.group)
        cmp = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        if (cmp === 0) cmp = a.code.localeCompare(b.code)
      } else if (tableSortCol === "code") cmp = a.code.localeCompare(b.code)
      else if (tableSortCol === "base") cmp = a.base - b.base
      else if (tableSortCol === "new") cmp = a.newVal - b.newVal
      else if (tableSortCol === "diff") cmp = a.diff - b.diff
      else if (tableSortCol === "pct") cmp = a.pct - b.pct
      return tableSortDir === "asc" ? cmp : -cmp
    })
    return entries
  }, [pricingData, adjustedData, tableSearch, tableSortCol, tableSortDir, adjustments])

  const toggleSort = (col: string) => {
    if (tableSortCol === col) setTableSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setTableSortCol(col); setTableSortDir("asc") }
  }

  // ─── Adjustment helpers ─────────────────────────────────
  const updateAdj = (fn: (prev: PricingAdjustments) => PricingAdjustments) => {
    setAdj((prev) => fn({ ...prev }))
  }

  const resetAll = () => setAdj(emptyAdjustments())

  // ─── Export ─────────────────────────────────────────────
  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await fetch("/api/v1/pricing/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers } as any,
        body: JSON.stringify({
          template: exportTemplate,
          adjustments,
          effective_date: exportDate || null,
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "export.xlsx"
        a.click()
        URL.revokeObjectURL(url)
        setExportOpen(false)
      }
    } catch { /* ignore */ }
    finally { setExportLoading(false) }
  }

  // ─── Edit tab: save company ─────────────────────────────
  const saveCompanyPricing = async (code: string, categories: Record<string, CategoryValue>) => {
    setSaving(true)
    try {
      await fetch(`/api/v1/pricing/company/${encodeURIComponent(code)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers } as any,
        body: JSON.stringify({ categories }),
      })
      await fetchData()
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const deleteCompany = async (code: string) => {
    if (!confirm(`Удалить компанию ${code}?`)) return
    await fetch(`/api/v1/pricing/delete/${encodeURIComponent(code)}`, {
      method: "DELETE",
      headers: headers as any,
    })
    setSelectedCompany(null)
    await fetchData()
  }

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Модель ценообразования ИТ-услуг
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (!pricingData || !adjustedData) {
    return <div className="text-center py-20 text-muted-foreground">Нет данных ценообразования</div>
  }

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Модель ценообразования ИТ-услуг</h1>
          <PageDescription text={tp("pageDescription")} />
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "model" ? "default" : "outline"}
            onClick={() => setActiveTab("model")}
            className="gap-1"
          >
            Модель цен <InfoHint text={tp("hintTabPricing")} size={12} />
          </Button>
          <Button
            variant={activeTab === "edit" ? "default" : "outline"}
            onClick={() => setActiveTab("edit")}
            className="gap-1"
          >
            Редактировать цены <InfoHint text={tp("hintTabEdit")} size={12} />
          </Button>
          <Button
            variant={activeTab === "sales" ? "default" : "outline"}
            onClick={() => setActiveTab("sales")}
            className="gap-1"
          >
            Допродажи <InfoHint text={tp("hintTabSales")} size={12} />
          </Button>
          <div className="relative">
            <Button variant="outline" onClick={() => setExportOpen(!exportOpen)}>
              <Download className="h-4 w-4 mr-1" /> Экспорт в Excel
            </Button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-card border rounded-lg shadow-lg p-4 w-72 space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Шаблон</label>
                  <select
                    value={exportTemplate}
                    onChange={(e) => setExportTemplate(e.target.value)}
                    className="w-full h-9 border rounded px-2 text-sm mt-1"
                  >
                    <option value="1">Template 1 — SALES</option>
                    <option value="2">Template 2 — CFO Report</option>
                    <option value="budget">Budget P&L</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Дата начала действия</label>
                  <input
                    type="date"
                    value={exportDate}
                    onChange={(e) => setExportDate(e.target.value)}
                    className="w-full h-9 border rounded px-2 text-sm mt-1"
                  />
                </div>
                <Button onClick={handleExport} disabled={exportLoading} className="w-full">
                  {exportLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                  Скачать
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1: PRICE MODEL
          ══════════════════════════════════════════════════════ */}
      {activeTab === "model" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ColorStatCard
              label="Общий ежемесячный доход"
              value={`${baseTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${getCurrencySymbol()}`}
              icon={<DollarSign className="h-4 w-4" />}
              color="green"
            />
            <ColorStatCard
              label="Прогнозируемый ежемесячный доход"
              value={`${adjTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${getCurrencySymbol()}`}
              icon={<TrendingUp className="h-4 w-4" />}
              color="blue"
            />
            <ColorStatCard
              label="Годовой эффект"
              value={`${annualEffect.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${getCurrencySymbol()}`}
              icon={<BarChart3 className="h-4 w-4" />}
              color={annualEffect >= 0 ? "teal" : "red"}
            />
            <ColorStatCard
              label="Средняя корректировка"
              value={`${avgChange.toFixed(2)}%`}
              icon={<ArrowRight className="h-4 w-4" />}
              color={avgChange >= 0 ? "violet" : "orange"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* Left column: Sliders */}
            <div className="space-y-4">
              {/* Global slider */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <AdjSlider
                    label="Общая корректировка"
                    value={adjustments.global}
                    onChange={(v) => updateAdj((a) => ({ ...a, global: v }))}
                  />
                  <Button variant="outline" size="sm" className="w-full" onClick={resetAll}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Сбросить
                  </Button>
                </CardContent>
              </Card>

              {/* Group sliders */}
              <CollapsibleSection title={`Корректировка по группам (${Object.keys(groupCounts).length})`} defaultOpen>
                {GROUP_ORDER.filter((g) => groupCounts[g]).map((group) => (
                  <AdjSlider
                    key={group}
                    label={group}
                    count={groupCounts[group]}
                    value={adjustments.groups[group] || 0}
                    onChange={(v) => updateAdj((a) => ({
                      ...a,
                      groups: { ...a.groups, [group]: v },
                    }))}
                    datePicker
                    dateValue={adjustments.group_dates[group] || ""}
                    onDateChange={(d) => updateAdj((a) => ({
                      ...a,
                      group_dates: { ...a.group_dates, [group]: d },
                    }))}
                  />
                ))}
              </CollapsibleSection>

              {/* Category sliders */}
              <CollapsibleSection title={`Корректировка по категориям (${allCategories.length})`}>
                {allCategories.map((cat) => (
                  <AdjSlider
                    key={cat}
                    label={cat}
                    value={adjustments.categories[cat] || 0}
                    onChange={(v) => updateAdj((a) => ({
                      ...a,
                      categories: { ...a.categories, [cat]: v },
                    }))}
                    datePicker
                    dateValue={adjustments.category_dates[cat] || ""}
                    onDateChange={(d) => updateAdj((a) => ({
                      ...a,
                      category_dates: { ...a.category_dates, [cat]: d },
                    }))}
                  />
                ))}
              </CollapsibleSection>

              {/* Company sliders */}
              <CollapsibleSection title={`Корректировка по компаниям (${Object.keys(pricingData).length})`}>
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск компании..."
                    value={compSliderSearch}
                    onChange={(e) => setCompSliderSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                {GROUP_ORDER.map((group) => {
                  const comps = Object.entries(pricingData)
                    .filter(([, info]) => info.group === group)
                    .filter(([code]) => !compSliderSearch || code.toLowerCase().includes(compSliderSearch.toLowerCase()))
                    .sort((a, b) => a[0].localeCompare(b[0]))
                  if (comps.length === 0) return null
                  return (
                    <div key={group} className="space-y-2">
                      <div className="text-xs font-semibold text-primary mt-2">{group} ({comps.length})</div>
                      {comps.map(([code]) => (
                        <AdjSlider
                          key={code}
                          label={code}
                          value={adjustments.companies[code] || 0}
                          onChange={(v) => updateAdj((a) => ({
                            ...a,
                            companies: { ...a.companies, [code]: v },
                          }))}
                          datePicker
                          dateValue={adjustments.company_dates[code] || ""}
                          onDateChange={(d) => updateAdj((a) => ({
                            ...a,
                            company_dates: { ...a.company_dates, [code]: d },
                          }))}
                        />
                      ))}
                    </div>
                  )
                })}
              </CollapsibleSection>
            </div>

            {/* Right column: Charts + Table */}
            <div className="space-y-6">
              {/* Charts row */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Revenue by group */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Доход по группам</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={groupChartData} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" width={75} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={((v: number) => `${v.toLocaleString()} ${getCurrencySymbol()}`) as any} />
                        <Legend />
                        <Bar dataKey="Базовая" fill="#8B95A5" barSize={12} />
                        <Bar dataKey="Новая" fill="#2D4A7A" barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Revenue by category */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Доход по категориям</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={catChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={85}
                          dataKey="value"
                          labelLine={false}
                        >
                          {catChartData.map((_, i) => (
                            <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={((v: number) => `${v.toLocaleString()} ${getCurrencySymbol()}`) as any} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                      {catChartData.map((item, i) => {
                        const total = catChartData.reduce((s, c) => s + c.value, 0)
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0"
                        return (
                          <div key={i} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="ml-auto font-mono font-medium text-foreground">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top 15 companies */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Топ 15 компаний</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topCompaniesData} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" width={95} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={((v: number) => `${v.toLocaleString()} ${getCurrencySymbol()}`) as any} />
                      <Legend />
                      <Bar dataKey="Новая" fill="#2D4A7A" barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Companies table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Таблица компаний</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-2 w-8">#</th>
                          {[
                            { key: "code", label: "Компания" },
                            { key: "group", label: "Группа" },
                            { key: "base", label: `Базовая ${getCurrencySymbol()}` },
                            { key: "new", label: `Новая ${getCurrencySymbol()}` },
                            { key: "diff", label: `Разница ${getCurrencySymbol()}` },
                            { key: "pct", label: "%" },
                          ].map(({ key, label }) => (
                            <th
                              key={key}
                              className="pb-2 pr-4 cursor-pointer hover:text-foreground select-none"
                              onClick={() => toggleSort(key)}
                            >
                              {label} {tableSortCol === key ? (tableSortDir === "asc" ? "↑" : "↓") : ""}
                            </th>
                          ))}
                          <th className="pb-2 text-center w-40">Корректировка по компаниям</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, i) => (
                          <tr key={row.code} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                            <td className="py-2 pr-4 font-medium">{row.code}</td>
                            <td className="py-2 pr-4">{row.group}</td>
                            <td className="py-2 pr-4 text-right font-mono">{row.base.toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}</td>
                            <td className="py-2 pr-4 text-right font-mono font-medium">{row.newVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}</td>
                            <td className={`py-2 pr-4 text-right font-mono ${row.diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {row.diff >= 0 ? "+" : ""}{row.diff.toLocaleString(undefined, { maximumFractionDigits: 0 })} {getCurrencySymbol()}
                            </td>
                            <td className={`py-2 pr-4 text-right font-mono ${row.pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {row.pct.toFixed(1)}%
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={-50}
                                  max={50}
                                  value={row.compAdj}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value)
                                    updateAdj((a) => ({
                                      ...a,
                                      companies: { ...a.companies, [row.code]: v },
                                    }))
                                  }}
                                  className="w-20 h-1.5 accent-purple-600"
                                />
                                <span className="text-xs font-mono w-10 text-right">{row.compAdj}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2: EDIT PRICES
          ══════════════════════════════════════════════════════ */}
      {activeTab === "edit" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Редактируйте цены услуг для каждой компании. Нажмите «Сохранить» для применения изменений.
          </p>
          <div className="grid grid-cols-[280px_1fr] gap-6">
            {/* Company list */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск компании..."
                  value={editSearch}
                  onChange={(e) => setEditSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <div className="border rounded-lg max-h-[calc(100vh-250px)] overflow-y-auto">
                {GROUP_ORDER.map((group) => {
                  const comps = Object.entries(pricingData)
                    .filter(([, info]) => info.group === group)
                    .filter(([code]) => !editSearch || code.toLowerCase().includes(editSearch.toLowerCase()))
                    .sort((a, b) => a[0].localeCompare(b[0]))
                  if (comps.length === 0) return null
                  return (
                    <div key={group}>
                      <div className="text-xs font-semibold text-primary px-3 py-1.5 bg-primary/5 sticky top-0">
                        {group} ({comps.length})
                      </div>
                      {comps.map(([code, info]) => (
                        <button
                          key={code}
                          onClick={() => {
                            setSelectedCompany(code)
                            setExpandedCats(new Set())
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-muted/50 border-b text-sm ${
                            selectedCompany === code ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                          }`}
                        >
                          <div className="font-medium">{code}</div>
                          <div className="text-xs text-muted-foreground">
                            {info.monthly.toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}/ay
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Company editor */}
            <div>
              {!selectedCompany ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground border rounded-lg">
                  Выберите компанию для редактирования цен
                </div>
              ) : (
                <CompanyEditor
                  code={selectedCompany}
                  data={pricingData[selectedCompany]}
                  onSave={(cats) => saveCompanyPricing(selectedCompany, cats)}
                  onDelete={() => deleteCompany(selectedCompany)}
                  saving={saving}
                  expandedCats={expandedCats}
                  setExpandedCats={setExpandedCats}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3: ADDITIONAL SALES (ДОПРОДАЖИ)
          ══════════════════════════════════════════════════════ */}
      {activeTab === "sales" && (
        <div className="space-y-4">
          {/* Header with filters and add button */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <select
                value={salesFilter.type}
                onChange={(e) => setSalesFilter({ ...salesFilter, type: e.target.value })}
                className="h-9 border rounded px-2 text-sm"
              >
                <option value="all">Все типы</option>
                <option value="recurring">Ежемесячные (MRR)</option>
                <option value="one_time">Единоразовые</option>
              </select>
              <select
                value={salesFilter.status}
                onChange={(e) => setSalesFilter({ ...salesFilter, status: e.target.value })}
                className="h-9 border rounded px-2 text-sm"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активные</option>
                <option value="cancelled">Отменённые</option>
                <option value="completed">Завершённые</option>
              </select>
            </div>
            <Button onClick={() => setShowAddSale(true)}>
              <Plus className="h-4 w-4 mr-1" /> Добавить допродажу
            </Button>
          </div>

          {/* Add sale form */}
          {showAddSale && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="text-sm font-semibold">Новая допродажа</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Компания *</label>
                    <select
                      value={newSale.profileId}
                      onChange={(e) => setNewSale({ ...newSale, profileId: e.target.value })}
                      className="w-full h-9 border rounded px-2 text-sm mt-1"
                    >
                      <option value="">Выберите...</option>
                      {profilesList.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.companyCode} ({p.group?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Тип *</label>
                    <select
                      value={newSale.type}
                      onChange={(e) => setNewSale({ ...newSale, type: e.target.value })}
                      className="w-full h-9 border rounded px-2 text-sm mt-1"
                    >
                      <option value="recurring">Ежемесячная (MRR)</option>
                      <option value="one_time">Единоразовая</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Название *</label>
                    <input
                      type="text"
                      value={newSale.name}
                      onChange={(e) => setNewSale({ ...newSale, name: e.target.value })}
                      className="w-full h-9 border rounded px-2 text-sm mt-1"
                      placeholder="Описание допродажи"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Категория</label>
                    <input
                      type="text"
                      value={newSale.categoryName}
                      onChange={(e) => setNewSale({ ...newSale, categoryName: e.target.value })}
                      className="w-full h-9 border rounded px-2 text-sm mt-1"
                      placeholder="Опционально"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Единица</label>
                    <select
                      value={newSale.unit}
                      onChange={(e) => setNewSale({ ...newSale, unit: e.target.value })}
                      className="w-full h-9 border rounded px-2 text-sm mt-1"
                    >
                      {UNIT_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Кол-во</label>
                    <input
                      type="number"
                      value={newSale.qty}
                      onChange={(e) => setNewSale({ ...newSale, qty: parseInt(e.target.value) || 0 })}
                      className="w-full h-9 border rounded px-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Цена за ед.</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newSale.price}
                      onChange={(e) => setNewSale({ ...newSale, price: parseFloat(e.target.value) || 0 })}
                      className="w-full h-9 border rounded px-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Дата начала *</label>
                    <input
                      type="date"
                      value={newSale.effectiveDate}
                      onChange={(e) => setNewSale({ ...newSale, effectiveDate: e.target.value })}
                      className="w-full h-9 border rounded px-2 text-sm mt-1"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={async () => {
                      if (!newSale.profileId || !newSale.name || !newSale.effectiveDate) return
                      setSavingSale(true)
                      try {
                        await fetch("/api/v1/pricing/additional-sales", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...headers } as any,
                          body: JSON.stringify(newSale),
                        })
                        setShowAddSale(false)
                        setNewSale({ profileId: "", type: "recurring", name: "", description: "", categoryName: "", unit: "Per Device", qty: 1, price: 0, effectiveDate: new Date().toISOString().split("T")[0], endDate: "" })
                        fetchSales()
                      } catch { /* ignore */ }
                      finally { setSavingSale(false) }
                    }}
                    disabled={!newSale.profileId || !newSale.name || savingSale}
                  >
                    {savingSale ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                    Создать
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddSale(false)}>Отмена</Button>
                  {newSale.qty > 0 && newSale.price > 0 && (
                    <span className="text-sm text-muted-foreground ml-auto">
                      Итого: <strong>{(newSale.qty * newSale.price).toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}</strong>
                      {newSale.type === "recurring" && <span className="text-green-600"> /мес</span>}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Won deals not yet added to pricing */}
          {wonDeals.length > 0 && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-800">
                  <Trophy className="h-4 w-4" />
                  Выигранные сделки ({wonDeals.length})
                  <span className="text-xs font-normal text-green-600 ml-1">— не добавлены в допродажи</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-green-200 text-left text-green-700">
                        <th className="pb-2 pr-4">Сделка</th>
                        <th className="pb-2 pr-4">Компания</th>
                        <th className="pb-2 pr-4 text-right">Сумма</th>
                        <th className="pb-2 pr-4">Дата</th>
                        <th className="pb-2 w-40"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {wonDeals.map((deal: any) => (
                        <tr key={deal.id} className="border-b border-green-100 last:border-0 hover:bg-green-100/50">
                          <td className="py-2 pr-4 font-medium">{deal.name}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{deal.company?.name || "—"}</td>
                          <td className="py-2 pr-4 text-right font-mono font-medium">
                            {(deal.valueAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}
                          </td>
                          <td className="py-2 pr-4 text-xs text-muted-foreground">
                            {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString(undefined) : "—"}
                          </td>
                          <td className="py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-100"
                              disabled={addingDealId === deal.id || !deal.companyId}
                              onClick={async () => {
                                if (!deal.companyId) return
                                setAddingDealId(deal.id)
                                try {
                                  const res = await fetch(`/api/v1/deals/${deal.id}/add-to-pricing`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", ...headers } as any,
                                    body: JSON.stringify({
                                      type: "recurring",
                                      name: deal.name,
                                      qty: 1,
                                      price: deal.valueAmount || 0,
                                      effectiveDate: new Date().toISOString().split("T")[0],
                                    }),
                                  })
                                  const json = await res.json()
                                  if (json.success) {
                                    fetchSales()
                                  } else {
                                    toast.error(json.error || "Ошибка добавления")
                                  }
                                } catch { /* ignore */ }
                                finally { setAddingDealId(null) }
                              }}
                            >
                              {addingDealId === deal.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <ArrowRight className="h-3 w-3 mr-1" />
                              )}
                              {!deal.companyId ? "Нет компании" : "Добавить в допродажи"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {wonDealsLoading && wonDeals.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Загрузка выигранных сделок...
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ColorStatCard
              label="Всего допродаж"
              value={String(salesData.length)}
              icon={<DollarSign className="h-4 w-4" />}
              color="blue"
            />
            <ColorStatCard
              label="MRR допродаж"
              value={`${salesData.filter((s) => s.type === "recurring" && s.status === "active").reduce((sum: number, s: any) => sum + s.total, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${getCurrencySymbol()}`}
              icon={<TrendingUp className="h-4 w-4" />}
              color="green"
            />
            <ColorStatCard
              label="Единоразовые"
              value={`${salesData.filter((s) => s.type === "one_time").reduce((sum: number, s: any) => sum + s.total, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${getCurrencySymbol()}`}
              icon={<DollarSign className="h-4 w-4" />}
              color="orange"
            />
            <ColorStatCard
              label="Активных"
              value={String(salesData.filter((s) => s.status === "active").length)}
              icon={<Trophy className="h-4 w-4" />}
              color="teal"
            />
          </div>

          {/* Sales table */}
          <Card>
            <CardContent className="pt-4">
              {salesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-2 w-8">#</th>
                        <th className="pb-2 pr-4">Компания</th>
                        <th className="pb-2 pr-4">Тип</th>
                        <th className="pb-2 pr-4">Название</th>
                        <th className="pb-2 pr-4">Категория</th>
                        <th className="pb-2 pr-4 text-right">Кол-во</th>
                        <th className="pb-2 pr-4 text-right">Цена</th>
                        <th className="pb-2 pr-4 text-right">Итого</th>
                        <th className="pb-2 pr-4">Дата</th>
                        <th className="pb-2 pr-4">Статус</th>
                        <th className="pb-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData
                        .filter((s) => salesFilter.type === "all" || s.type === salesFilter.type)
                        .filter((s) => salesFilter.status === "all" || s.status === salesFilter.status)
                        .filter((s) => !salesSearch || s.name?.toLowerCase().includes(salesSearch.toLowerCase()) || s.profile?.companyCode?.toLowerCase().includes(salesSearch.toLowerCase()))
                        .map((sale: any, i: number) => (
                          <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                            <td className="py-2 pr-4 font-medium">
                              {sale.profile?.companyCode || "—"}
                              {sale.profile?.company?.name && (
                                <div className="text-xs text-muted-foreground">{sale.profile.company.name}</div>
                              )}
                            </td>
                            <td className="py-2 pr-4">
                              {sale.type === "recurring" ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">MRR</Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Единоразовая</Badge>
                              )}
                            </td>
                            <td className="py-2 pr-4">{sale.name}</td>
                            <td className="py-2 pr-4 text-xs text-muted-foreground">{sale.categoryName || "—"}</td>
                            <td className="py-2 pr-4 text-right font-mono">{sale.qty}</td>
                            <td className="py-2 pr-4 text-right font-mono">{sale.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}</td>
                            <td className="py-2 pr-4 text-right font-mono font-medium">{sale.total?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}</td>
                            <td className="py-2 pr-4 text-xs">
                              {sale.effectiveDate ? new Date(sale.effectiveDate).toLocaleDateString(undefined) : "—"}
                            </td>
                            <td className="py-2 pr-4">
                              {sale.status === "active" && <Badge variant="outline" className="text-green-600 border-green-300">Активна</Badge>}
                              {sale.status === "cancelled" && <Badge variant="outline" className="text-red-600 border-red-300">Отменена</Badge>}
                              {sale.status === "completed" && <Badge variant="outline" className="text-muted-foreground border-border">Завершена</Badge>}
                            </td>
                            <td className="py-2">
                              <button
                                onClick={async () => {
                                  if (!confirm("Удалить эту допродажу?")) return
                                  await fetch(`/api/v1/pricing/additional-sales/${sale.id}`, {
                                    method: "DELETE",
                                    headers: headers as any,
                                  })
                                  fetchSales()
                                }}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {salesData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Нет допродаж. Нажмите «Добавить допродажу» чтобы создать первую.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── Unit types ─────────────────────────────────────────────
const UNIT_TYPES = [
  "Per Device", "Per Systems", "Per Company", "Per User", "Per VM",
  "Per 2 vCPU", "Per GB", "Per Resource", "Project based", "Man/Day",
  "Hourly", "Hourly Rates",
]

// ─── Company Editor Component ───────────────────────────────
function CompanyEditor({ code, data, onSave, onDelete, saving, expandedCats, setExpandedCats }: {
  code: string
  data: PricingCompany
  onSave: (cats: Record<string, CategoryValue>) => void
  onDelete: () => void
  saving: boolean
  expandedCats: Set<string>
  setExpandedCats: (s: Set<string>) => void
}) {
  const [localCats, setLocalCats] = useState(data.categories)
  const [originalCats, setOriginalCats] = useState(data.categories)
  const [hasChanges, setHasChanges] = useState(false)

  // Add category dialog
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState("")

  // Add service form (per category)
  const [addingServiceCat, setAddingServiceCat] = useState<string | null>(null)
  const [newSvc, setNewSvc] = useState({ name: "", unit: "Per Device", qty: 1, price: 0 })
  const addSvcFormRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (addingServiceCat) {
      const t = setTimeout(() => {
        addSvcFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
      return () => clearTimeout(t)
    }
  }, [addingServiceCat])

  useEffect(() => {
    setLocalCats(data.categories)
    setOriginalCats(data.categories)
    setHasChanges(false)
  }, [code, data])

  const toggleCat = (cat: string) => {
    const next = new Set(expandedCats)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    setExpandedCats(next)
  }

  const markChanged = (cats: Record<string, CategoryValue>) => {
    setLocalCats(cats)
    setHasChanges(true)
  }

  const updateService = (cat: string, svcIdx: number, field: "qty" | "price", value: number) => {
    const catVal = localCats[cat]
    if (typeof catVal !== "object" || !("services" in catVal)) return
    const newServices = [...catVal.services]
    newServices[svcIdx] = { ...newServices[svcIdx], [field]: value, total: field === "qty" ? value * newServices[svcIdx].price : newServices[svcIdx].qty * value }
    const newTotal = newServices.reduce((s, svc) => s + svc.total, 0)
    markChanged({ ...localCats, [cat]: { total: Math.round(newTotal * 100) / 100, services: newServices } })
  }

  const deleteService = (cat: string, svcIdx: number) => {
    const catVal = localCats[cat]
    if (typeof catVal !== "object" || !("services" in catVal)) return
    const newServices = catVal.services.filter((_, i) => i !== svcIdx)
    const newTotal = newServices.reduce((s, svc) => s + svc.total, 0)
    markChanged({ ...localCats, [cat]: { total: Math.round(newTotal * 100) / 100, services: newServices } })
  }

  const addService = (cat: string) => {
    const catVal = localCats[cat]
    if (!newSvc.name.trim()) return
    const total = newSvc.qty * newSvc.price
    const svc = { name: newSvc.name.trim(), unit: newSvc.unit, qty: newSvc.qty, price: newSvc.price, total }

    if (typeof catVal === "object" && "services" in catVal) {
      const newServices = [...catVal.services, svc]
      const newTotal = newServices.reduce((s, s2) => s + s2.total, 0)
      markChanged({ ...localCats, [cat]: { total: Math.round(newTotal * 100) / 100, services: newServices } })
    } else {
      markChanged({ ...localCats, [cat]: { total, services: [svc] } })
    }
    setAddingServiceCat(null)
    setNewSvc({ name: "", unit: "Per Device", qty: 1, price: 0 })
  }

  const addCategory = () => {
    if (!newCatName.trim() || newCatName.trim() in localCats) return
    markChanged({ ...localCats, [newCatName.trim()]: { total: 0, services: [] } })
    setShowAddCat(false)
    setNewCatName("")
  }

  const deleteCategory = (cat: string) => {
    if (!confirm(`Удалить категорию "${cat}" и все её услуги?`)) return
    const newCats = { ...localCats }
    delete newCats[cat]
    markChanged(newCats)
  }

  const handleSave = () => {
    onSave(localCats)
    setOriginalCats(localCats)
    setHasChanges(false)
  }

  const handleCancel = () => {
    setLocalCats(originalCats)
    setHasChanges(false)
  }

  const handleReset = () => {
    setLocalCats(data.categories)
    setOriginalCats(data.categories)
    setHasChanges(false)
  }

  const monthly = Object.values(localCats).reduce<number>((s, v) => s + catTotal(v), 0)
  const annual = monthly * 12

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">{code}</h2>
          <Badge>{data.group}</Badge>
          <button onClick={onDelete} className="text-red-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Итого Ежемесячно</div>
          <div className="text-xl font-bold text-green-600">
            {monthly.toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}
          </div>
          <div className="text-xs text-muted-foreground">
            Ежегодно: {annual.toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}
          </div>
        </div>
      </div>

      {/* Save / Cancel / Reset buttons */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
          <Save className="h-3.5 w-3.5 mr-1" /> Сохранить
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} disabled={!hasChanges}>
          <X className="h-3.5 w-3.5 mr-1" /> Отменить
        </Button>
        <Button size="sm" variant="ghost" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Сбросить
        </Button>
        {hasChanges && <span className="text-xs text-amber-600 ml-2">Есть несохранённые изменения</span>}
      </div>

      <div className="space-y-2">
        {Object.entries(localCats).map(([cat, val]) => {
          const total = catTotal(val)
          const isExpanded = expandedCats.has(cat)
          const hasServices = typeof val === "object" && "services" in val && val.services.length > 0

          return (
            <div key={cat} className="border rounded-lg">
              <div className="flex items-center justify-between p-3 hover:bg-muted/50">
                <button
                  onClick={() => toggleCat(cat)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-sm">{cat}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-medium ${total > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAddingServiceCat(addingServiceCat === cat ? null : cat); setExpandedCats(new Set([...expandedCats, cat])) }}
                    className="text-primary hover:text-primary/80 p-1"
                    title="Добавить услугу"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCategory(cat) }}
                    className="text-red-400 hover:text-red-600 p-1"
                    title="Удалить категорию"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3">
                  {hasServices && typeof val === "object" && "services" in val && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted-foreground text-xs">
                          <th className="text-left pb-1">Услуга</th>
                          <th className="text-center pb-1 w-24">Единица</th>
                          <th className="text-center pb-1 w-20">Кол-во</th>
                          <th className="text-center pb-1 w-24">Цена за ед.</th>
                          <th className="text-right pb-1 w-24">Итого</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {val.services.map((svc, si) => (
                          <tr key={si} className="border-t">
                            <td className="py-1.5 pr-2">{svc.name}</td>
                            <td className="py-1.5 text-center text-xs text-muted-foreground">{svc.unit}</td>
                            <td className="py-1.5">
                              <input
                                type="number"
                                value={svc.qty}
                                onChange={(e) => updateService(cat, si, "qty", parseFloat(e.target.value) || 0)}
                                className="w-16 h-7 text-center border rounded text-sm mx-auto block"
                              />
                            </td>
                            <td className="py-1.5">
                              <input
                                type="number"
                                step="0.01"
                                value={svc.price}
                                onChange={(e) => updateService(cat, si, "price", parseFloat(e.target.value) || 0)}
                                className="w-20 h-7 text-center border rounded text-sm mx-auto block"
                              />
                            </td>
                            <td className="py-1.5 text-right font-mono">
                              {svc.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}
                            </td>
                            <td className="py-1.5 text-center">
                              <button
                                onClick={() => deleteService(cat, si)}
                                className="text-red-400 hover:text-red-600"
                                title="Удалить услугу"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Add service form */}
                  {addingServiceCat === cat && (
                    <div ref={addSvcFormRef} className="mt-2 p-3 bg-blue-50 rounded-lg space-y-2 border border-blue-200">
                      <div className="text-xs font-semibold text-primary">Новая услуга</div>
                      <div className="grid grid-cols-[1fr_120px_70px_90px] gap-2">
                        <input
                          type="text"
                          placeholder="Название услуги"
                          value={newSvc.name}
                          onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                          className="h-8 px-2 border rounded text-sm"
                        />
                        <select
                          value={newSvc.unit}
                          onChange={(e) => setNewSvc({ ...newSvc, unit: e.target.value })}
                          className="h-8 px-1 border rounded text-xs"
                        >
                          {UNIT_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input
                          type="number"
                          placeholder="Кол-во"
                          value={newSvc.qty}
                          onChange={(e) => setNewSvc({ ...newSvc, qty: parseInt(e.target.value) || 0 })}
                          className="h-8 px-2 border rounded text-sm text-center"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Цена"
                          value={newSvc.price}
                          onChange={(e) => setNewSvc({ ...newSvc, price: parseFloat(e.target.value) || 0 })}
                          className="h-8 px-2 border rounded text-sm text-center"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => addService(cat)} disabled={!newSvc.name.trim()}>
                          <Plus className="h-3 w-3 mr-1" /> Добавить
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingServiceCat(null)}>
                          Отмена
                        </Button>
                        {newSvc.qty > 0 && newSvc.price > 0 && (
                          <span className="text-xs text-muted-foreground self-center ml-auto">
                            Итого: {(newSvc.qty * newSvc.price).toLocaleString(undefined, { maximumFractionDigits: 2 })} {getCurrencySymbol()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {!hasServices && addingServiceCat !== cat && (
                    <div className="text-xs text-muted-foreground text-center py-2">Нет услуг</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add category */}
      {showAddCat ? (
        <div className="p-3 bg-green-50 rounded-lg space-y-2 border border-green-200">
          <div className="text-xs font-semibold text-green-700">Новая категория</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Название категории"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 h-8 px-2 border rounded text-sm"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <Button size="sm" onClick={addCategory} disabled={!newCatName.trim()}>
              <Plus className="h-3 w-3 mr-1" /> Добавить
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAddCat(false); setNewCatName("") }}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAddCat(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Добавить категорию
        </Button>
      )}
    </div>
  )
}
