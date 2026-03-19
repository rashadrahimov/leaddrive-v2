"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Save, RotateCcw } from "lucide-react"

interface PricingParams {
  total_users: number
  total_employees: number
  technical_staff: number
  back_office_staff: number
  monthly_work_hours: number
  vat_rate: number
  employer_tax_rate: number
  risk_rate: number
  misc_expense_rate: number
  fixed_overhead_ratio: number
}

const DEFAULT_PARAMS: PricingParams = {
  total_users: 4500,
  total_employees: 137,
  technical_staff: 107,
  back_office_staff: 30,
  monthly_work_hours: 160,
  vat_rate: 0.18,
  employer_tax_rate: 0.175,
  risk_rate: 0.05,
  misc_expense_rate: 0.01,
  fixed_overhead_ratio: 0.25,
}

interface FieldDef {
  key: keyof PricingParams
  label: string
  description: string
  type: "number" | "percentage"
  group: string
}

const FIELDS: FieldDef[] = [
  { key: "total_users", label: "Total Portfolio Users", description: "Total user count across all client companies", type: "number", group: "Headcount" },
  { key: "total_employees", label: "Total Employees", description: "All employees including back office", type: "number", group: "Headcount" },
  { key: "technical_staff", label: "Technical Staff", description: "Employees in technical departments", type: "number", group: "Headcount" },
  { key: "back_office_staff", label: "Back Office Staff", description: "Administrative and support employees", type: "number", group: "Headcount" },
  { key: "monthly_work_hours", label: "Monthly Work Hours", description: "Standard working hours per month", type: "number", group: "Headcount" },
  { key: "vat_rate", label: "VAT Rate", description: "Value-added tax rate applied to overhead costs", type: "percentage", group: "Tax Rates" },
  { key: "employer_tax_rate", label: "Employer Tax Rate", description: "Additional tax on gross salary", type: "percentage", group: "Tax Rates" },
  { key: "risk_rate", label: "Risk Rate", description: "Applied to Section F subtotal as contingency", type: "percentage", group: "Ratios" },
  { key: "misc_expense_rate", label: "Misc Expense Rate", description: "Miscellaneous costs as fraction of subtotal", type: "percentage", group: "Ratios" },
  { key: "fixed_overhead_ratio", label: "Fixed Overhead Ratio", description: "Fraction of costs allocated evenly (vs. per-user)", type: "percentage", group: "Ratios" },
]

export function ParametersTab() {
  const [params, setParams] = useState<PricingParams>({ ...DEFAULT_PARAMS })
  const [saved, setSaved] = useState(true)

  const updateParam = (key: keyof PricingParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    // TODO: API call to save parameters
    setSaved(true)
  }

  const handleReset = () => {
    setParams({ ...DEFAULT_PARAMS })
    setSaved(true)
  }

  const groups = Array.from(new Set(FIELDS.map(f => f.group)))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            These parameters control how the cost model calculates service costs and allocations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saved}>
            <Save className="h-4 w-4 mr-1" /> Save Changes
            {!saved && <Badge variant="destructive" className="ml-2 h-4 text-[10px]">Unsaved</Badge>}
          </Button>
        </div>
      </div>

      {groups.map(group => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{group}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {FIELDS.filter(f => f.group === group).map(field => (
              <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                <div>
                  <label className="text-sm font-medium">{field.label}</label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  {field.type === "percentage" ? (
                    <>
                      <Input
                        type="number"
                        step="0.1"
                        value={Math.round(params[field.key] * 10000) / 100}
                        onChange={e => updateParam(field.key, (parseFloat(e.target.value) || 0) / 100)}
                        className="w-32 text-right"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        (raw: {params[field.key]})
                      </span>
                    </>
                  ) : (
                    <Input
                      type="number"
                      value={params[field.key]}
                      onChange={e => updateParam(field.key, parseFloat(e.target.value) || 0)}
                      className="w-40 text-right"
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derived Values</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div className="flex justify-between p-2 rounded bg-muted/50">
              <span className="text-muted-foreground">Variable Overhead Ratio</span>
              <span className="font-mono font-medium">{((1 - params.fixed_overhead_ratio) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-muted/50">
              <span className="text-muted-foreground">Income Tax Rate (fixed)</span>
              <span className="font-mono font-medium">14%</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-muted/50">
              <span className="text-muted-foreground">Cost per User (est.)</span>
              <span className="font-mono font-medium">{params.total_users > 0 ? (645204.83 / params.total_users).toFixed(2) : "N/A"} ₼</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-muted/50">
              <span className="text-muted-foreground">Avg Salary Load Factor</span>
              <span className="font-mono font-medium">{((1 / (1 - 0.14)) * (1 + params.employer_tax_rate)).toFixed(4)}x</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
