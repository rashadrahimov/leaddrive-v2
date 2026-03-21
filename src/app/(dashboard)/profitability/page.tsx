"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calculator, TrendingUp, TrendingDown, Users, DollarSign, Loader2 } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
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

export default function ProfitabilityPage() {
  const [activeTab, setActiveTab] = useState("analytics")
  const { data, isLoading, isError } = useCostModelAnalytics()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6" /> Profitability
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
          <Calculator className="h-6 w-6" /> Profitability
        </h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Məlumat yüklənmədi. Parametrləri və overhead-ları yoxlayın.
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
    { name: "Birbaşa Əmək", value: Math.round(directLabor) },
    { name: "Ezam", value: Math.round(misc) },
    { name: "Risk", value: Math.round(riskCost) },
  ].filter((c) => c.value > 0)

  // ── Bar chart data: service cost vs revenue ──
  const serviceBarData = SERVICE_TYPES.map((svc) => {
    const cost = serviceCosts[svc] || 0
    const revenue = serviceRevenues[svc] || 0
    return {
      name: SERVICE_LABELS[svc],
      svc,
      Maya: Math.round(cost),
      Gəlir: Math.round(revenue),
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
            <Calculator className="h-6 w-6" /> Profitability
          </h1>
          <p className="text-sm text-muted-foreground">Maya modeli analitikası və xidmət rentabelliyi</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="analytics">Analitika</TabsTrigger>
          <TabsTrigger value="services">Xidmətlər</TabsTrigger>
          <TabsTrigger value="clients">Müştərilər</TabsTrigger>
          <TabsTrigger value="overhead">Nakładnıe</TabsTrigger>
          <TabsTrigger value="employees">İşçilər</TabsTrigger>
          <TabsTrigger value="parameters">Parametrlər</TabsTrigger>
        </TabsList>

        {/* ═══════════ ANALYTICS TAB ═══════════ */}
        <TabsContent value="analytics" className="space-y-6">
          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              title="ÜMUMİ MAYA/AY"
              value={fmt(grandTotalG)}
              icon={<DollarSign className="h-4 w-4" />}
              description={`Əsas (F): ${fmt(grandTotalF)}`}
            />
            <StatCard
              title="ÜMUMİ GƏLİR/AY"
              value={fmt(summary.totalRevenue)}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard
              title="MARJA/AY"
              value={fmt(summary.totalMargin)}
              icon={<TrendingDown className="h-4 w-4" />}
              description={`${summary.marginPct.toFixed(1)}%`}
              trend={summary.totalMargin >= 0 ? "up" : "down"}
            />
            <StatCard
              title="MƏNFƏƏTLI MÜŞTƏRİ"
              value={summary.profitableClients}
              description={`Zərərli: ${summary.lossClients}`}
            />
            <StatCard
              title="MAYA/1 İST"
              value={fmt(costPerUserF)}
              icon={<Users className="h-4 w-4" />}
              description={`${totalUsers} istifadəçi`}
            />
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pie chart — cost composition */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maya Tərkibi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costComposition}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {costComposition.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => fmt(value)}
                    />
                    <Legend />
                    {/* Center text */}
                    <text
                      x="50%"
                      y="48%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-xs"
                    >
                      Sec F
                    </text>
                    <text
                      x="50%"
                      y="55%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-sm font-bold"
                    >
                      {(grandTotalF / 1000).toFixed(1)}K ₼
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Horizontal bar chart — service cost vs revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Xidmət üzrə Maya vs Gəlir</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceBarData} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis dataKey="name" type="category" width={90} className="text-xs" />
                    <Tooltip formatter={(value: number) => fmt(value)} />
                    <Legend />
                    <Bar dataKey="Maya" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Gəlir" fill="#22c55e" radius={[0, 4, 4, 0]} />
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
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="Cəm Maya" value={fmt(totalServiceCost)} icon={<DollarSign className="h-4 w-4" />} />
            <StatCard title="Cəm Gəlir" value={fmt(totalServiceRevenue)} icon={<TrendingUp className="h-4 w-4" />} />
            <StatCard
              title="Cəm Balans"
              value={fmt(totalServiceBalance)}
              trend={totalServiceBalance >= 0 ? "up" : "down"}
              description={`${((totalServiceBalance / (totalServiceRevenue || 1)) * 100).toFixed(1)}%`}
            />
            <StatCard
              title="Mənfəətli / Zərərli"
              value={`${profitableSvcCount} / ${lossSvcCount}`}
              description={`${SERVICE_TYPES.length} xidmət`}
            />
          </div>

          {/* Service cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SERVICE_TYPES.map((svc) => {
              const cost = serviceCosts[svc] || 0
              const revenue = serviceRevenues[svc] || 0
              const margin = revenue - cost
              const marginPct = revenue > 0 ? ((margin / revenue) * 100) : cost > 0 ? -100 : 0
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
                        {isProfit ? "Mənfəət" : "Zərər"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Maya bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Maya</span>
                        <span className="font-medium">{fmt(cost)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(cost / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* Gəlir bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Gəlir</span>
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
                        <div className="text-[10px] text-muted-foreground">MARJA</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold">{headcount}</div>
                        <div className="text-[10px] text-muted-foreground">İŞÇİ</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold">{clients}</div>
                        <div className="text-[10px] text-muted-foreground">MÜŞTƏRİ</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold">{costPerEmp > 0 ? fmt(costPerEmp) : "-"}</div>
                        <div className="text-[10px] text-muted-foreground">MAYA/İŞÇİ</div>
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
