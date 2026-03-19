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
import { FileText, Plus, Pencil, Trash2, AlertTriangle, Clock, TrendingUp, Building2, History, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuditEntry {
  id: string
  action: string
  oldValue: any
  newValue: any
  createdAt: string
  userId?: string
}

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
  history?: AuditEntry[]
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

const fieldLabels: Record<string, string> = {
  contractNumber: "Номер",
  title: "Название",
  companyId: "Компания",
  type: "Тип",
  status: "Статус",
  startDate: "Дата начала",
  endDate: "Дата окончания",
  valueAmount: "Сумма",
  currency: "Валюта",
  notes: "Примечания",
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
  const [detailContract, setDetailContract] = useState<Contract | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
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

  async function openDetail(contract: Contract) {
    setDetailContract(contract)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/v1/contracts/${contract.id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setDetailContract(json.data)
    } catch {} finally { setDetailLoading(false) }
  }

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

      <DataTable columns={columns} data={filtered} searchPlaceholder="Поиск контрактов..." searchKey="title" onRowClick={openDetail} />

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

      {/* Detail Panel */}
      {detailContract && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setDetailContract(null)}>
          <div className="w-full max-w-lg bg-background shadow-xl h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Контракт #{detailContract.contractNumber}</h2>
                <button onClick={() => setDetailContract(null)} className="p-1 hover:bg-muted rounded"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{detailContract.title}</h3>
                  {detailContract.company && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Building2 className="h-3.5 w-3.5" /> {detailContract.company.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground text-xs">Статус</div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block", statusColors[detailContract.status])}>
                      {statusLabels[detailContract.status] || detailContract.status}
                    </span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground text-xs">Тип</div>
                    <div className="font-medium mt-1">{typeLabels[detailContract.type || ""] || detailContract.type || "—"}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground text-xs">Сумма</div>
                    <div className="font-bold mt-1">{detailContract.valueAmount ? `${detailContract.valueAmount.toLocaleString()} ${detailContract.currency}` : "—"}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground text-xs">Срок</div>
                    <div className="font-medium mt-1">{formatDate(detailContract.startDate)} — {formatDate(detailContract.endDate)}</div>
                  </div>
                </div>

                {detailContract.notes && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Примечания</div>
                    <div>{detailContract.notes}</div>
                  </div>
                )}

                {/* History */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <History className="h-4 w-4" /> История изменений
                  </h4>
                  {detailLoading ? (
                    <div className="text-sm text-muted-foreground animate-pulse">Загрузка...</div>
                  ) : detailContract.history && detailContract.history.length > 0 ? (
                    <div className="space-y-3">
                      {detailContract.history.map((entry: AuditEntry) => (
                        <div key={entry.id} className="border-l-2 border-primary/20 pl-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {entry.action === "update" ? "Изменение" : entry.action === "delete" ? "Удаление" : entry.action === "create" ? "Создание" : entry.action}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {entry.action === "update" && entry.oldValue && typeof entry.oldValue === "object" && (
                            <div className="mt-1 space-y-0.5">
                              {Object.entries(entry.oldValue as Record<string, { old: any; new: any }>).map(([field, val]) => (
                                <div key={field} className="text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{fieldLabels[field] || field}:</span>{" "}
                                  <span className="line-through text-red-400">{val.old || "—"}</span> → <span className="text-green-600">{val.new || "—"}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Нет истории изменений</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setEditData(detailContract); setShowForm(true); setDetailContract(null) }}>
                    <Pencil className="h-4 w-4 mr-1" /> Редактировать
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => { setDeleteId(detailContract.id); setDeleteName(detailContract.title); setDetailContract(null) }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Удалить
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
