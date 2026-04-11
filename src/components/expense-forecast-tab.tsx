"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, TrendingDown, Info } from "lucide-react"

interface CostType {
  id: string
  key: string
  label: string
  isShared: boolean
  sortOrder: number
  isActive: boolean
}

interface Department {
  id: string
  key: string
  label: string
  serviceKey: string | null
  sortOrder: number
  isActive: boolean
}

interface ForecastEntry {
  id: string
  costTypeId: string
  departmentId: string | null
  month: number
  amount: number
}

/** A row in the grid: costType + optional department */
interface GridRow {
  costTypeId: string
  departmentId: string | null
  label: string
  costTypeLabel: string
  deptLabel: string | null
}

const MONTH_KEYS = ["monthShort_jan", "monthShort_feb", "monthShort_mar", "monthShort_apr", "monthShort_may", "monthShort_jun", "monthShort_jul", "monthShort_aug", "monthShort_sep", "monthShort_oct", "monthShort_nov", "monthShort_dec"] as const

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

/** Compose a unique key for grid cell lookup */
function rowKey(costTypeId: string, departmentId: string | null): string {
  return `${costTypeId}__${departmentId ?? "shared"}`
}

export function ExpenseForecastTab() {
  const t = useTranslations("budgeting")
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId

  const [costTypes, setCostTypes] = useState<CostType[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  // grid: { "costTypeId__deptId": { month: amount } }
  const [grid, setGrid] = useState<Record<string, Record<number, number>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasCostModel, setHasCostModel] = useState(false)

  const headers: Record<string, string> = orgId
    ? { "x-organization-id": String(orgId), "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ctRes, deptRes, fcRes, cmRes] = await Promise.all([
        fetch("/api/budgeting/cost-types?includeInactive=false", { headers }),
        fetch("/api/budgeting/departments?includeInactive=false", { headers }),
        fetch(`/api/budgeting/expense-forecast?year=${year}`, { headers }),
        fetch("/api/cost-model/compute", { headers }).catch(() => null),
      ])

      if (ctRes.ok) {
        const data = (await ctRes.json()).data || []
        setCostTypes(data.filter((ct: CostType) => ct.isActive))
      }

      if (deptRes.ok) {
        const data = (await deptRes.json()).data || []
        setDepartments(data.filter((d: Department) => d.isActive))
      }

      // Check if cost model has data
      if (cmRes && cmRes.ok) {
        const cmData = await cmRes.json()
        setHasCostModel(!!cmData?.data?.grandTotalG && cmData.data.grandTotalG > 0)
      } else {
        setHasCostModel(false)
      }

      const newGrid: Record<string, Record<number, number>> = {}
      if (fcRes.ok) {
        const entries: ForecastEntry[] = (await fcRes.json()).data || []
        for (const e of entries) {
          const key = rowKey(e.costTypeId, e.departmentId)
          if (!newGrid[key]) newGrid[key] = {}
          newGrid[key][e.month] = e.amount
        }
      }
      setGrid(newGrid)
    } catch (err) {
      console.error("Failed to load expense forecast data:", err)
    } finally {
      setLoading(false)
    }
  }, [year, orgId])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  // Build grid rows from costType × department
  const gridRows: GridRow[] = []
  for (const ct of costTypes) {
    if (ct.isShared) {
      gridRows.push({
        costTypeId: ct.id,
        departmentId: null,
        label: ct.label,
        costTypeLabel: ct.label,
        deptLabel: null,
      })
    } else {
      for (const dept of departments) {
        if (!dept.serviceKey) continue
        gridRows.push({
          costTypeId: ct.id,
          departmentId: dept.id,
          label: `${ct.label} — ${dept.label}`,
          costTypeLabel: ct.label,
          deptLabel: dept.label,
        })
      }
    }
  }

  const getVal = (rk: string, month: number): number => grid[rk]?.[month] || 0

  const setCell = (rk: string, month: number, value: number) => {
    setGrid((prev) => ({
      ...prev,
      [rk]: { ...(prev[rk] || {}), [month]: value },
    }))
    setSaved(false)
  }

  const rowTotal = (rk: string): number => {
    const row = grid[rk] || {}
    return Object.values(row).reduce((s, v) => s + (v || 0), 0)
  }

  const colTotal = (month: number): number =>
    gridRows.reduce((s, r) => s + getVal(rowKey(r.costTypeId, r.departmentId), month), 0)

  const grandTotal = (): number =>
    gridRows.reduce((s, r) => s + rowTotal(rowKey(r.costTypeId, r.departmentId)), 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      const entries: Array<{ costTypeId: string; departmentId: string | null; month: number; amount: number }> = []
      for (const row of gridRows) {
        const rk = rowKey(row.costTypeId, row.departmentId)
        for (let m = 1; m <= 12; m++) {
          entries.push({
            costTypeId: row.costTypeId,
            departmentId: row.departmentId,
            month: m,
            amount: grid[rk]?.[m] || 0,
          })
        }
      }
      const res = await fetch("/api/budgeting/expense-forecast", {
        method: "POST",
        headers,
        body: JSON.stringify({ year, entries }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error("Failed to save expense forecast:", err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            {t("expenseForecast_title")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("expenseForecast_subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {saved ? t("expenseForecast_saved") : t("expenseForecast_save")}
          </Button>
        </div>
      </div>

      {/* Cost model info banner */}
      {hasCostModel && (
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-3">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <strong>{t("expenseForecast_costModelActive")}</strong> {t("expenseForecast_costModelDesc")}
          </div>
        </div>
      )}

      {/* Grid */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {t("expenseForecast_yearCategories", { year, count: gridRows.length })}
            </CardTitle>
            <span className="text-xs text-muted-foreground">{t("expenseForecast_amountsInAzn")}</span>
          </div>
        </CardHeader>
        <CardContent>
          {gridRows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {t("expenseForecast_noCostTypes")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 border font-medium sticky left-0 bg-muted/50 min-w-[200px] z-10">
                      {t("expenseForecast_category")}
                    </th>
                    {MONTH_KEYS.map((mk, i) => (
                      <th key={i} className="text-right p-2 border font-medium min-w-[95px]">
                        {t(mk)}
                      </th>
                    ))}
                    <th className="text-right p-2 border font-semibold min-w-[110px] bg-red-50 dark:bg-red-950">
                      {t("expenseForecast_total")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gridRows.map((row) => {
                    const rk = rowKey(row.costTypeId, row.departmentId)
                    return (
                      <tr key={rk} className="hover:bg-muted/30">
                        <td className="p-2 border font-medium sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{row.label}</span>
                            {!row.departmentId && (
                              <Badge variant="outline" className="text-[9px] shrink-0">{t("expenseForecast_shared")}</Badge>
                            )}
                          </div>
                        </td>
                        {MONTH_KEYS.map((_, mi) => {
                          const month = mi + 1
                          const val = getVal(rk, month)
                          return (
                            <td key={mi} className="p-1 border">
                              <Input
                                type="number"
                                className="h-8 text-right text-xs tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={val ? Math.round(val) : ""}
                                placeholder="0"
                                onChange={(e) => setCell(rk, month, Number(e.target.value) || 0)}
                              />
                            </td>
                          )
                        })}
                        <td className="p-2 border text-right font-semibold tabular-nums bg-red-50 dark:bg-red-950">
                          {fmt(rowTotal(rk))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/70 font-semibold">
                    <td className="p-2 border sticky left-0 bg-muted/70 z-10">{t("expenseForecast_totalRow")}</td>
                    {MONTH_KEYS.map((_, mi) => (
                      <td key={mi} className="p-2 border text-right tabular-nums">
                        {fmt(colTotal(mi + 1))}
                      </td>
                    ))}
                    <td className="p-2 border text-right tabular-nums bg-red-100 dark:bg-red-900">
                      {fmt(grandTotal())}
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
