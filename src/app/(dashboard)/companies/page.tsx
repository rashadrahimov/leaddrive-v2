"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatCard } from "@/components/stat-card"
import { CompanyForm } from "@/components/company-form"
import { LeadDetailModal } from "@/components/lead-detail-modal"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Select } from "@/components/ui/select"
import { Building2, Plus, Search, Users, FileText, TrendingUp, ArrowUpDown } from "lucide-react"

interface Company {
  id: string
  name: string
  industry: string | null
  status: string
  category: string
  city: string | null
  country: string | null
  website: string | null
  email: string | null
  phone: string | null
  address: string | null
  description: string | null
  leadStatus: string
  leadScore: number
  leadTemperature?: string
  userCount: number
  annualRevenue?: number
  _count: { contacts: number; deals: number; contracts: number }
}

const statusLabels: Record<string, string> = {
  active: "Активная",
  prospect: "Проспект",
  inactive: "Неактивная",
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  prospect: "bg-blue-100 text-blue-700",
  inactive: "bg-gray-100 text-gray-500",
}

export default function CompaniesPage() {
  const { data: session } = useSession()
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, any> | undefined>()
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("name_asc")
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const orgId = session?.user?.organizationId

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/v1/companies?category=client&limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setCompanies(json.data.companies)
        setTotal(json.data.total)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchCompanies() }, [session])

  const filtered = companies.filter(c => {
    if (activeFilter !== "all" && c.status !== activeFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "name_asc": return a.name.localeCompare(b.name)
      case "name_desc": return b.name.localeCompare(a.name)
      case "hot_cold": { const order = { hot: 0, warm: 1, cold: 2 }; return (order[(a.leadTemperature || "cold") as keyof typeof order] ?? 2) - (order[(b.leadTemperature || "cold") as keyof typeof order] ?? 2) }
      case "cold_hot": { const order = { cold: 0, warm: 1, hot: 2 }; return (order[(a.leadTemperature || "cold") as keyof typeof order] ?? 0) - (order[(b.leadTemperature || "cold") as keyof typeof order] ?? 0) }
      case "contacts": return (b._count?.contacts || 0) - (a._count?.contacts || 0)
      case "score": return (b.leadScore || 0) - (a.leadScore || 0)
      default: return 0
    }
  })

  const statusCounts: Record<string, number> = {}
  for (const c of companies) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1
  }

  const activeCount = statusCounts["active"] || 0
  const totalContacts = companies.reduce((s, c) => s + (c._count?.contacts || 0), 0)
  const totalUsers = companies.reduce((s, c) => s + (c.userCount || 0), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Компании</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-muted rounded-lg" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Компании ({filtered.length})</h1>
          <p className="text-sm text-muted-foreground">Управление клиентскими компаниями</p>
        </div>
        <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Добавить
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Всего" value={total} icon={<Building2 className="h-4 w-4" />} />
        <StatCard title="Активные" value={activeCount} trend="up" />
        <StatCard title="Контакт. лица" value={totalContacts} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Пользователей" value={totalUsers} icon={<Users className="h-4 w-4" />} />
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

      {/* Search + Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск компаний..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[180px]">
          <option value="name_asc">Имя А → Я</option>
          <option value="name_desc">Имя Я → А</option>
          <option value="hot_cold">Hot → Cold</option>
          <option value="cold_hot">Cold → Hot</option>
          <option value="score">Score ↓</option>
          <option value="contacts">Контакты ↓</option>
        </Select>
      </div>

      {/* Company cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            Нет компаний с выбранным фильтром
          </div>
        ) : (
          filtered.map(company => (
            <Card key={company.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCompany(company)}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                      {company.name.charAt(0)}
                    </div>
                    <h3 className="font-bold text-sm truncate">{company.name}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColors[company.status] || "bg-gray-100"}`}>
                    {statusLabels[company.status] || company.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  {company.industry && <span>{company.industry}</span>}
                  {company.industry && company.city && <span>·</span>}
                  {company.city && <span>{company.city}</span>}
                  {!company.industry && !company.city && <span>{company.website || "—"}</span>}
                </div>

                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {company._count?.contacts || 0} конт. лица
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> {company._count?.deals || 0} сделок
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {company.userCount || 0} польз.
                  </span>
                </div>

                {company.leadTemperature && (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${company.leadTemperature === "hot" ? "text-red-500" : company.leadTemperature === "warm" ? "text-orange-500" : "text-blue-500"}`}>
                      {company.leadTemperature.toUpperCase()}
                    </span>
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                      {company.leadScore}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CompanyForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchCompanies} initialData={editData} orgId={orgId} />

      <LeadDetailModal
        open={!!selectedCompany}
        onOpenChange={(open) => { if (!open) setSelectedCompany(null) }}
        company={selectedCompany}
        orgId={orgId}
        onSaved={fetchCompanies}
      />
    </div>
  )
}
