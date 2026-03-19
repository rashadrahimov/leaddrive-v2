"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SegmentForm } from "@/components/segment-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Plus, Search, Users, Filter, Zap, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Segment {
  id: string
  name: string
  description?: string
  contactCount: number
  isDynamic: boolean
  conditions?: Record<string, unknown>
  createdAt: string
}

export default function SegmentsPage() {
  const { data: session } = useSession()
  const [segments, setSegments] = useState<Segment[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Segment | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [search, setSearch] = useState("")
  const orgId = session?.user?.organizationId

  const fetchSegments = async () => {
    try {
      const [segRes, contactRes] = await Promise.all([
        fetch("/api/v1/segments?limit=500", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        }),
        fetch("/api/v1/contacts?limit=1", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        }),
      ])
      const segJson = await segRes.json()
      const contactJson = await contactRes.json()
      if (segJson.success) setSegments(segJson.data.segments)
      if (contactJson.success) setTotalContacts(contactJson.data.total || 0)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchSegments() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/segments/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    fetchSegments()
  }

  const dynamicCount = segments.filter(s => s.isDynamic).length
  const staticCount = segments.filter(s => !s.isDynamic).length

  const filtered = segments.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Сегменты контактов</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-lg" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Сегменты контактов</h1>
          <p className="text-sm text-muted-foreground">Группировка контактов по критериям для целевых рассылок</p>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Новый сегмент
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{segments.length}</p>
              <p className="text-sm text-muted-foreground">Всего сегментов</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dynamicCount}</p>
              <p className="text-sm text-muted-foreground">Динамические</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalContacts.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Всего контактов</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      {segments.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск сегментов..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Segment cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {segments.length === 0 ? "Нет сегментов. Создайте первый!" : "Ничего не найдено"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(segment => {
            const condObj = (segment.conditions && typeof segment.conditions === "object") ? segment.conditions as Record<string, any> : {}
            const conditionLabels: string[] = []
            if (condObj.company) conditionLabels.push(`Компания: ${condObj.company}`)
            if (condObj.source) conditionLabels.push(`Источник: ${condObj.source}`)
            if (condObj.role) conditionLabels.push(`Роль: ${condObj.role}`)
            if (condObj.tag) conditionLabels.push(`Тег: ${condObj.tag}`)
            if (condObj.name) conditionLabels.push(`Имя: ${condObj.name}`)
            if (condObj.createdAfter) conditionLabels.push(`После: ${condObj.createdAfter}`)
            if (condObj.createdBefore) conditionLabels.push(`До: ${condObj.createdBefore}`)
            if (condObj.hasEmail) conditionLabels.push("Есть Email")
            if (condObj.hasPhone) conditionLabels.push("Есть Телефон")

            return (
              <div
                key={segment.id}
                className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => { setEditData(segment); setShowForm(true) }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-3 h-3 rounded-full mt-1.5 shrink-0",
                      segment.isDynamic ? "bg-green-500" : "bg-gray-400"
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{segment.name}</h3>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full border",
                          segment.isDynamic
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                            : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                        )}>
                          {segment.isDynamic ? "Динамический" : "Статический"}
                        </span>
                      </div>
                      {segment.description && (
                        <p className="text-sm text-muted-foreground mb-1">{segment.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded-full">
                          {segment.contactCount.toLocaleString()} контактов
                        </span>
                        {conditionLabels.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {conditionLabels.slice(0, 3).map((label, i) => (
                              <span key={i} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {label}
                              </span>
                            ))}
                            {conditionLabels.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{conditionLabels.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); setEditData(segment); setShowForm(true) }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(segment.id); setDeleteName(segment.name) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SegmentForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchSegments}
        initialData={editData}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Удалить сегмент"
        itemName={deleteName}
      />
    </div>
  )
}
