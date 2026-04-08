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
import { Camera, ThumbsUp, ThumbsDown, Check, X, Trash2, Search, Clock, CheckCircle2, XCircle } from "lucide-react"

const statusColors: Record<string, string> = { PENDING: "bg-amber-100 text-amber-700", APPROVED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-600" }

export default function MtmPhotosPage() {
  const { data: session } = useSession()
  const t = useTranslations("mtmPhotosPage")
  const tf = useTranslations("mtmForms")
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date_desc")
  const orgId = session?.user?.organizationId

  const fetchPhotos = async () => {
    try {
      const res = await fetch("/api/v1/mtm/photos?limit=200", { headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
      const r = await res.json()
      if (r.success) setPhotos(r.data.photos || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchPhotos() }, [session])

  const filtered = photos.filter(p => {
    if (activeFilter !== "all" && p.status !== activeFilter) return false
    if (search) { const s = search.toLowerCase(); if (!p.agent?.name?.toLowerCase().includes(s)) return false }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "date_desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "status": return (a.status || "").localeCompare(b.status || "")
      default: return 0
    }
  })

  const statusCounts: Record<string, number> = {}
  for (const p of photos) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1

  const updatePhotoStatus = async (photoId: string, status: string) => {
    try {
      await fetch(`/api/v1/mtm/photos/${photoId}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>) }, body: JSON.stringify({ status }) })
      fetchPhotos()
    } catch {}
  }

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/photos/${deleteItem.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchPhotos()
  }

  if (loading) return (
    <div className="space-y-6">
      <PageDescription icon={Camera} title={t("title")} description={t("subtitle")} />
      <div className="animate-pulse space-y-4"><div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="aspect-square bg-muted rounded-lg" />)}</div></div>
    </div>
  )

  return (
    <div className="space-y-4">
      <PageDescription icon={Camera} title={`${t("title")} (${filtered.length})`} description={t("subtitle")} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label={t("statTotal")} value={photos.length} icon={<Camera className="h-4 w-4" />} color="blue" hint={t("hintTotal")} />
        <ColorStatCard label={t("statPending")} value={statusCounts["PENDING"] || 0} icon={<Clock className="h-4 w-4" />} color="orange" hint={t("hintPending")} />
        <ColorStatCard label={t("statApproved")} value={statusCounts["APPROVED"] || 0} icon={<CheckCircle2 className="h-4 w-4" />} color="green" hint={t("hintApproved")} />
        <ColorStatCard label={t("statRejected")} value={statusCounts["REJECTED"] || 0} icon={<XCircle className="h-4 w-4" />} color="red" hint={t("hintRejected")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>{t("all")} ({photos.length})</Button>
        {(["PENDING", "APPROVED", "REJECTED"] as const).map(s => (
          <Button key={s} variant={activeFilter === s ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(s)}>
            {t(`filter${s.charAt(0) + s.slice(1).toLowerCase()}` as any)} ({statusCounts[s] || 0})
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[160px]">
          <option value="date_desc">{t("sortDateDesc")}</option>
          <option value="status">{t("sortStatus")}</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">{photos.length === 0 ? t("empty") : t("noResults")}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(photo => (
            <div key={photo.id} className="rounded-lg border bg-card overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {photo.url ? <img src={photo.url} alt="" className="w-full h-full object-cover" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="p-2">
                <div className="text-xs font-medium truncate">{photo.agent?.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{photo.visit?.customer?.name || "—"}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[photo.status] || ""}`}>{photo.status}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />{photo.likes}</span>
                    <span className="flex items-center gap-0.5"><ThumbsDown className="h-2.5 w-2.5" />{photo.dislikes}</span>
                  </div>
                </div>
                {photo.status === "PENDING" && (
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-green-600 hover:bg-green-50" onClick={() => updatePhotoStatus(photo.id, "APPROVED")}><Check className="h-3 w-3 mr-1" /> {t("approve")}</Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => updatePhotoStatus(photo.id, "REJECTED")}><X className="h-3 w-3 mr-1" /> {t("reject")}</Button>
                  </div>
                )}
                <div className="flex justify-end mt-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { setDeleteItem(photo); setDeleteOpen(true) }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("delete")} itemName={deleteItem?.agent?.name || tf("thisPhoto")} />
    </div>
  )
}
