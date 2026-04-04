"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Save, TrendingUp } from "lucide-react"

interface Department {
  id: string
  key: string
  label: string
  hasRevenue: boolean
  sortOrder: number
  isActive: boolean
}

interface ForecastEntry {
  id: string
  departmentId: string
  month: number
  amount: number
  budgetDept: { id: string; key: string; label: string }
}

const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
const VAT_RATE = 0.18

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

export function SalesForecastTab() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId

  const [departments, setDepartments] = useState<Department[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [grid, setGrid] = useState<Record<string, Record<number, number>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showVat, setShowVat] = useState(false)

  const headers: Record<string, string> = orgId
    ? { "x-organization-id": String(orgId), "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [deptRes, fcRes] = await Promise.all([
        fetch("/api/budgeting/departments?includeInactive=false", { headers }),
        fetch(`/api/budgeting/sales-forecast?year=${year}`, { headers }),
      ])

      if (deptRes.ok) {
        const deptData = (await deptRes.json()).data || []
        setDepartments(deptData.filter((d: Department) => d.hasRevenue && d.isActive))
      }

      const newGrid: Record<string, Record<number, number>> = {}
      if (fcRes.ok) {
        const entries: ForecastEntry[] = (await fcRes.json()).data || []
        for (const e of entries) {
          if (!newGrid[e.departmentId]) newGrid[e.departmentId] = {}
          newGrid[e.departmentId][e.month] = e.amount
        }
      }
      setGrid(newGrid)
    } catch (err) {
      console.error("Failed to load forecast data:", err)
    } finally {
      setLoading(false)
    }
  }, [year, orgId])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  const getVal = (deptId: string, month: number): number => {
    const base = grid[deptId]?.[month] || 0
    return showVat ? base * (1 + VAT_RATE) : base
  }

  const setCell = (deptId: string, month: number, displayValue: number) => {
    const storeValue = showVat ? displayValue / (1 + VAT_RATE) : displayValue
    setGrid((prev) => ({
      ...prev,
      [deptId]: { ...(prev[deptId] || {}), [month]: storeValue },
    }))
    setSaved(false)
  }

  const rowTotal = (deptId: string): number => {
    const row = grid[deptId] || {}
    const base = Object.values(row).reduce((s, v) => s + (v || 0), 0)
    return showVat ? base * (1 + VAT_RATE) : base
  }

  const colTotal = (month: number): number =>
    departments.reduce((s, d) => s + getVal(d.id, month), 0)

  const grandTotal = (): number =>
    departments.reduce((s, d) => s + rowTotal(d.id), 0)

  const colVat = (month: number): number =>
    departments.reduce((s, d) => s + (grid[d.id]?.[month] || 0) * VAT_RATE, 0)

  const rowVat = (deptId: string): number => {
    const row = grid[deptId] || {}
    return Object.values(row).reduce((s, v) => s + (v || 0), 0) * VAT_RATE
  }

  const grandVat = (): number =>
    departments.reduce((s, d) => s + rowVat(d.id), 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      const entries: Array<{ departmentId: string; month: number; amount: number }> = []
      for (const dept of departments) {
        for (let m = 1; m <= 12; m++) {
          entries.push({ departmentId: dept.id, month: m, amount: grid[dept.id]?.[m] || 0 })
        }
      }
      const res = await fetch("/api/budgeting/sales-forecast", {
        method: "POST",
        headers,
        body: JSON.stringify({ year, entries }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error("Failed to save forecast:", err)
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
            <TrendingUp className="h-5 w-5" />
            Прогноз продаж
          </h2>
          <p className="text-xs text-muted-foreground">
            Ежегодный прогноз доходов по сервисам. Хранится без НДС — при переключении показывается с НДС (18%).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showVat}
              onChange={(e) => setShowVat(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            С НДС (18%)
          </label>
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
            {saved ? "Сохранено ✓" : "Сохранить"}
          </Button>
        </div>
      </div>

      {/* Grid */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {year} год — {departments.length} сервисов
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {showVat ? "Суммы с НДС 18%" : "Суммы без НДС (нетто)"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-2 border font-medium sticky left-0 bg-muted/50 min-w-[140px] z-10">
                    Сервис
                  </th>
                  {MONTHS.map((m, i) => (
                    <th key={i} className="text-right p-2 border font-medium min-w-[95px]">
                      {m}
                    </th>
                  ))}
                  <th className="text-right p-2 border font-semibold min-w-[110px] bg-blue-50 dark:bg-blue-950">
                    Итого
                  </th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-muted/30">
                    <td className="p-2 border font-medium sticky left-0 bg-background z-10">
                      {dept.label}
                    </td>
                    {MONTHS.map((_, mi) => {
                      const month = mi + 1
                      const displayVal = getVal(dept.id, month)
                      return (
                        <td key={mi} className="p-1 border">
                          <Input
                            type="number"
                            className="h-8 text-right text-xs tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={displayVal ? Math.round(displayVal) : ""}
                            placeholder="0"
                            onChange={(e) => setCell(dept.id, month, Number(e.target.value) || 0)}
                          />
                        </td>
                      )
                    })}
                    <td className="p-2 border text-right font-semibold tabular-nums bg-blue-50 dark:bg-blue-950">
                      {fmt(rowTotal(dept.id))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* VAT row */}
                <tr className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs">
                  <td className="p-2 border sticky left-0 bg-amber-50 dark:bg-amber-950/30 z-10 font-medium">
                    НДС (18%)
                  </td>
                  {MONTHS.map((_, mi) => (
                    <td key={mi} className="p-2 border text-right tabular-nums">
                      {fmt(colVat(mi + 1))}
                    </td>
                  ))}
                  <td className="p-2 border text-right tabular-nums font-medium bg-amber-100 dark:bg-amber-900/30">
                    {fmt(grandVat())}
                  </td>
                </tr>
                {/* Total row */}
                <tr className="bg-muted/70 font-semibold">
                  <td className="p-2 border sticky left-0 bg-muted/70 z-10">
                    ИТОГО {showVat ? "(с НДС)" : "(без НДС)"}
                  </td>
                  {MONTHS.map((_, mi) => (
                    <td key={mi} className="p-2 border text-right tabular-nums">
                      {fmt(colTotal(mi + 1))}
                    </td>
                  ))}
                  <td className="p-2 border text-right tabular-nums bg-blue-100 dark:bg-blue-900">
                    {fmt(grandTotal())}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
