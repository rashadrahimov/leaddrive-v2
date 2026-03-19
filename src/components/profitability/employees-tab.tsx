"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Check, X, Pencil } from "lucide-react"

interface Employee {
  id: string
  department: string
  position: string
  count: number
  net_salary: number
  in_overhead: boolean
  gross_salary?: number
  super_gross?: number
  total_labor_cost?: number
}

const INCOME_TAX_RATE = 0.14
const EMPLOYER_TAX_RATE = 0.175

function calcGross(net: number): number {
  return net / (1 - INCOME_TAX_RATE)
}

function calcSuperGross(gross: number): number {
  return gross * (1 + EMPLOYER_TAX_RATE)
}

function calcTotal(net: number, count: number): number {
  return count * calcSuperGross(calcGross(net))
}

const DEPARTMENTS = ["BackOffice", "IT", "InfoSec", "HelpDesk", "ERP", "GRC", "PM"]

const DEPT_COLORS: Record<string, string> = {
  BackOffice: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  IT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  InfoSec: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  HelpDesk: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  ERP: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  GRC: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  PM: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "1", department: "BackOffice", position: "BackOffice (17 people)", count: 17, net_salary: 4705.88, in_overhead: true },
  { id: "2", department: "ERP", position: "ERP Specialist", count: 6, net_salary: 3177.18, in_overhead: false },
  { id: "3", department: "GRC", position: "GRC Specialist", count: 8, net_salary: 2451.76, in_overhead: false },
  { id: "4", department: "HelpDesk", position: "HelpDesk Operator", count: 56, net_salary: 1737.28, in_overhead: false },
  { id: "5", department: "InfoSec", position: "InfoSec Engineer", count: 12, net_salary: 3603.90, in_overhead: false },
  { id: "6", department: "IT", position: "SysAdmin", count: 8, net_salary: 2992.22, in_overhead: false },
  { id: "7", department: "IT", position: "NetAdmin", count: 8, net_salary: 3538.82, in_overhead: false },
  { id: "8", department: "IT", position: "Zəng Mərkəzi", count: 4, net_salary: 1737.28, in_overhead: false },
  { id: "9", department: "PM", position: "Project Manager", count: 5, net_salary: 3389.60, in_overhead: false },
]

export function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES)
  const [filterDept, setFilterDept] = useState<string>("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Employee>>({})

  const filtered = filterDept === "all" ? employees : employees.filter(e => e.department === filterDept)

  const totalHeadcount = employees.reduce((s, e) => s + e.count, 0)
  const totalLaborCost = employees.reduce((s, e) => s + calcTotal(e.net_salary, e.count), 0)
  const deptSummary = DEPARTMENTS.map(d => ({
    dept: d,
    count: employees.filter(e => e.department === d).reduce((s, e) => s + e.count, 0),
    cost: employees.filter(e => e.department === d).reduce((s, e) => s + calcTotal(e.net_salary, e.count), 0),
  })).filter(d => d.count > 0)

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id)
    setEditForm({ ...emp })
  }

  const saveEdit = () => {
    if (!editingId) return
    setEmployees(prev => prev.map(e => e.id === editingId ? { ...e, ...editForm } as Employee : e))
    setEditingId(null)
    setEditForm({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const deleteItem = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
  }

  const addItem = () => {
    const newId = String(Date.now())
    const newEmp: Employee = {
      id: newId,
      department: "IT",
      position: "New Position",
      count: 1,
      net_salary: 0,
      in_overhead: false,
    }
    setEmployees(prev => [...prev, newEmp])
    startEdit(newEmp)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Headcount</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalHeadcount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Labor Cost/mo</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{Math.round(totalLaborCost).toLocaleString()} ₼</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Departments</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{deptSummary.length}</p></CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={filterDept === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterDept("all")}>
          All ({totalHeadcount})
        </Button>
        {deptSummary.map(d => (
          <Button key={d.dept} variant={filterDept === d.dept ? "default" : "outline"} size="sm" onClick={() => setFilterDept(d.dept)}>
            {d.dept} ({d.count})
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Employee Roster ({filtered.length} positions)</CardTitle>
          <Button size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Add Position
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Department</th>
                  <th className="pb-2 pr-4">Position</th>
                  <th className="pb-2 pr-4 text-right">Count</th>
                  <th className="pb-2 pr-4 text-right">Net Salary</th>
                  <th className="pb-2 pr-4 text-right">Gross</th>
                  <th className="pb-2 pr-4 text-right">Super Gross</th>
                  <th className="pb-2 pr-4 text-right">Total Cost/mo</th>
                  <th className="pb-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => {
                  const isEditing = editingId === emp.id
                  const gross = calcGross(emp.net_salary)
                  const superGross = calcSuperGross(gross)
                  const total = calcTotal(emp.net_salary, emp.count)

                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/50">
                      {isEditing ? (
                        <>
                          <td className="py-2 pr-4">
                            <select
                              value={editForm.department || "IT"}
                              onChange={e => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                              className="h-8 rounded-md border bg-background px-2 text-sm"
                            >
                              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </td>
                          <td className="py-2 pr-4">
                            <Input
                              value={editForm.position || ""}
                              onChange={e => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <Input
                              type="number"
                              value={editForm.count || 1}
                              onChange={e => setEditForm(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                              className="h-8 text-sm w-20 text-right"
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <Input
                              type="number"
                              value={editForm.net_salary || 0}
                              onChange={e => setEditForm(prev => ({ ...prev, net_salary: parseFloat(e.target.value) || 0 }))}
                              className="h-8 text-sm w-28 text-right"
                            />
                          </td>
                          <td className="py-2 pr-4 text-right font-mono text-muted-foreground">
                            {calcGross(editForm.net_salary || 0).toFixed(2)}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono text-muted-foreground">
                            {calcSuperGross(calcGross(editForm.net_salary || 0)).toFixed(2)}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono font-medium">
                            {calcTotal(editForm.net_salary || 0, editForm.count || 1).toLocaleString("en", { minimumFractionDigits: 2 })} ₼
                          </td>
                          <td className="py-2 flex gap-1">
                            <Button variant="ghost" size="sm" onClick={saveEdit} className="h-7 w-7 p-0">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 w-7 p-0">
                              <X className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 pr-4">
                            <Badge className={DEPT_COLORS[emp.department] || ""}>{emp.department}</Badge>
                          </td>
                          <td className="py-2.5 pr-4 font-medium">{emp.position}</td>
                          <td className="py-2.5 pr-4 text-right font-mono">{emp.count}</td>
                          <td className="py-2.5 pr-4 text-right font-mono">{emp.net_salary.toLocaleString("en", { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-muted-foreground">{gross.toFixed(2)}</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-muted-foreground">{superGross.toFixed(2)}</td>
                          <td className="py-2.5 pr-4 text-right font-mono font-medium">{total.toLocaleString("en", { minimumFractionDigits: 2 })} ₼</td>
                          <td className="py-2.5 flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(emp)} className="h-7 w-7 p-0">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteItem(emp.id)} className="h-7 w-7 p-0">
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
