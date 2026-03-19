"use client"

import { useState } from "react"
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

// Mock data matching v1 production values
const ANALYTICS_DATA = {
  grand_total_g: 645204.83,
  grand_total_f: 462678.81,
  admin_overhead: 197654.94,
  tech_infra_total: 98661.62,
  total_users: 4500,
  summary: { total_revenue: 617019.95, total_margin: -28184.88, margin_pct: -4.57, profitable_clients: 16, loss_clients: 38 },
  service_costs: {
    permanent_it: 130765.41, infosec: 143375.06, helpdesk: 236367.70,
    erp: 37128.94, grc: 23046.00, projects: 32391.91, cloud: 23600.00,
  },
  service_revenues: {
    permanent_it: 270466.10, infosec: 253862.40, helpdesk: 88898.91,
    erp: 35304.07, grc: 8390.40, projects: 2516.12, cloud: 14187.02,
  },
}

const COST_BREAKDOWN = [
  { name: "Admin OH", value: 197654.94, color: "#8b5cf6" },
  { name: "Tech Infra", value: 98661.62, color: "#3b82f6" },
  { name: "Direct Labor", value: 348888.27, color: "#f59e0b" },
]

const SERVICE_DATA = Object.keys(ANALYTICS_DATA.service_costs).map(svc => ({
  name: svc.replace("permanent_it", "Daimi IT").replace("infosec", "InfoSec").replace("helpdesk", "HelpDesk")
    .replace("erp", "ERP").replace("grc", "GRC").replace("projects", "PM").replace("cloud", "Cloud"),
  cost: Math.round(ANALYTICS_DATA.service_costs[svc as keyof typeof ANALYTICS_DATA.service_costs]),
  revenue: Math.round((ANALYTICS_DATA.service_revenues as Record<string, number>)[svc] || 0),
}))

export default function ProfitabilityPage() {
  const [activeTab, setActiveTab] = useState("analytics")
  const d = ANALYTICS_DATA

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
            <StatCard title="TOTAL COST/MO" value={`${d.grand_total_g.toLocaleString()} ₼`} icon={<DollarSign className="h-4 w-4" />} description={`Sec F: ${d.grand_total_f.toLocaleString()} ₼`} />
            <StatCard title="TOTAL REVENUE" value={`${d.summary.total_revenue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} />
            <StatCard title="MARGIN/MO" value={`${d.summary.total_margin.toLocaleString()} ₼`} icon={<TrendingDown className="h-4 w-4" />} description={`${d.summary.margin_pct}%`} trend={d.summary.margin_pct >= 0 ? "up" : "down"} />
            <StatCard title="PROFITABLE" value={d.summary.profitable_clients} description={`Loss: ${d.summary.loss_clients}`} />
            <StatCard title="COST/USER" value={`${(d.grand_total_g / d.total_users).toFixed(2)} ₼`} icon={<Users className="h-4 w-4" />} description={`${d.total_users} users`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Breakdown (Sec G: {d.grand_total_g.toLocaleString()} ₼)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={COST_BREAKDOWN} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                      {COST_BREAKDOWN.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Cost vs Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={SERVICE_DATA} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="cost" fill="hsl(var(--destructive))" name="Cost" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <AIObservations tab="analytics" />
        </TabsContent>

        <TabsContent value="services">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SERVICE_DATA.map((svc) => {
              const margin = svc.revenue - svc.cost
              const marginPct = svc.revenue > 0 ? ((margin / svc.revenue) * 100).toFixed(1) : "0"
              const isProfit = margin >= 0
              return (
                <Card key={svc.name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{svc.name}</CardTitle>
                      <span className={`text-sm font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                        {isProfit ? "+" : ""}{margin.toLocaleString()} ₼
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cost</span>
                      <span>{svc.cost.toLocaleString()} ₼</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenue</span>
                      <span>{svc.revenue.toLocaleString()} ₼</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Margin</span>
                      <span className={isProfit ? "text-green-600" : "text-red-600"}>{marginPct}%</span>
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
