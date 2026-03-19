"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { ContractForm } from "@/components/contract-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Select } from "@/components/ui/select"
import { FileText, Plus, Pencil, Trash2, AlertTriangle, Clock, TrendingUp, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Contract {
  id: string
  contractNumber: string
  title: string
  companyId?: string
  company?: { id: string; name: string } | null
  type?: string
  status: string
  startDate?: string
  endDate?: string
  valueAmount?: number
  currency: string
  notes?: string
  createdAt: string
  updatedAt: string
}

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  sent: "Отправлен",
  signed: "Подписан",
  active: "Активный",
  expiring: "Истекает",
  expired: "Истёк",
  renewed: "Продлён",
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-indigo-100 text-indigo-700",
  active: "bg-green-100 text-green-700",
  expiring: "bg-orange-100 text-orange-700",
  expired: "bg-red-100 text-red-600",
  renewed: "bg-teal-100 text-teal-700",
}

const typeLabels: Record<string, string> = {
  service_agreement: "Договор услуг",
  nda: "NDA",
  maintenance: "Обслуживание",
  license: "Лицензия",
  sla: "SLA",
  other: "Другое",
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })
}

function daysUntilExpiry(endDate?: string): number | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function ContractsPage() {
  const { data: session } = useSession()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Contract | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date_desc")
  const orgId = session?.user?.organizationId

  const fetchContracts = async () => {
    try {
      const res = await fetch("/api/v1/contracts?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setContracts(json.data.contracts)
        setTotal(json.data.total)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchContracts() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/contracts/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchContracts()
  }

  // Filter + sort
  const filtered = contracts.filter(c => {
    if (activeFilter === "all") return true
    if (activeFilter === "expiring_soon") {
      const days = daysUntilExpiry(c.endDate)
      return days !== null && days > 0 && days <= 90 && c.status !== "expired"
    }
    return c.status === activeFilter
  }).sort((a, b) => {
    switch (sortBy) {
      case "date_desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "date_asc": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "value_desc": return (b.valueAmount || 0) - (a.valueAmount || 0)
      case "value_asc": return (a.valueAmount || 0) - (b.valueAmount || 0)
      case "expiry": return new Date(a.endDate || "9999").getTime() - new Date(b.endDate || "9999").getTime()
      case "company": return (a.company?.name || "zzz").localeCompare(b.company?.name || "zzz")
      default: return 0
    }
  })

  // Stats
  const activeCount = contracts.filter(c => c.status === "active" || c.status === "signed").length
  const totalValue = contracts.filter(c => c.status === "active" || c.status === "signed").reduce((s, c) => s + (c.valueAmount || 0), 0)
  const avgValue = activeCount > 0 ? Math.round(totalValue / activeCount) : 0

  const expiringSoon = contracts.filter(c => {
    const days = daysUntilExpiry(c.endDate)
    return days !== null && days > 0 && days <= 90 && c.status !== "expired" && c.status !== "renewed"
  }).length

  const expiredCount = contracts.filter(c => c.status === "expired").length

  // MRR calculation (active contracts / their duration in months)
  const mrr = contracts.filter(c => c.status === "active" || c.status === "signed").reduce((sum, c) => {
    if (!c.valueAmount || !c.startDate || !c.endDate) return sum
    const months = Math.max(1, Math.ceil((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    return sum + c.valueAmount / months
  }, 0)

  // Status counts for filter tabs
  const statusCounts: Record<string, number> = {}
  for (const c of contracts) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1
  }

  const columns = [
    {
      key: "contractNumber",
      label: "Номер",
      sortable: true,
      render: (item: any) => <span className="font-mono text-sm">{item.contractNumber}</span>,
    },
    { key: "title", label: "Название", sortable: true },
    {
      key: "company",
      label: "Компания",
      sortable: true,
      render: (item: any) => (
        <div className="flex items-center gap-1.5">
          {item.company ? (
            <>
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{item.company.name}</span>
            </>
          ) : <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      key: "type", label: "Тип", sortable: true,
      render: (item: any) => <span className="text-sm">{typeLabels[item.type] || item.type || "—"}</span>,
    },
    {
      key: "valueAmount", label: "Сумма", sortable: true,
      render: (item: any) => (
        <span className="font-medium">
          {item.valueAmount ? `${item.valueAmount.toLocaleString()} ${item.currency}` : "—"}
        </span>
      ),
    },
    {
      key: "status", label: "Статус", sortable: true,
      render: (item: any) => (
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[item.status] || "bg-gray-100")}>
          {statusLabels[item.status] || item.status}
        </span>
      ),
    },
    {
      key: "endDate", label: "Истекает", sortable: true,
      render: (item: any) => {
        const days = daysUntilExpiry(item.endDate)
        const isExpiring = days !== null && days > 0 && days <= 90
        const isExpired = days !== null && days <= 0
        return (
          <div className={cn(
            "flex items-center gap-1 text-sm",
            isExpired && item.status !== "renewed" && "text-red-500 font-medium",
            isExpiring && "text-orange-500 font-medium"
          )}>
            {isExpiring && <AlertTriangle className="h-3 w-3" />}
            {formatDate(item.endDate)}
            {isExpiring && <span className="text-[10px]">({days}д)</span>}
          </div>
        )
      },
    },
    {
      key: "actions", label: "", className: "w-20",
      render: (item: any) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setEditData(item); setShowForm(true) }} className="p-1.5 rounded hover:bg-muted" title="Редактировать">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => { setDeleteId(item.id); setDeleteName(item.title) }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Удалить">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
          </button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Контракты</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-6">{[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Контракты</h1>
          <p className="text-sm text-muted-foreground">Управление договорами с клиентами</p>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Новый контракт
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <StatCard title="Всего" value={total} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Активные" value={activeCount} trend="up" />
        <StatCard title="Общая сумма" value={`${totalValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="MRR" value={`${Math.round(mrr).toLocaleString()} ₼`} description="ежемесячно" />
        <StatCard title="Ср. стоимость" value={`${avgValue.toLocaleString()} ₼`} />
        <StatCard
          title="Истекают скоро"
          value={expiringSoon}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={expiringSoon > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>
          Все ({total})
        </Button>
        {(["draft", "sent", "signed", "active", "expiring", "expired", "renewed"] as const).map(key => (
          statusCounts[key] ? (
            <Button key={key} variant={activeFilter === key ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(key)}>
              {statusLabels[key]} ({statusCounts[key]})
            </Button>
          ) : null
        ))}
        <Button
          variant={activeFilter === "expiring_soon" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("expiring_soon")}
          className={cn(expiringSoon > 0 && activeFilter !== "expiring_soon" && "border-orange-300 text-orange-600")}
        >
          <AlertTriangle className="h-3 w-3 mr-1" /> Истекают 90д ({expiringSoon})
        </Button>
      </div>

      {/* Sort */}
      <div className="flex justify-end">
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[200px]">
          <option value="date_desc">Новые первые</option>
          <option value="date_asc">Старые первые</option>
          <option value="value_desc">Сумма ↓</option>
          <option value="value_asc">Сумма ↑</option>
          <option value="expiry">По дате истечения</option>
          <option value="company">По компании</option>
        </Select>
      </div>

      <DataTable columns={columns} data={filtered} searchPlaceholder="Поиск контрактов..." searchKey="title" />

      <ContractForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchContracts}
        initialData={editData}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Удалить контракт"
        itemName={deleteName}
      />
    </div>
  )
}
