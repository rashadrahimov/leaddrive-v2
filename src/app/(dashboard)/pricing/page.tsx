"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import { DollarSign, Download, Search, Pencil, Check, X, Loader2 } from "lucide-react"

const SERVICE_NAMES: Record<string, string> = {
  permanent_it: "Daimi IT",
  infosec: "InfoSec",
  helpdesk: "HelpDesk",
  erp: "ERP",
  grc: "GRC",
  projects: "PM",
  cloud: "Cloud",
}

interface ClientWithServices {
  id: string
  name: string
  costCode: string | null
  userCount: number | null
  services: Array<{
    id: string
    serviceType: string
    monthlyRevenue: number
    isActive: boolean
  }>
  totalRevenue: number
}

export default function PricingPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState<string | null>(null)
  const [editRevenues, setEditRevenues] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  // Data from API
  const [summary, setSummary] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [overhead, setOverhead] = useState<any[]>([])
  const [clients, setClients] = useState<ClientWithServices[]>([])
  const [serviceRevenues, setServiceRevenues] = useState<Record<string, number>>({})

  async function fetchData() {
    try {
      const headers: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}

      const [costRes, clientsRes] = await Promise.all([
        fetch("/api/v1/cost-model", { headers }),
        fetch("/api/v1/cost-model/clients", { headers }),
      ])

      const costJson = await costRes.json()
      const clientsJson = await clientsRes.json()

      if (costJson.success) {
        setSummary(costJson.data.summary)
        setEmployees(costJson.data.employees || [])
        setOverhead(costJson.data.overhead || [])
        setServiceRevenues(costJson.data.serviceRevenues || {})
      }

      if (clientsJson.success) {
        setClients(clientsJson.data.clients || [])
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [session])

  // Compute per-service pricing from employees
  const totalEmployees = employees.reduce((s: number, e: any) => s + e.count, 0)
  const totalEmployeeCost = employees.reduce((s: number, e: any) => s + e.superGross * e.count, 0)
  const totalOverheadCost = overhead.reduce((s: number, o: any) => {
    const monthly = o.isAnnual ? o.amount / 12 : o.amount
    return s + (o.hasVat ? monthly * 1.18 : monthly)
  }, 0)

  const serviceTypes = ["permanent_it", "infosec", "helpdesk", "erp", "grc", "projects", "cloud"]
  const totalUsers = clients.reduce((s, c) => s + (c.userCount || 0), 0)

  const servicePricing = serviceTypes.map(type => {
    const rev = serviceRevenues[type] || 0
    const deptEmployees = employees.filter((e: any) => e.department === type)
    const deptCost = deptEmployees.reduce((s: number, e: any) => s + e.superGross * e.count, 0)
    const costPerUser = totalUsers > 0 ? deptCost / totalUsers : 0
    const pricePerUser = totalUsers > 0 ? rev / totalUsers : 0
    const marginPerUser = pricePerUser - costPerUser
    const marginPct = costPerUser > 0 ? ((pricePerUser - costPerUser) / costPerUser * 100) : 0

    return {
      serviceType: type,
      serviceName: SERVICE_NAMES[type] || type,
      costPerUser,
      pricePerUser,
      marginPerUser,
      marginPct,
      totalRevenue: rev,
    }
  }).filter(s => s.totalRevenue > 0 || s.costPerUser > 0)

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.costCode || "").toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = summary?.totalRevenue || 0
  const totalCost = summary?.totalCost || 0
  const netMargin = summary?.margin || 0
  const marginPct = totalRevenue > 0 ? (netMargin / totalRevenue * 100) : 0

  const startEdit = (client: ClientWithServices) => {
    setEditingClient(client.id)
    const revenues: Record<string, number> = {}
    client.services.forEach(s => { revenues[s.id] = s.monthlyRevenue })
    setEditRevenues(revenues)
  }

  const saveEdit = async (client: ClientWithServices) => {
    setSaving(true)
    try {
      const updates = Object.entries(editRevenues).map(([serviceId, revenue]) => ({
        id: serviceId,
        monthlyRevenue: revenue,
      }))

      await fetch("/api/v1/cost-model/clients", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ updates }),
      })

      setEditingClient(null)
      setEditRevenues({})
      fetchData()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditingClient(null)
    setEditRevenues({})
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Pricing
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
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
        <StatCard title="Net Margin" value={`${netMargin.toLocaleString()} ₼`} trend={netMargin >= 0 ? "up" : "down"} />
        <StatCard title="Avg Margin %" value={`${marginPct.toFixed(1)}%`} trend={marginPct >= 0 ? "up" : "down"} />
      </div>

      {servicePricing.length > 0 && (
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
                    <th className="pb-2 pr-4 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {servicePricing.map(svc => (
                    <tr key={svc.serviceType} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4 font-medium">{svc.serviceName}</td>
                      <td className="py-2 pr-4 text-right font-mono">{svc.costPerUser.toFixed(2)} ₼</td>
                      <td className="py-2 pr-4 text-right font-mono">{svc.pricePerUser.toFixed(2)} ₼</td>
                      <td className={`py-2 pr-4 text-right font-mono font-medium ${svc.marginPerUser >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {svc.marginPerUser >= 0 ? "+" : ""}{svc.marginPerUser.toFixed(2)} ₼
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">{svc.totalRevenue.toLocaleString()} ₼</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Client Service Editor ({clients.length} clients)</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredClients.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No clients with active services found</p>
          )}
          {filteredClients.map(client => {
            const isEditing = editingClient === client.id
            return (
              <Card key={client.id} className="border">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{client.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{client.costCode || "—"} — {client.userCount || 0} users</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-mono">{client.totalRevenue.toLocaleString()} ₼/mo</p>
                    </div>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => saveEdit(client)} disabled={saving} className="h-7 w-7 p-0">
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
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
                      <div key={svc.id} className="flex items-center justify-between py-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{SERVICE_NAMES[svc.serviceType] || svc.serviceType}</Badge>
                          {svc.isActive && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editRevenues[svc.id] || 0}
                              onChange={e => setEditRevenues(prev => ({ ...prev, [svc.id]: parseFloat(e.target.value) || 0 }))}
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
