"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { MtmRouteForm } from "@/components/mtm/route-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Route, MapPin, User, CheckCircle2, Plus, Pencil, Trash2, Search } from "lucide-react"

const statusBadge: Record<string, { className: string }> = {
  PLANNED: { className: "bg-muted text-foreground/70" },
  IN_PROGRESS: { className: "bg-blue-100 text-blue-700" },
  COMPLETED: { className: "bg-green-100 text-green-700" },
  CANCELLED: { className: "bg-red-100 text-red-600" },
}

export default function MtmRoutesPage() {
  const { data: session } = useSession()
  const t = useTranslations("mtmRoutesPage")
  const tf = useTranslations("mtmForms")
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date_desc")
  const orgId = session?.user?.organizationId

  const fetchRoutes = async () => {
    try {
      const res = await fetch("/api/v1/mtm/routes?limit=200", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const r = await res.json()
      if (r.success) setRoutes(r.data.routes || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRoutes() }, [session])

  const filtered = routes.filter(r => {
    if (activeFilter !== "all" && r.status !== activeFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!r.agent?.name?.toLowerCase().includes(s) && !r.name?.toLowerCase().includes(s)) return false
    }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "date_desc": return new Date(b.date).getTime() - new Date(a.date).getTime()
      case "date_asc": return new Date(a.date).getTime() - new Date(b.date).getTime()
      case "status": return (a.status || "").localeCompare(b.status || "")
      default: return 0
    }
  })

  const statusCounts: Record<string, number> = {}
  for (const r of routes) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1

  const today = new Date().toDateString()
  const todayRoutes = routes.filter(r => new Date(r.date).toDateString() === today).length

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/routes/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchRoutes()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageDescription icon={Route} title={t("title")} description={t("subtitle")} />
        <div className="animate-pulse space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-muted rounded-lg" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={Route} title={`${t("title")} (${filtered.length})`} description={t("subtitle")} />
        <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> {t("add")}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label={t("statTotal")} value={routes.length} icon={<Route className="h-4 w-4" />} color="blue" hint={t("hintTotal")} />
        <ColorStatCard label={t("statToday")} value={todayRoutes} icon={<MapPin className="h-4 w-4" />} color="orange" hint={t("hintToday")} />
        <ColorStatCard label={t("statCompleted")} value={statusCounts["COMPLETED"] || 0} icon={<CheckCircle2 className="h-4 w-4" />} color="green" hint={t("hintCompleted")} />
        <ColorStatCard label={t("statInProgress")} value={statusCounts["IN_PROGRESS"] || 0} icon={<Route className="h-4 w-4" />} color="teal" hint={t("hintInProgress")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>{t("all")} ({routes.length})</Button>
        {(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map(s => (
          <Button key={s} variant={activeFilter === s ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(s)}>
            {t(`filter${s === "IN_PROGRESS" ? "InProgress" : s.charAt(0) + s.slice(1).toLowerCase()}` as any)} ({statusCounts[s] || 0})
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[160px]">
          <option value="date_desc">{t("sortDateDesc")}</option>
          <option value="date_asc">{t("sortDateAsc")}</option>
          <option value="status">{t("sortStatus")}</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">{routes.length === 0 ? t("empty") : t("noResults")}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((route) => {
            const badge = statusBadge[route.status] || statusBadge.PLANNED
            return (
              <div key={route.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-cyan-500" />
                    <span className="font-medium text-sm">{route.agent?.name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(route.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{route.status}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditData(route); setFormOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteItem(route); setDeleteOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {route.name && <div className="text-xs text-muted-foreground mb-2">{route.name}</div>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {route.totalPoints} {t("points")}</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> {route.visitedPoints} {t("visited")}</span>
                </div>
                {route.points && route.points.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {route.points.map((p: any, i: number) => (
                      <span key={p.id} className={`text-[10px] px-1.5 py-0.5 rounded border ${p.status === "VISITED" ? "bg-green-50 border-green-200 text-green-700" : p.status === "SKIPPED" ? "bg-red-50 border-red-200 text-red-600" : "bg-muted/50 border-border text-muted-foreground"}`}>
                        {i + 1}. {p.customer?.name || "—"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <MtmRouteForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchRoutes} initialData={editData} orgId={orgId ? String(orgId) : undefined} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("delete")} itemName={deleteItem?.name || tf("thisRoute")} />
    </div>
  )
}
