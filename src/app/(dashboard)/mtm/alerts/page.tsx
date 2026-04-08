"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { AlertTriangle, CheckCircle2, Trash2, Search, Bell } from "lucide-react"

const categoryColors: Record<string, string> = { CRITICAL: "bg-red-100 text-red-700 border-red-200", WARNING: "bg-amber-100 text-amber-700 border-amber-200", INFO: "bg-blue-100 text-blue-700 border-blue-200" }

export default function MtmAlertsPage() {
  const { data: session } = useSession()
  const t = useTranslations("mtmAlertsPage")
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date_desc")
  const orgId = session?.user?.organizationId

  const fetchAlerts = async () => {
    try {
      const resolved = showResolved ? "" : "&resolved=false"
      const res = await fetch(`/api/v1/mtm/alerts?limit=200${resolved}`, { headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
      const r = await res.json()
      if (r.success) setAlerts(r.data.alerts || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { setLoading(true); fetchAlerts() }, [session, showResolved])

  const filtered = alerts.filter(a => {
    if (activeFilter !== "all" && a.category !== activeFilter) return false
    if (search) { const s = search.toLowerCase(); if (!a.title?.toLowerCase().includes(s) && !a.agent?.name?.toLowerCase().includes(s)) return false }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "date_desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "category": { const order: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 }; return (order[a.category] ?? 2) - (order[b.category] ?? 2) }
      default: return 0
    }
  })

  const catCounts: Record<string, number> = {}
  for (const a of alerts) catCounts[a.category] = (catCounts[a.category] || 0) + 1
  const resolvedCount = alerts.filter(a => a.isResolved).length

  const resolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/v1/mtm/alerts/${alertId}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>) }, body: JSON.stringify({ isResolved: true }) })
      fetchAlerts()
    } catch {}
  }

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/alerts/${deleteItem.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchAlerts()
  }

  if (loading) return (
    <div className="space-y-6">
      <PageDescription icon={AlertTriangle} title={t("title")} description={t("subtitle")} />
      <div className="animate-pulse space-y-4"><div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div><div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}</div></div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={AlertTriangle} title={`${t("title")} (${filtered.length})`} description={t("subtitle")} />
        <Button variant="outline" size="sm" onClick={() => setShowResolved(!showResolved)}>
          {showResolved ? t("hideResolved") : t("showAll")}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label={t("statTotal")} value={alerts.length} icon={<Bell className="h-4 w-4" />} color="blue" hint={t("hintTotal")} />
        <ColorStatCard label={t("statCritical")} value={catCounts["CRITICAL"] || 0} icon={<AlertTriangle className="h-4 w-4" />} color="red" hint={t("hintCritical")} />
        <ColorStatCard label={t("statWarning")} value={catCounts["WARNING"] || 0} icon={<AlertTriangle className="h-4 w-4" />} color="amber" hint={t("hintWarning")} />
        <ColorStatCard label={t("statResolved")} value={resolvedCount} icon={<CheckCircle2 className="h-4 w-4" />} color="green" hint={t("hintResolved")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>{t("all")} ({alerts.length})</Button>
        {(["CRITICAL", "WARNING", "INFO"] as const).map(cat => (
          <Button key={cat} variant={activeFilter === cat ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(cat)}>
            {t(`filter${cat.charAt(0) + cat.slice(1).toLowerCase()}` as any)} ({catCounts[cat] || 0})
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[160px]">
          <option value="date_desc">{t("sortDateDesc")}</option>
          <option value="category">{t("sortCategory")}</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">{alerts.length === 0 ? t("empty") : t("noResults")}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => {
            const cat = categoryColors[alert.category] || categoryColors.INFO
            return (
              <div key={alert.id} className={`rounded-lg border p-3 ${cat}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium text-sm">{alert.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{alert.agent?.name}</span>
                    <span className="text-[10px] opacity-70">{new Date(alert.createdAt).toLocaleString()}</span>
                    {!alert.isResolved && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] bg-white/50 hover:bg-white/80" onClick={() => resolveAlert(alert.id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {t("resolve")}
                      </Button>
                    )}
                    {alert.isResolved && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">{t("resolved")}</span>}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setDeleteItem(alert); setDeleteOpen(true) }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                {alert.description && <p className="text-xs mt-1 opacity-80">{alert.description}</p>}
                <div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-mono">{alert.type}</span></div>
              </div>
            )
          })}
        </div>
      )}

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("delete")} itemName={deleteItem?.title} />
    </div>
  )
}
