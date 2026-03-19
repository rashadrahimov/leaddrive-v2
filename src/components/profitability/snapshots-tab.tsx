"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, Calendar, TrendingUp, TrendingDown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

interface Snapshot {
  id: string
  month: string
  label: string
  grand_total_g: number
  grand_total_f: number
  admin_overhead: number
  tech_infra: number
  total_revenue: number
  total_margin: number
  margin_pct: number
  total_users: number
  created_at: string
}

const MOCK_SNAPSHOTS: Snapshot[] = [
  { id: "1", month: "2025-10", label: "Oct 2025", grand_total_g: 628450.12, grand_total_f: 450200.30, admin_overhead: 190500.00, tech_infra: 95200.40, total_revenue: 590000.00, total_margin: -38450.12, margin_pct: -6.52, total_users: 4200, created_at: "2025-11-01" },
  { id: "2", month: "2025-11", label: "Nov 2025", grand_total_g: 632100.50, grand_total_f: 453890.20, admin_overhead: 192300.80, tech_infra: 96500.10, total_revenue: 598500.00, total_margin: -33600.50, margin_pct: -5.61, total_users: 4280, created_at: "2025-12-01" },
  { id: "3", month: "2025-12", label: "Dec 2025", grand_total_g: 638700.30, grand_total_f: 458100.50, admin_overhead: 195100.20, tech_infra: 97300.80, total_revenue: 605200.00, total_margin: -33500.30, margin_pct: -5.54, total_users: 4350, created_at: "2026-01-01" },
  { id: "4", month: "2026-01", label: "Jan 2026", grand_total_g: 641200.80, grand_total_f: 460300.10, admin_overhead: 196500.50, tech_infra: 98100.30, total_revenue: 610500.00, total_margin: -30700.80, margin_pct: -5.03, total_users: 4400, created_at: "2026-02-01" },
  { id: "5", month: "2026-02", label: "Feb 2026", grand_total_g: 643800.40, grand_total_f: 461500.60, admin_overhead: 197100.30, tech_infra: 98400.20, total_revenue: 614000.00, total_margin: -29800.40, margin_pct: -4.86, total_users: 4450, created_at: "2026-03-01" },
  { id: "6", month: "2026-03", label: "Mar 2026", grand_total_g: 645204.83, grand_total_f: 462678.81, admin_overhead: 197654.94, tech_infra: 98661.62, total_revenue: 617019.95, total_margin: -28184.88, margin_pct: -4.57, total_users: 4500, created_at: "2026-03-18" },
]

const TREND_DATA = MOCK_SNAPSHOTS.map(s => ({
  name: s.label,
  cost: Math.round(s.grand_total_g),
  revenue: Math.round(s.total_revenue),
  margin: Math.round(s.total_margin),
}))

export function SnapshotsTab() {
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-03")
  const selected = MOCK_SNAPSHOTS.find(s => s.month === selectedMonth)
  const prevSnapshot = MOCK_SNAPSHOTS[MOCK_SNAPSHOTS.findIndex(s => s.month === selectedMonth) - 1]

  const calcChange = (current: number, prev: number | undefined): { value: string; positive: boolean } | null => {
    if (prev === undefined) return null
    const diff = current - prev
    const pct = prev !== 0 ? (diff / prev * 100).toFixed(1) : "0"
    return { value: `${diff >= 0 ? "+" : ""}${pct}%`, positive: diff >= 0 }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {MOCK_SNAPSHOTS.map(s => (
              <option key={s.month} value={s.month}>{s.label}</option>
            ))}
          </select>
          {selected && (
            <span className="text-xs text-muted-foreground">Saved: {selected.created_at}</span>
          )}
        </div>
        <Button size="sm">
          <Camera className="h-4 w-4 mr-1" /> Save Current Snapshot
        </Button>
      </div>

      {selected && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Grand Total G</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{selected.grand_total_g.toLocaleString("en", { minimumFractionDigits: 2 })} ₼</p>
                {prevSnapshot && (
                  <p className={`text-xs ${calcChange(selected.grand_total_g, prevSnapshot.grand_total_g)?.positive ? "text-red-600" : "text-green-600"}`}>
                    {calcChange(selected.grand_total_g, prevSnapshot.grand_total_g)?.value} vs prev
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{selected.total_revenue.toLocaleString("en", { minimumFractionDigits: 2 })} ₼</p>
                {prevSnapshot && (
                  <p className={`text-xs ${calcChange(selected.total_revenue, prevSnapshot.total_revenue)?.positive ? "text-green-600" : "text-red-600"}`}>
                    {calcChange(selected.total_revenue, prevSnapshot.total_revenue)?.value} vs prev
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Margin</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-xl font-bold ${selected.total_margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {selected.total_margin.toLocaleString("en", { minimumFractionDigits: 2 })} ₼
                </p>
                <p className="text-xs text-muted-foreground">{selected.margin_pct}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Users</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{selected.total_users.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  Cost/user: {(selected.grand_total_g / selected.total_users).toFixed(2)} ₼
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Cost vs Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="cost" fill="hsl(var(--destructive))" name="Cost" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" /> Margin Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="margin" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Margin" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Snapshot History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Month</th>
                      <th className="pb-2 pr-4 text-right">Grand Total G</th>
                      <th className="pb-2 pr-4 text-right">Revenue</th>
                      <th className="pb-2 pr-4 text-right">Margin</th>
                      <th className="pb-2 pr-4 text-right">Users</th>
                      <th className="pb-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_SNAPSHOTS.map(s => (
                      <tr
                        key={s.id}
                        className={`border-b last:border-0 hover:bg-muted/50 cursor-pointer ${s.month === selectedMonth ? "bg-muted/50" : ""}`}
                        onClick={() => setSelectedMonth(s.month)}
                      >
                        <td className="py-2.5 pr-4 font-medium">{s.label}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{s.grand_total_g.toLocaleString("en", { minimumFractionDigits: 2 })}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{s.total_revenue.toLocaleString("en", { minimumFractionDigits: 2 })}</td>
                        <td className={`py-2.5 pr-4 text-right font-mono ${s.total_margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {s.total_margin.toLocaleString("en", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono">{s.total_users.toLocaleString()}</td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={s.total_margin >= 0 ? "default" : "destructive"}>
                            {s.margin_pct}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
