"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { OverheadTab } from "@/components/profitability/overhead-tab"
import { ClientsTab } from "@/components/profitability/clients-tab"
import { EmployeesTab } from "@/components/profitability/employees-tab"
import { ParametersTab } from "@/components/profitability/parameters-tab"
import { SnapshotsTab } from "@/components/profitability/snapshots-tab"
import { AIObservations } from "@/components/profitability/ai-observations"

interface CostModelData {
  summary: {
    totalCost: number
    totalRevenue: number
    totalOverhead: number
    totalEmployeeCost: number
    margin: number
    marginPct: number
    profitableClients: number
    lossClients: number
  }
  serviceRevenues: Record<string, number>
  deptCosts: Record<string, number>
  params: { totalUsers?: number } | null
}

const SERVICE_NAMES: Record<string, string> = {
  permanent_it: "Daimi IT", infosec: "InfoSec", helpdesk: "HelpDesk",
  erp: "ERP", grc: "GRC", projects: "PM", cloud: "Cloud",
}

const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#f59e0b"]

export default function ProfitabilityPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("analytics")
  const [data, setData] = useState<CostModelData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const orgId = (session?.user as any)?.organizationId
        const res = await fetch("/api/v1/cost-model", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        })
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch {} finally { setLoading(false) }
    }
    fetchData()
  }, [session])

  const d = data?.summary || { totalCost: 0, totalRevenue: 0, totalOverhead: 0, totalEmployeeCost: 0, margin: 0, marginPct: 0, profitableClients: 0, lossClients: 0 }
  const totalUsers = data?.params?.totalUsers || 1

  const costBreakdown = [
    { name: "Admin OH", value: Math.round(d.totalOverhead), color: PIE_COLORS[0] },
    { name: "Direct Labor", value: Math.round(d.totalEmployeeCost), color: PIE_COLORS[2] },
  ]

  const serviceData = Object.entries(data?.serviceRevenues || {}).map(([svc, revenue]) => ({
    name: SERVICE_NAMES[svc] || svc,
    revenue: Math.round(revenue),
    cost: 0, // TODO: compute per-service cost allocation
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6" /> Profitability
        </h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6" /> Profitability
          </h1>
          <p className="text-sm text-muted-foreground">Cost model analytics and service profitability</p>
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
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard title="TOTAL COST/MO" value={`${d.totalCost.toLocaleString()} ₼`} icon={<DollarSign className="h-4 w-4" />} />
            <StatCard title="TOTAL REVENUE" value={`${d.totalRevenue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} />
            <StatCard title="MARGIN/MO" value={`${d.margin.toLocaleString()} ₼`} icon={<TrendingDown className="h-4 w-4" />} description={`${d.marginPct}%`} trend={d.marginPct >= 0 ? "up" : "down"} />
            <StatCard title="PROFITABLE" value={d.profitableClients} description={`Loss: ${d.lossClients}`} />
            <StatCard title="COST/USER" value={`${(d.totalCost / totalUsers).toFixed(2)} ₼`} icon={<Users className="h-4 w-4" />} description={`${totalUsers} users`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Breakdown ({d.totalCost.toLocaleString()} ₼)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                      {costBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {serviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={serviceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No service data</div>}
              </CardContent>
            </Card>
          </div>
          <AIObservations tab="analytics" />
        </TabsContent>

        <TabsContent value="services">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {serviceData.map((svc) => {
              const margin = svc.revenue - svc.cost
              const isProfit = margin >= 0
              return (
                <Card key={svc.name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{svc.name}</CardTitle>
                      <span className={`text-sm font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                        {svc.revenue.toLocaleString()} ₼
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenue</span>
                      <span>{svc.revenue.toLocaleString()} ₼</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <AIObservations tab="services" />
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <ClientsTab />
          <AIObservations tab="clients" />
        </TabsContent>

        <TabsContent value="overhead" className="space-y-4">
          <OverheadTab />
          <AIObservations tab="overhead" />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeesTab />
        </TabsContent>

        <TabsContent value="parameters">
          <ParametersTab />
        </TabsContent>

        <TabsContent value="snapshots">
          <SnapshotsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
