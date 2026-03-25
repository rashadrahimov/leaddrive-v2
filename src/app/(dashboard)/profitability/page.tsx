"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ColorStatCard } from "@/components/color-stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calculator, TrendingUp, TrendingDown, Users, DollarSign, Loader2, ChevronDown, ChevronRight } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import { useTranslations } from "next-intl"
import { useCostModelAnalytics } from "@/lib/cost-model/hooks"
import { SERVICE_LABELS, SERVICE_TYPES } from "@/lib/cost-model/types"
import type { ServiceType } from "@/lib/cost-model/types"
import { OverheadTab } from "@/components/profitability/overhead-tab"
import { ClientsTab } from "@/components/profitability/clients-tab"
import { EmployeesTab } from "@/components/profitability/employees-tab"
import { ParametersTab } from "@/components/profitability/parameters-tab"
import { AIObservations } from "@/components/profitability/ai-observations"

const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444", "#10b981"]

function fmt(n: number): string {
  return Math.round(n).toLocaleString() + " ₼"
}

function CostBreakdown({ data }: { data: any }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

  const adminOhItems = (data.overheadBreakdown || []).filter((o: any) => o.isAdmin)
  const techItems = (data.overheadBreakdown || []).filter((o: any) => !o.isAdmin)
  const directLabor = Object.values(data.deptCosts as Record<string, number>).reduce((s, v) => s + v, 0)

  // BackOffice and GRC employees (in overhead)
  const boEmployees = (data.employees || []).filter((e: any) => e.department === "BackOffice")
  const grcEmployees = (data.employees || []).filter((e: any) => e.inOverhead && e.department !== "BackOffice")
  const adminOhItemsList = [
    ...adminOhItems.map((o: any) => ({ label: o.label, value: o.monthlyAmount, isSalary: false })),
    { label: "_separator", value: 0, isSalary: false },
    ...boEmployees.map((e: any) => ({ label: `BackOffice (${e.count} ppl.)`, value: e.totalLaborCost, isSalary: true })),
    ...grcEmployees.map((e: any) => ({ label: `Overhead employees (${e.count} ppl.)`, value: e.totalLaborCost, isSalary: true })),
  ]

  const sections = [
    {
      key: "admin",
      color: PIE_COLORS[0],
      label: "Admin Overhead",
      value: data.adminOverhead,
      pct: ((data.adminOverhead / data.grandTotalF) * 100).toFixed(1),
      items: adminOhItemsList,
      note: "Distributed by headcount ratio",
    },
    {
      key: "tech",
      color: PIE_COLORS[1],
      label: "Technical Infrastructure",
      value: data.techInfraTotal,
      pct: ((data.techInfraTotal / data.grandTotalF) * 100).toFixed(1),
      items: techItems.map((o: any) => ({ label: o.label, value: o.monthlyAmount })),
      note: "Distributed directly to services by target_service",
    },
    {
      key: "labor",
      color: PIE_COLORS[2],
      label: "Direct Labor Costs",
      value: directLabor,
      pct: ((directLabor / data.grandTotalF) * 100).toFixed(1),
      items: (data.employees || [])
        .filter((e: any) => e.department !== "BackOffice" && !e.inOverhead)
        .map((e: any) => ({
          label: `${e.department} — ${e.position} (${e.count} ppl.)`,
          value: e.totalLaborCost,
        })),
      note: null,
    },
    {
      key: "misc",
      color: PIE_COLORS[3],
      label: `Travel ${((data.params?.miscExpenseRate || 0.01) * 100).toFixed(0)}%`,
      value: data.misc,
      pct: ((data.misc / data.grandTotalF) * 100).toFixed(1),
      items: [],
      note: null,
    },
    {
      key: "risk",
      color: PIE_COLORS[4],
      label: `Risk ${((data.params?.riskRate || 0.05) * 100).toFixed(0)}%`,
      value: data.riskCost,
      pct: ((data.riskCost / data.grandTotalF) * 100).toFixed(1),
      items: [],
      note: null,
    },
  ]

  return (
    <div className="mt-6 space-y-0.5 text-sm">
      {sections.map((sec) => (
        <div key={sec.key}>
          <button
            onClick={() => sec.items.length > 0 && toggle(sec.key)}
            className={`flex w-full items-center gap-2.5 py-2.5 px-3 rounded-lg transition-colors ${
              sec.items.length > 0 ? "hover:bg-muted/60 cursor-pointer" : "cursor-default"
            }`}
          >
            <span className="h-3 w-3 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm" style={{ backgroundColor: sec.color }} />
            {sec.items.length > 0 ? (
              expanded[sec.key]
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <span className="w-4" />
            )}
            <span className="font-semibold flex-1 text-left">{sec.label}</span>
            <span className="font-mono text-muted-foreground tabular-nums">
              {Math.round(sec.value).toLocaleString()} <span className="text-xs">₼</span>
            </span>
          </button>
          {expanded[sec.key] && sec.items.length > 0 && (
            <div className="ml-11 mr-2 mb-3 rounded-lg border bg-muted/20 overflow-hidden">
              {sec.items.map((item: any, i: number) =>
                item.label === "_separator" ? (
                  <div key={i} className="border-t border-dashed mx-3" />
                ) : (
                  <div key={i} className={`flex justify-between py-1.5 px-3 text-xs ${
                    item.isSalary ? "bg-blue-50/50 dark:bg-blue-950/20 font-medium text-foreground" : "text-muted-foreground"
                  } ${i > 0 && sec.items[i-1]?.label !== "_separator" ? "border-t border-muted/30" : ""}`}>
                    <span className="pr-4">{item.label}</span>
                    <span className="font-mono tabular-nums flex-shrink-0">
                      {Math.round(item.value).toLocaleString()} ₼
                    </span>
                  </div>
                )
              )}
              {sec.note && (
                <div className="px-3 py-2 bg-muted/30 border-t text-[10px] italic text-muted-foreground">{sec.note}</div>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="border-t mt-3 pt-3 space-y-1.5 px-3">
        <div className="flex justify-between font-medium">
          <span>Total Cost (F)</span>
          <span className="font-mono tabular-nums">{fmt(data.grandTotalF)}</span>
        </div>
        <div className="flex justify-between font-semibold text-blue-600">
          <span>Full Service Cost (G)</span>
          <span className="font-mono tabular-nums">{fmt(data.grandTotalG)}</span>
        </div>
      </div>

      <div className="px-3 mt-3 pt-3 border-t text-[10px] text-muted-foreground space-y-0.5">
        <p><strong>Sec F</strong> — Min. cost: Admin OH + Tech + IT/InfoSec + Travel + Risk</p>
        <p><strong>Sec G</strong> — Full cost: All departments + admin allocation + tech direct</p>
        <p><strong>Allocation:</strong> {((data.params?.fixedOverheadRatio || 0.25) * 100).toFixed(0)}% fixed + {((1 - (data.params?.fixedOverheadRatio || 0.25)) * 100).toFixed(0)}% variable</p>
      </div>
    </div>
  )
}

export default function ProfitabilityPage() {
  const t = useTranslations("profitability")
  const [activeTab, setActiveTab] = useState("analytics")
  const { data, isLoading, isError } = useCostModelAnalytics()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6" /> {t("title")}
        </h1>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6" /> {t("title")}
        </h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Failed to load data. Check parameters and overheads.
          </CardContent>
        </Card>
      </div>
    )
  }

  const {
    grandTotalF,
    grandTotalG,
    adminOverhead,
    techInfraTotal,
    deptCosts,
    misc,
    riskCost,
    serviceCosts,
    serviceRevenues,
    serviceClients,
    serviceDetails,
    summary,
    totalUsers,
    costPerUserF,
  } = data

  // ── Pie chart data: cost composition ──
  const directLabor = Object.values(deptCosts).reduce((s, v) => s + v, 0)
  const costComposition = [
    { name: "Admin OH", value: Math.round(adminOverhead) },
    { name: "Tech Infra", value: Math.round(techInfraTotal) },
    { name: "Direct Labor", value: Math.round(directLabor) },
    { name: "Travel", value: Math.round(misc) },
    { name: "Risk", value: Math.round(riskCost) },
  ].filter((c) => c.value > 0)

  // ── Bar chart data: service cost vs revenue ──
  const serviceBarData = SERVICE_TYPES.map((svc) => {
    const cost = serviceCosts[svc] || 0
    const revenue = serviceRevenues[svc] || 0
    return {
      name: SERVICE_LABELS[svc],
      svc,
      Cost: Math.round(cost),
      Revenue: Math.round(revenue),
      balance: Math.round(revenue - cost),
    }
  })

  // ── Services tab helpers ──
  const totalServiceCost = SERVICE_TYPES.reduce((s, k) => s + (serviceCosts[k] || 0), 0)
  const totalServiceRevenue = SERVICE_TYPES.reduce((s, k) => s + (serviceRevenues[k] || 0), 0)
  const totalServiceBalance = totalServiceRevenue - totalServiceCost
  const profitableSvcCount = SERVICE_TYPES.filter(
    (k) => (serviceRevenues[k] || 0) - (serviceCosts[k] || 0) >= 0
  ).length
  const lossSvcCount = SERVICE_TYPES.length - profitableSvcCount

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6" /> {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="overhead">Overhead</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
        </TabsList>

        {/* ═══════════ ANALYTICS TAB ═══════════ */}
        <TabsContent value="analytics" className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <ColorStatCard
              label={t("totalCostMonth")}
              value={fmt(grandTotalG)}
              icon={<DollarSign className="h-4 w-4" />}
              color="red"
            />
            <ColorStatCard
              label={t("totalRevenueMonth")}
              value={fmt(summary.totalRevenue)}
              icon={<TrendingUp className="h-4 w-4" />}
              color="green"
            />
            <ColorStatCard
              label={t("marginMonth")}
              value={fmt(summary.totalMargin)}
              icon={<TrendingDown className="h-4 w-4" />}
              color={summary.totalMargin >= 0 ? "teal" : "red"}
            />
            <ColorStatCard
              label={t("profitableClients")}
              value={summary.profitableClients}
              icon={<Users className="h-4 w-4" />}
              color="blue"
            />
            <ColorStatCard
              label={t("costPerUser")}
              value={fmt(costPerUserF)}
              icon={<Users className="h-4 w-4" />}
              color="violet"
            />
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pie chart — cost composition + breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Composition</CardTitle>
                <p className="text-xs text-muted-foreground">Sec G: {fmt(grandTotalG)}</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={costComposition}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      dataKey="value"
                      labelLine={false}
                    >
                      {costComposition.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={((value: number) => fmt(value)) as any} />
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xs">Sec F</text>
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-sm font-bold">{(grandTotalF / 1000).toFixed(1)}K ₼</text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                  {costComposition.map((item, i) => {
                    const total = costComposition.reduce((s, c) => s + c.value, 0)
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0"
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="ml-auto font-mono font-medium">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
                {/* Expandable breakdown */}
                <CostBreakdown data={data} />
              </CardContent>
            </Card>

            {/* Horizontal bar chart — service cost vs revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Cost vs Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceBarData} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis dataKey="name" type="category" width={90} className="text-xs" />
                    <Tooltip formatter={((value: number) => fmt(value)) as any} />
                    <Legend />
                    <Bar dataKey="Cost" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {/* Balance summary below chart */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {serviceBarData.map((s) => (
                    <div key={s.svc} className="flex justify-between px-2">
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className={s.balance >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {s.balance >= 0 ? "+" : ""}{s.balance.toLocaleString()} ₼
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <AIObservations tab="analytics" />
        </TabsContent>

        {/* ═══════════ SERVICES TAB ═══════════ */}
        <TabsContent value="services" className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ColorStatCard label={t("totalCost")} value={fmt(totalServiceCost)} icon={<DollarSign className="h-4 w-4" />} color="red" />
            <ColorStatCard label={t("totalRevenue")} value={fmt(totalServiceRevenue)} icon={<TrendingUp className="h-4 w-4" />} color="green" />
            <ColorStatCard
              label={t("totalBalance")}
              value={fmt(totalServiceBalance)}
              icon={<DollarSign className="h-4 w-4" />}
              color={totalServiceBalance >= 0 ? "teal" : "red"}
            />
            <ColorStatCard
              label={t("profitableLoss")}
              value={`${profitableSvcCount} / ${lossSvcCount}`}
              icon={<TrendingUp className="h-4 w-4" />}
              color="blue"
            />
          </div>

          {/* Service cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SERVICE_TYPES.map((svc) => {
              const cost = serviceCosts[svc] || 0
              const revenue = serviceRevenues[svc] || 0
              const margin = revenue - cost
              const marginPct = cost > 0 ? ((margin / cost) * 100) : 0
              const isProfit = margin >= 0
              const detail = serviceDetails[svc]
              const headcount = detail?.headcount || 0
              const clients = serviceClients?.[svc] || 0
              const costPerEmp = headcount > 0 ? cost / headcount : 0
              const maxVal = Math.max(cost, revenue, 1)

              return (
                <Card key={svc}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{SERVICE_LABELS[svc]}</CardTitle>
                      <Badge variant={isProfit ? "default" : "destructive"} className="text-xs">
                        {isProfit ? "Profit" : "Loss"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Cost bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Cost</span>
                        <span className="font-medium">{fmt(cost)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(cost / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* Revenue bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-medium">{fmt(revenue)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(revenue / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* Metrics row */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t text-center">
                      <div>
                        <div className={`text-sm font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                          {marginPct.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">MARGIN</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold">{headcount}</div>
                        <div className="text-[10px] text-muted-foreground">STAFF</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold">{clients}</div>
                        <div className="text-[10px] text-muted-foreground">CLIENTS</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold">{costPerEmp > 0 ? fmt(costPerEmp) : "-"}</div>
                        <div className="text-[10px] text-muted-foreground">COST/STAFF</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <AIObservations tab="services" />
        </TabsContent>

        {/* ═══════════ CLIENTS TAB ═══════════ */}
        <TabsContent value="clients" className="space-y-4">
          <ClientsTab />
          <AIObservations tab="clients" />
        </TabsContent>

        {/* ═══════════ OVERHEAD TAB ═══════════ */}
        <TabsContent value="overhead" className="space-y-4">
          <OverheadTab />
          <AIObservations tab="overhead" />
        </TabsContent>

        {/* ═══════════ EMPLOYEES TAB ═══════════ */}
        <TabsContent value="employees">
          <EmployeesTab />
        </TabsContent>

        {/* ═══════════ PARAMETERS TAB ═══════════ */}
        <TabsContent value="parameters">
          <ParametersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
