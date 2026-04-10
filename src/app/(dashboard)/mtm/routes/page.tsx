"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { MtmRouteForm } from "@/components/mtm/route-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import dynamic from "next/dynamic"
import {
  Route, MapPin, User, CheckCircle2, Plus, Pencil, Trash2, Search,
  List, CalendarDays, Clock, Navigation, ChevronLeft, ChevronRight, X, Copy,
} from "lucide-react"

const MtmRouteMap = dynamic(() => import("@/components/mtm/route-map"), { ssr: false })

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
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [selectedRoute, setSelectedRoute] = useState<any>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const orgId = session?.user?.organizationId

  const fetchRoutes = async () => {
    try {
      const res = await fetch("/api/v1/mtm/routes?limit=200", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const r = await res.json()
      if (r.success) setRoutes(r.data.routes || [])
    } catch {} finally { setLoading(false) }
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
    const res = await fetch(`/api/v1/mtm/routes/${deleteItem.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchRoutes()
    if (selectedRoute?.id === deleteItem.id) setSelectedRoute(null)
  }

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { date: Date; routes: any[] }[] = []
    for (let i = 0; i < firstDay; i++) days.push({ date: new Date(year, month, -firstDay + i + 1), routes: [] })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      days.push({ date, routes: routes.filter(r => new Date(r.date).toDateString() === date.toDateString()) })
    }
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) for (let i = 1; i <= remaining; i++) days.push({ date: new Date(year, month + 1, i), routes: [] })
    return days
  }, [calendarMonth, routes])

  const routeMetrics = useMemo(() => {
    if (!selectedRoute) return null
    const completion = selectedRoute.totalPoints > 0 ? Math.round((selectedRoute.visitedPoints / selectedRoute.totalPoints) * 100) : 0
    const duration = selectedRoute.startedAt && selectedRoute.completedAt
      ? Math.round((new Date(selectedRoute.completedAt).getTime() - new Date(selectedRoute.startedAt).getTime()) / 60000) : null
    return { completion, duration }
  }, [selectedRoute])

  if (loading) return (
    <div className="space-y-6">
      <PageDescription icon={Route} title={t("title")} description={t("subtitle")} />
      <div className="animate-pulse space-y-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-muted rounded-lg" />)}</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={Route} title={`${t("title")} (${filtered.length})`} description={t("subtitle")} />
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "calendar" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("calendar")}><CalendarDays className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            // Templates: save current route as template or apply existing
            const templates = routes.filter(r => r.name?.includes("[TEMPLATE]") || r.name?.includes("[SEED]"))
            if (templates.length > 0) {
              const tpl = templates[0]
              setEditData({ ...tpl, id: undefined, name: tpl.name?.replace("[TEMPLATE]", "").replace("[SEED]", "").trim() + " (copy)", date: new Date().toISOString().split("T")[0] })
              setFormOpen(true)
            } else {
              alert("No templates found. Create a route with [TEMPLATE] in the name to save it as a template.")
            }
          }}><Copy className="h-4 w-4 mr-1" /> Templates</Button>
          <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}><Plus className="h-4 w-4 mr-1" /> {t("add")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label={t("statTotal")} value={routes.length} icon={<Route className="h-4 w-4" />} color="blue" hint={t("hintTotal")} />
        <ColorStatCard label={t("statToday")} value={todayRoutes} icon={<MapPin className="h-4 w-4" />} color="orange" hint={t("hintToday")} />
        <ColorStatCard label={t("statCompleted")} value={statusCounts["COMPLETED"] || 0} icon={<CheckCircle2 className="h-4 w-4" />} color="green" hint={t("hintCompleted")} />
        <ColorStatCard label={t("statInProgress")} value={statusCounts["IN_PROGRESS"] || 0} icon={<Route className="h-4 w-4" />} color="teal" hint={t("hintInProgress")} />
      </div>

      {/* Route Detail Panel */}
      {selectedRoute && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{selectedRoute.name || selectedRoute.agent?.name} — {new Date(selectedRoute.date).toLocaleDateString()}</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedRoute(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center"><CheckCircle2 className="h-4 w-4 mx-auto text-green-500 mb-1" /><div className="text-lg font-bold">{selectedRoute.visitedPoints}/{selectedRoute.totalPoints}</div><div className="text-[10px] text-muted-foreground">Completed</div></div>
            <div className="rounded-lg bg-muted/50 p-3 text-center"><Navigation className="h-4 w-4 mx-auto text-blue-500 mb-1" /><div className="text-lg font-bold">{routeMetrics?.completion ?? 0}%</div><div className="text-[10px] text-muted-foreground">Execution</div></div>
            <div className="rounded-lg bg-muted/50 p-3 text-center"><Clock className="h-4 w-4 mx-auto text-amber-500 mb-1" /><div className="text-lg font-bold">{routeMetrics?.duration ? `${Math.floor(routeMetrics.duration / 60)}h ${routeMetrics.duration % 60}m` : "—"}</div><div className="text-[10px] text-muted-foreground">Duration</div></div>
            <div className="rounded-lg bg-muted/50 p-3 text-center"><MapPin className="h-4 w-4 mx-auto text-purple-500 mb-1" /><div className="text-lg font-bold">{selectedRoute.totalPoints}</div><div className="text-[10px] text-muted-foreground">Points</div></div>
            <div className="rounded-lg bg-muted/50 p-3 text-center"><Route className="h-4 w-4 mx-auto text-indigo-500 mb-1" /><div className="text-lg font-bold">{selectedRoute.distanceKm ? `${selectedRoute.distanceKm} km` : "—"}</div><div className="text-[10px] text-muted-foreground">Distance</div></div>
          </div>
          {selectedRoute.points?.length > 0 && selectedRoute.points.some((p: any) => p.customer?.latitude) && (
            <div className="rounded-lg border overflow-hidden" style={{ height: 300 }}><MtmRouteMap points={selectedRoute.points} /></div>
          )}
          {selectedRoute.points?.length > 0 && (
            <div className="space-y-1">
              {selectedRoute.points.sort((a: any, b: any) => a.orderIndex - b.orderIndex).map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-2 text-xs py-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${p.status === "VISITED" ? "bg-green-100 text-green-700" : p.status === "SKIPPED" ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                  <span className="flex-1">{p.customer?.name || "—"}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.status === "VISITED" ? "bg-green-50 text-green-700" : p.status === "SKIPPED" ? "bg-red-50 text-red-600" : "bg-muted/50 text-muted-foreground"}`}>{p.status}</span>
                  {p.visitedAt && <span className="text-muted-foreground">{new Date(p.visitedAt).toLocaleTimeString()}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === "list" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>{t("all")} ({routes.length})</Button>
            {(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map(s => (
              <Button key={s} variant={activeFilter === s ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(s)}>
                {t(`filter${s === "IN_PROGRESS" ? "InProgress" : s.charAt(0) + s.slice(1).toLowerCase()}` as any)} ({statusCounts[s] || 0})
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
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
                const completion = route.totalPoints > 0 ? Math.round((route.visitedPoints / route.totalPoints) * 100) : 0
                return (
                  <div key={route.id} className="rounded-lg border bg-card p-4 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedRoute(route)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-cyan-500" /><span className="font-medium text-sm">{route.agent?.name}</span>
                        <span className="text-xs text-muted-foreground">{new Date(route.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{route.status}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditData(route); setFormOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); setDeleteItem(route); setDeleteOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    {route.name && <div className="text-xs text-muted-foreground mb-2">{route.name}</div>}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {route.totalPoints} {t("points")}</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> {route.visitedPoints} {t("visited")}</span>
                      </div>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${completion}%` }} /></div>
                      <span className="text-xs font-medium text-muted-foreground">{completion}%</span>
                    </div>
                    {route.points && route.points.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {route.points.map((p: any, i: number) => (
                          <span key={p.id} className={`text-[10px] px-1.5 py-0.5 rounded border ${p.status === "VISITED" ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800" : p.status === "SKIPPED" ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-800" : "bg-muted/50 border-border text-muted-foreground"}`}>
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
        </>
      ) : (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <h3 className="font-semibold text-sm">{calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
            <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-px">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              const isCurrentMonth = day.date.getMonth() === calendarMonth.getMonth()
              const isToday = day.date.toDateString() === new Date().toDateString()
              return (
                <div key={i} className={`min-h-[80px] p-1 border rounded text-xs ${isCurrentMonth ? "bg-card" : "bg-muted/30 opacity-50"} ${isToday ? "border-primary" : "border-border/50"}`}>
                  <div className={`text-[10px] font-medium mb-0.5 ${isToday ? "text-primary" : ""}`}>{day.date.getDate()}</div>
                  {day.routes.slice(0, 3).map((r: any) => (
                    <div key={r.id} className={`text-[9px] px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80 ${
                      r.status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" :
                      r.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" :
                      r.status === "CANCELLED" ? "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400" :
                      "bg-muted text-muted-foreground"
                    }`} onClick={() => setSelectedRoute(r)}>{r.agent?.name?.split(" ")[0]} · {r.totalPoints}pts</div>
                  ))}
                  {day.routes.length > 3 && <div className="text-[9px] text-muted-foreground">+{day.routes.length - 3} more</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <MtmRouteForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchRoutes} initialData={editData} orgId={orgId ? String(orgId) : undefined} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("delete")} itemName={deleteItem?.name || tf("thisRoute")} />
    </div>
  )
}
