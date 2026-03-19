"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowUpDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ClientRow {
  id: string
  name: string
  cost_code: string
  user_count: number
  total_cost: number
  total_revenue: number
  margin: number
  margin_pct: number
  status: "good" | "low" | "loss" | "no_revenue"
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  good: { label: "Profitable", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  low: { label: "Low Margin", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  loss: { label: "Loss", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  no_revenue: { label: "No Revenue", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
}

// Mock client data based on v1 production
const MOCK_CLIENTS: ClientRow[] = [
  { id: "1", name: "Azərişıq", cost_code: "AZ-001", user_count: 850, total_cost: 52840.12, total_revenue: 68500.00, margin: 15659.88, margin_pct: 22.86, status: "good" },
  { id: "2", name: "SOCAR", cost_code: "SC-002", user_count: 1200, total_cost: 71283.50, total_revenue: 95000.00, margin: 23716.50, margin_pct: 24.96, status: "good" },
  { id: "3", name: "AzerGold", cost_code: "AG-003", user_count: 300, total_cost: 22150.80, total_revenue: 28000.00, margin: 5849.20, margin_pct: 20.89, status: "good" },
  { id: "4", name: "Bakcell", cost_code: "BC-004", user_count: 200, total_cost: 16734.20, total_revenue: 19500.00, margin: 2765.80, margin_pct: 14.18, status: "low" },
  { id: "5", name: "Azercell", cost_code: "AC-005", user_count: 180, total_cost: 15650.30, total_revenue: 17200.00, margin: 1549.70, margin_pct: 9.01, status: "low" },
  { id: "6", name: "AzInTelecom", cost_code: "AT-006", user_count: 150, total_cost: 13580.90, total_revenue: 12000.00, margin: -1580.90, margin_pct: -13.17, status: "loss" },
  { id: "7", name: "Nar Mobile", cost_code: "NM-007", user_count: 120, total_cost: 11200.60, total_revenue: 9800.00, margin: -1400.60, margin_pct: -14.29, status: "loss" },
  { id: "8", name: "AzərEnerji", cost_code: "AE-008", user_count: 100, total_cost: 9890.40, total_revenue: 8200.00, margin: -1690.40, margin_pct: -20.62, status: "loss" },
  { id: "9", name: "ZeytunPharma", cost_code: "ZP-009", user_count: 75, total_cost: 8120.30, total_revenue: 6500.00, margin: -1620.30, margin_pct: -24.93, status: "loss" },
  { id: "10", name: "Kapital Bank", cost_code: "KB-010", user_count: 500, total_cost: 35200.10, total_revenue: 48000.00, margin: 12799.90, margin_pct: 26.67, status: "good" },
  { id: "11", name: "ABB Bank", cost_code: "AB-011", user_count: 350, total_cost: 26400.50, total_revenue: 32000.00, margin: 5599.50, margin_pct: 17.50, status: "good" },
  { id: "12", name: "PASHA Bank", cost_code: "PB-012", user_count: 280, total_cost: 21200.30, total_revenue: 28500.00, margin: 7299.70, margin_pct: 25.61, status: "good" },
]

type SortField = "name" | "user_count" | "total_cost" | "total_revenue" | "margin" | "margin_pct"

export function ClientsTab() {
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>("margin")
  const [sortAsc, setSortAsc] = useState(true)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(field === "name")
    }
  }

  const filtered = MOCK_CLIENTS
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.cost_code.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortField]
      const vb = b[sortField]
      const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return sortAsc ? cmp : -cmp
    })

  const profitable = MOCK_CLIENTS.filter(c => c.status === "good").length
  const lossCount = MOCK_CLIENTS.filter(c => c.status === "loss").length
  const totalRevenue = MOCK_CLIENTS.reduce((s, c) => s + c.total_revenue, 0)
  const totalCost = MOCK_CLIENTS.reduce((s, c) => s + c.total_cost, 0)

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-normal text-muted-foreground hover:text-foreground" onClick={() => toggleSort(field)}>
      {children} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Clients</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{MOCK_CLIENTS.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Profitable</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{profitable}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Loss-Making</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{lossCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Margin</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalRevenue - totalCost >= 0 ? "text-green-600" : "text-red-600"}`}>
              {(totalRevenue - totalCost).toLocaleString("en", { minimumFractionDigits: 2 })} ₼
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Client Profitability</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4"><SortHeader field="name">Client</SortHeader></th>
                  <th className="pb-2 pr-4"><SortHeader field="user_count">Users</SortHeader></th>
                  <th className="pb-2 pr-4 text-right"><SortHeader field="total_revenue">Revenue</SortHeader></th>
                  <th className="pb-2 pr-4 text-right"><SortHeader field="total_cost">Cost</SortHeader></th>
                  <th className="pb-2 pr-4 text-right"><SortHeader field="margin">Margin</SortHeader></th>
                  <th className="pb-2 pr-4 text-right"><SortHeader field="margin_pct">Margin %</SortHeader></th>
                  <th className="pb-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => {
                  const style = STATUS_STYLES[client.status]
                  return (
                    <tr key={client.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 pr-4">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.cost_code}</p>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 font-mono">{client.user_count}</td>
                      <td className="py-2.5 pr-4 text-right font-mono">{client.total_revenue.toLocaleString("en", { minimumFractionDigits: 2 })} ₼</td>
                      <td className="py-2.5 pr-4 text-right font-mono">{client.total_cost.toLocaleString("en", { minimumFractionDigits: 2 })} ₼</td>
                      <td className={`py-2.5 pr-4 text-right font-mono font-medium ${client.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {client.margin >= 0 ? "+" : ""}{client.margin.toLocaleString("en", { minimumFractionDigits: 2 })} ₼
                      </td>
                      <td className={`py-2.5 pr-4 text-right font-mono font-medium ${client.margin_pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {client.margin_pct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge className={style.className}>{style.label}</Badge>
                      </td>
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
