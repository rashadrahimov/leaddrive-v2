"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import { DollarSign, Download, Search, Pencil, Check, X } from "lucide-react"

interface ServicePricing {
  serviceType: string
  serviceName: string
  costPerUser: number
  pricePerUser: number
  marginPerUser: number
  marginPct: number
}

interface ClientPricing {
  id: string
  name: string
  costCode: string
  userCount: number
  services: Array<{
    serviceType: string
    serviceName: string
    monthlyRevenue: number
    isActive: boolean
  }>
  totalRevenue: number
  totalCost: number
  margin: number
}

const SERVICE_PRICING: ServicePricing[] = [
  { serviceType: "permanent_it", serviceName: "Daimi IT", costPerUser: 29.06, pricePerUser: 60.10, marginPerUser: 31.04, marginPct: 51.65 },
  { serviceType: "infosec", serviceName: "InfoSec", costPerUser: 31.86, pricePerUser: 56.41, marginPerUser: 24.55, marginPct: 43.52 },
  { serviceType: "helpdesk", serviceName: "HelpDesk", costPerUser: 52.53, pricePerUser: 19.76, marginPerUser: -32.77, marginPct: -165.84 },
  { serviceType: "erp", serviceName: "ERP", costPerUser: 8.25, pricePerUser: 7.85, marginPerUser: -0.40, marginPct: -5.10 },
  { serviceType: "grc", serviceName: "GRC", costPerUser: 5.12, pricePerUser: 1.86, marginPerUser: -3.26, marginPct: -175.27 },
  { serviceType: "projects", serviceName: "PM", costPerUser: 7.20, pricePerUser: 0.56, marginPerUser: -6.64, marginPct: -1185.71 },
  { serviceType: "cloud", serviceName: "Cloud", costPerUser: 5.24, pricePerUser: 3.15, marginPerUser: -2.09, marginPct: -66.35 },
]

const MOCK_CLIENTS: ClientPricing[] = [
  {
    id: "1", name: "SOCAR", costCode: "SC-002", userCount: 1200,
    services: [
      { serviceType: "permanent_it", serviceName: "Daimi IT", monthlyRevenue: 42000, isActive: true },
      { serviceType: "infosec", serviceName: "InfoSec", monthlyRevenue: 38000, isActive: true },
      { serviceType: "helpdesk", serviceName: "HelpDesk", monthlyRevenue: 15000, isActive: true },
    ],
    totalRevenue: 95000, totalCost: 71283.50, margin: 23716.50,
  },
  {
    id: "2", name: "Azərişıq", costCode: "AZ-001", userCount: 850,
    services: [
      { serviceType: "permanent_it", serviceName: "Daimi IT", monthlyRevenue: 35000, isActive: true },
      { serviceType: "infosec", serviceName: "InfoSec", monthlyRevenue: 28000, isActive: true },
      { serviceType: "helpdesk", serviceName: "HelpDesk", monthlyRevenue: 5500, isActive: true },
    ],
    totalRevenue: 68500, totalCost: 52840.12, margin: 15659.88,
  },
  {
    id: "3", name: "Kapital Bank", costCode: "KB-010", userCount: 500,
    services: [
      { serviceType: "permanent_it", serviceName: "Daimi IT", monthlyRevenue: 25000, isActive: true },
      { serviceType: "infosec", serviceName: "InfoSec", monthlyRevenue: 18000, isActive: true },
      { serviceType: "erp", serviceName: "ERP", monthlyRevenue: 5000, isActive: true },
    ],
    totalRevenue: 48000, totalCost: 35200.10, margin: 12799.90,
  },
  {
    id: "4", name: "ZeytunPharma", costCode: "ZP-009", userCount: 75,
    services: [
      { serviceType: "permanent_it", serviceName: "Daimi IT", monthlyRevenue: 3500, isActive: true },
      { serviceType: "helpdesk", serviceName: "HelpDesk", monthlyRevenue: 3000, isActive: true },
    ],
    totalRevenue: 6500, totalCost: 8120.30, margin: -1620.30,
  },
]

export default function PricingPage() {
  const [search, setSearch] = useState("")
  const [editingClient, setEditingClient] = useState<string | null>(null)
  const [editRevenues, setEditRevenues] = useState<Record<string, number>>({})

  const filteredClients = MOCK_CLIENTS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.costCode.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = MOCK_CLIENTS.reduce((s, c) => s + c.totalRevenue, 0)
  const totalCost = MOCK_CLIENTS.reduce((s, c) => s + c.totalCost, 0)
  const avgMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0

  const startEdit = (client: ClientPricing) => {
    setEditingClient(client.id)
    const revenues: Record<string, number> = {}
    client.services.forEach(s => { revenues[s.serviceType] = s.monthlyRevenue })
    setEditRevenues(revenues)
  }

  const cancelEdit = () => {
    setEditingClient(null)
    setEditRevenues({})
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6" /> Pricing
          </h1>
          <p className="text-sm text-muted-foreground">Service pricing model and per-client revenue editor</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Revenue/mo" value={`${totalRevenue.toLocaleString()} ₼`} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard title="Total Cost/mo" value={`${totalCost.toLocaleString()} ₼`} />
        <StatCard title="Net Margin" value={`${(totalRevenue - totalCost).toLocaleString()} ₼`} trend={totalRevenue >= totalCost ? "up" : "down"} />
        <StatCard title="Avg Margin %" value={`${avgMargin.toFixed(1)}%`} trend={avgMargin >= 0 ? "up" : "down"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Price Model (per user/month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Service</th>
                  <th className="pb-2 pr-4 text-right">Cost/User</th>
                  <th className="pb-2 pr-4 text-right">Price/User</th>
                  <th className="pb-2 pr-4 text-right">Margin/User</th>
                  <th className="pb-2 pr-4 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {SERVICE_PRICING.map(svc => (
                  <tr key={svc.serviceType} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2 pr-4 font-medium">{svc.serviceName}</td>
                    <td className="py-2 pr-4 text-right font-mono">{svc.costPerUser.toFixed(2)} ₼</td>
                    <td className="py-2 pr-4 text-right font-mono">{svc.pricePerUser.toFixed(2)} ₼</td>
                    <td className={`py-2 pr-4 text-right font-mono font-medium ${svc.marginPerUser >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {svc.marginPerUser >= 0 ? "+" : ""}{svc.marginPerUser.toFixed(2)} ₼
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Badge variant={svc.marginPct >= 0 ? "default" : "destructive"}>
                        {svc.marginPct.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Client Service Editor</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredClients.map(client => {
            const isEditing = editingClient === client.id
            return (
              <Card key={client.id} className="border">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{client.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{client.costCode} — {client.userCount} users</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-mono">{client.totalRevenue.toLocaleString()} ₼</p>
                      <p className={`text-xs font-mono ${client.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {client.margin >= 0 ? "+" : ""}{client.margin.toLocaleString()} ₼
                      </p>
                    </div>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 w-7 p-0">
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 w-7 p-0">
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => startEdit(client)} className="h-7 w-7 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {client.services.map(svc => (
                      <div key={svc.serviceType} className="flex items-center justify-between py-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{svc.serviceName}</Badge>
                          {svc.isActive && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editRevenues[svc.serviceType] || 0}
                              onChange={e => setEditRevenues(prev => ({ ...prev, [svc.serviceType]: parseFloat(e.target.value) || 0 }))}
                              className="h-7 w-28 text-right text-sm"
                            />
                            <span className="text-xs text-muted-foreground">₼/mo</span>
                          </div>
                        ) : (
                          <span className="font-mono">{svc.monthlyRevenue.toLocaleString()} ₼/mo</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
