"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatCard } from "@/components/stat-card"
import { UserPlus, Plus, Search, Building2, Users, FileText, TrendingUp } from "lucide-react"

interface LeadCompany {
  id: string
  name: string
  industry?: string
  website?: string
  email?: string
  category: string
  leadStatus: string
  leadScore: number
  leadTemperature?: string
  userCount: number
  costCode?: string
  _count?: { contacts: number; deals: number; contracts: number }
}

const statusLabels: Record<string, string> = {
  new: "Новый",
  contacted: "Связались",
  qualified: "Квалифицирован",
  converted: "Конвертирован",
  rejected: "Не подходит",
  cancelled: "Аннулирован",
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-purple-100 text-purple-700",
  converted: "bg-green-100 text-green-700",
  rejected: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-600",
}

const tempColors: Record<string, string> = {
  hot: "text-red-500",
  warm: "text-orange-500",
  cold: "text-blue-500",
}

export default function LeadsPage() {
  const { data: session } = useSession()
  const [companies, setCompanies] = useState<LeadCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const orgId = session?.user?.organizationId

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/v1/companies?category=all&limit=500&include=counts", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setCompanies(json.data.companies || [])
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchCompanies() }, [session])

  const filtered = companies.filter(c => {
    if (activeFilter !== "all" && c.leadStatus !== activeFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statusCounts: Record<string, number> = {}
  for (const c of companies) {
    statusCounts[c.leadStatus] = (statusCounts[c.leadStatus] || 0) + 1
  }
  const total = companies.length

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Лиды</h1>
        <div className="animate-pulse space-y-4">
          <div className="flex gap-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 w-32 bg-muted rounded-full" />)}</div>
          <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-muted rounded-lg" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Лиды ({filtered.length})</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">+ Создать группу</Button>
          <Button><Plus className="h-4 w-4 mr-1" /> Новый лид</Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          Все ({total})
        </Button>
        {Object.entries(statusLabels).map(([key, label]) => (
          <Button
            key={key}
            variant={activeFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(key)}
          >
            {label} ({statusCounts[key] || 0})
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск компаний..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Company cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            Нет компаний с выбранным статусом
          </div>
        ) : (
          filtered.map(company => (
            <Card key={company.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-sm uppercase">{company.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[company.leadStatus] || "bg-gray-100"}`}>
                    {statusLabels[company.leadStatus] || company.leadStatus}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mb-3">{company.website || "—"}</p>

                <div className="flex justify-between text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {company._count?.contacts || 0} контактов
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {company._count?.contracts || 0} контрактов
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${tempColors[company.leadTemperature || "cold"]}`}>
                      {(company.leadTemperature || "cold").toUpperCase()}
                    </span>
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                      {company.leadScore}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    👤 {company.userCount} ist.
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
