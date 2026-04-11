"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { MtmVisitForm } from "@/components/mtm/visit-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { CheckSquare, Plus, Pencil, Trash2, Search, Clock, CheckCircle2, AlertTriangle } from "lucide-react"
import { calculateDistance } from "@/lib/geo-utils"

export default function MtmVisitsPage() {
  const { data: session } = useSession()
  const t = useTranslations("mtmVisitsPage")
  const tf = useTranslations("mtmForms")
  const [visits, setVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date_desc")
  const orgId = session?.user?.organizationId

  const fetchVisits = async () => {
    try {
      const res = await fetch("/api/v1/mtm/visits?limit=200", { headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
      const r = await res.json()
      if (r.success) setVisits(r.data.visits || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchVisits() }, [session])

  const filtered = visits.filter(v => {
    if (activeFilter !== "all" && v.status !== activeFilter) return false
    if (search) { const s = search.toLowerCase(); if (!v.agent?.name?.toLowerCase().includes(s) && !v.customer?.name?.toLowerCase().includes(s)) return false }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "date_desc": return new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime()
      case "date_asc": return new Date(a.checkInAt).getTime() - new Date(b.checkInAt).getTime()
      case "duration": return (b.duration || 0) - (a.duration || 0)
      default: return 0
    }
  })

  const statusCounts: Record<string, number> = {}
  for (const v of visits) statusCounts[v.status] = (statusCounts[v.status] || 0) + 1
  const avgDuration = visits.filter(v => v.duration).length > 0
    ? Math.round(visits.reduce((s, v) => s + (v.duration || 0), 0) / visits.filter(v => v.duration).length)
    : 0

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/visits/${deleteItem.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchVisits()
  }

  if (loading) return (
    <div className="space-y-6">
      <PageDescription icon={CheckSquare} title={t("title")} description={t("subtitle")} />
      <div className="animate-pulse space-y-4"><div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div><div className="h-64 bg-muted rounded-lg" /></div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={CheckSquare} title={`${t("title")} (${filtered.length})`} description={t("subtitle")} />
        <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}><Plus className="h-4 w-4 mr-1" /> {t("add")}</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label={t("statTotal")} value={visits.length} icon={<CheckSquare className="h-4 w-4" />} color="blue" hint={t("hintTotal")} />
        <ColorStatCard label={t("statCheckedIn")} value={statusCounts["CHECKED_IN"] || 0} icon={<Clock className="h-4 w-4" />} color="orange" hint={t("hintCheckedIn")} />
        <ColorStatCard label={t("statCheckedOut")} value={statusCounts["CHECKED_OUT"] || 0} icon={<CheckCircle2 className="h-4 w-4" />} color="green" hint={t("hintCheckedOut")} />
        <ColorStatCard label={t("statAvgDuration")} value={`${avgDuration} ${t("min")}`} icon={<Clock className="h-4 w-4" />} color="violet" hint={t("hintAvgDuration")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>{t("all")} ({visits.length})</Button>
        {(["CHECKED_IN", "CHECKED_OUT"] as const).map(s => (
          <Button key={s} variant={activeFilter === s ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(s)}>
            {t(`filter${s === "CHECKED_IN" ? "CheckedIn" : "CheckedOut"}` as any)} ({statusCounts[s] || 0})
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[160px]">
          <option value="date_desc">{t("sortDateDesc")}</option>
          <option value="date_asc">{t("sortDateAsc")}</option>
          <option value="duration">{t("sortDuration")}</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">{visits.length === 0 ? t("empty") : t("noResults")}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-2 font-medium">{t("colAgent")}</th>
              <th className="px-4 py-2 font-medium">{t("colCustomer")}</th>
              <th className="px-4 py-2 font-medium">{t("colStatus")}</th>
              <th className="px-4 py-2 font-medium">{t("colCheckIn")}</th>
              <th className="px-4 py-2 font-medium">{t("colCheckOut")}</th>
              <th className="px-4 py-2 font-medium">{t("colDuration")}</th>
              <th className="px-4 py-2 font-medium">GPS</th>
              <th className="px-4 py-2 font-medium w-20"></th>
            </tr></thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2">{v.agent?.name}</td>
                  <td className="px-4 py-2">{v.customer?.name}</td>
                  <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${v.status === "CHECKED_OUT" ? "bg-green-100 text-green-700" : v.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>{v.status}</span></td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(v.checkInAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-muted-foreground">{v.checkOutAt ? new Date(v.checkOutAt).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{v.duration ? `${v.duration} ${t("min")}` : "—"}</td>
                  <td className="px-4 py-2">
                    {(() => {
                      if (v.checkInLat == null || v.checkInLng == null || v.customer?.latitude == null || v.customer?.longitude == null) return <span className="text-muted-foreground text-xs">—</span>
                      const dist = Math.round(calculateDistance(v.checkInLat, v.checkInLng, v.customer.latitude, v.customer.longitude))
                      const ok = dist <= 100
                      return (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {!ok && <AlertTriangle className="h-3 w-3" />}
                          {dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-2"><div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditData(v); setFormOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteItem(v); setDeleteOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MtmVisitForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchVisits} initialData={editData} orgId={orgId ? String(orgId) : undefined} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("delete")} itemName={deleteItem?.customer?.name || tf("thisVisit")} />
    </div>
  )
}
