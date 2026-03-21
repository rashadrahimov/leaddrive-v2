"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import {
  DollarSign, Download, Search, ChevronDown, ChevronRight,
  RotateCcw, Trash2, Loader2,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts"
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
      <input
        type="range"
        min={-50}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>-50%</span><span>0%</span><span>+100%</span>
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
  const orgId = session?.user?.organizationId

  const [pricingData, setPricingData] = useState<PricingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"model" | "edit">("model")
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

  const headers = orgId ? { "x-organization-id": String(orgId) } : {}

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/pricing/data", { headers: headers as any })
      const json = await res.json()
      if (json.success) setPricingData(json.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { if (session) fetchData() }, [session])

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

  const annualEffect = (adjTotal - baseTotal) * 12
  const avgChange = baseTotal > 0 ? ((adjTotal - baseTotal) / baseTotal) * 100 : 0

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
        <h1 className="text-2xl font-bold tracking-tight">Модель ценообразования ИТ-услуг</h1>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "model" ? "default" : "outline"}
            onClick={() => setActiveTab("model")}
          >
            Модель цен
          </Button>
          <Button
            variant={activeTab === "edit" ? "default" : "outline"}
            onClick={() => setActiveTab("edit")}
          >
            Редактировать цены
          </Button>
          <div className="relative">
            <Button variant="outline" onClick={() => setExportOpen(!exportOpen)}>
              <Download className="h-4 w-4 mr-1" /> Экспорт в Excel
            </Button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white border rounded-lg shadow-lg p-4 w-72 space-y-3">
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
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Общий ежемесячный доход"
              value={`${baseTotal.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼`}
              description="Базовая"
              icon={<DollarSign className="h-4 w-4" />}
            />
            <StatCard
              title="Прогнозируемый ежемесячный доход"
              value={`${adjTotal.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼`}
              description="Новая"
              trend={adjTotal >= baseTotal ? "up" : "down"}
            />
            <StatCard
              title="Годовой эффект"
              value={`${annualEffect.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₼`}
              description="Ежегодно"
              trend={annualEffect >= 0 ? "up" : "down"}
            />
            <StatCard
              title="Средняя корректировка"
              value={`${avgChange.toFixed(2)}%`}
              description="Разница"
              trend={avgChange >= 0 ? "up" : "down"}
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
                      <div className="text-xs font-semibold text-blue-600 mt-2">{group} ({comps.length})</div>
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
                        <Tooltip formatter={(v: number) => `${v.toLocaleString()} ₼`} />
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
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={catChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={110}
                          dataKey="value"
                          label={({ name, percent }) => `${name.substring(0, 15)}… ${(percent * 100).toFixed(0)}%`}
                          labelLine={{ strokeWidth: 1 }}
                        >
                          {catChartData.map((_, i) => (
                            <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `${v.toLocaleString()} ₼`} />
                      </PieChart>
                    </ResponsiveContainer>
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
                      <Tooltip formatter={(v: number) => `${v.toLocaleString()} ₼`} />
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
                            { key: "base", label: "Базовая ₼" },
                            { key: "new", label: "Новая ₼" },
                            { key: "diff", label: "Разница ₼" },
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
                            <td className="py-2 pr-4 text-right font-mono">{row.base.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼</td>
                            <td className="py-2 pr-4 text-right font-mono font-medium">{row.newVal.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼</td>
                            <td className={`py-2 pr-4 text-right font-mono ${row.diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {row.diff >= 0 ? "+" : ""}{row.diff.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₼
                            </td>
                            <td className={`py-2 pr-4 text-right font-mono ${row.pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {row.pct.toFixed(1)}%
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={-50}
                                  max={100}
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
            Редактируйте цены услуг для каждой компании. Изменения сохраняются автоматически.
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
                      <div className="text-xs font-semibold text-blue-600 px-3 py-1.5 bg-blue-50 sticky top-0">
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
                            {info.monthly.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼/ay
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
    </div>
  )
}

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

  useEffect(() => {
    setLocalCats(data.categories)
  }, [code, data])

  const toggleCat = (cat: string) => {
    const next = new Set(expandedCats)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    setExpandedCats(next)
  }

  const updateService = (cat: string, svcIdx: number, field: "qty" | "price", value: number) => {
    const catVal = localCats[cat]
    if (typeof catVal !== "object" || !("services" in catVal)) return
    const newServices = [...catVal.services]
    newServices[svcIdx] = { ...newServices[svcIdx], [field]: value, total: field === "qty" ? value * newServices[svcIdx].price : newServices[svcIdx].qty * value }
    const newTotal = newServices.reduce((s, svc) => s + svc.total, 0)
    const newCats = { ...localCats, [cat]: { total: Math.round(newTotal * 100) / 100, services: newServices } }
    setLocalCats(newCats)

    // Auto-save with debounce
    const timer = setTimeout(() => onSave(newCats), 800)
    return () => clearTimeout(timer)
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
          {saving && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Итого Ежемесячно</div>
          <div className="text-xl font-bold text-green-600">
            {monthly.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼
          </div>
          <div className="text-xs text-muted-foreground">
            Ежегодно: {annual.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {Object.entries(localCats).map(([cat, val]) => {
          const total = catTotal(val)
          const isExpanded = expandedCats.has(cat)
          const hasServices = typeof val === "object" && "services" in val && val.services.length > 0

          return (
            <div key={cat} className="border rounded-lg">
              <button
                onClick={() => hasServices && toggleCat(cat)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
              >
                <span className="text-sm">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-medium ${total > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    {total.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼
                  </span>
                  {hasServices && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                </div>
              </button>

              {isExpanded && hasServices && typeof val === "object" && "services" in val && (
                <div className="px-3 pb-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-xs">
                        <th className="text-left pb-1">Услуга</th>
                        <th className="text-center pb-1 w-24">Единица</th>
                        <th className="text-center pb-1 w-20">Кол-во</th>
                        <th className="text-center pb-1 w-24">Цена за ед.</th>
                        <th className="text-right pb-1 w-24">Итого</th>
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
                            {svc.total.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
