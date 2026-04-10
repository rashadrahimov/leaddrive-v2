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
import { Camera, ThumbsUp, ThumbsDown, Check, X, Trash2, Search, Clock, CheckCircle2, XCircle, Download, LayoutGrid, Columns, CheckSquare } from "lucide-react"

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
  const [viewMode, setViewMode] = useState<"gallery" | "compare" | "batch">("gallery")
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [compareLeft, setCompareLeft] = useState<any>(null)
  const [compareRight, setCompareRight] = useState<any>(null)
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
      <div className="flex items-center justify-between">
        <PageDescription icon={Camera} title={`${t("title")} (${filtered.length})`} description={t("subtitle")} />
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode === "gallery" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("gallery")}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={viewMode === "compare" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("compare")}><Columns className="h-4 w-4" /></Button>
            <Button variant={viewMode === "batch" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => { setViewMode("batch"); setSelectedPhotos(new Set()) }}><CheckSquare className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export ({filtered.length})</Button>
        </div>
      </div>

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

      {/* Batch action bar */}
      {viewMode === "batch" && selectedPhotos.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-primary/5">
          <span className="text-xs font-medium">{selectedPhotos.size} selected</span>
          <Button size="sm" variant="outline" className="h-6 text-xs text-green-600" onClick={() => { selectedPhotos.forEach(id => updatePhotoStatus(id, "APPROVED")); setSelectedPhotos(new Set()) }}>
            <Check className="h-3 w-3 mr-1" /> Approve All
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs text-red-600" onClick={() => { selectedPhotos.forEach(id => updatePhotoStatus(id, "REJECTED")); setSelectedPhotos(new Set()) }}>
            <X className="h-3 w-3 mr-1" /> Reject All
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs ml-auto" onClick={() => setSelectedPhotos(new Set())}>Clear</Button>
        </div>
      )}

      {/* Compare view */}
      {viewMode === "compare" && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-card p-4">
          {[{ photo: compareLeft, setter: setCompareLeft, label: "Left" }, { photo: compareRight, setter: setCompareRight, label: "Right" }].map(({ photo, setter, label }) => (
            <div key={label}>
              <div className="text-xs font-medium text-muted-foreground mb-2">{label} — {photo ? `${photo.agent?.name} (${photo.status})` : "Click a photo below to select"}</div>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {photo?.url ? <img src={photo.url} alt="" className="w-full h-full object-cover" /> : <Camera className="h-12 w-12 text-muted-foreground/30" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">{photos.length === 0 ? t("empty") : t("noResults")}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(photo => (
            <div key={photo.id} className={`rounded-lg border bg-card overflow-hidden cursor-pointer transition-all ${selectedPhotos.has(photo.id) ? "ring-2 ring-primary" : ""}`}
              onClick={() => {
                if (viewMode === "batch") {
                  setSelectedPhotos(prev => { const next = new Set(prev); next.has(photo.id) ? next.delete(photo.id) : next.add(photo.id); return next })
                } else if (viewMode === "compare") {
                  if (!compareLeft) setCompareLeft(photo)
                  else if (!compareRight) setCompareRight(photo)
                  else { setCompareLeft(compareRight); setCompareRight(photo) }
                }
              }}>
              <div className="aspect-square bg-muted flex items-center justify-center relative">
                {photo.url ? <img src={photo.url} alt="" className="w-full h-full object-cover" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
                {viewMode === "batch" && (
                  <div className={`absolute top-1.5 left-1.5 w-4 h-4 rounded border-2 flex items-center justify-center ${selectedPhotos.has(photo.id) ? "bg-primary border-primary text-white" : "border-white/70 bg-black/20"}`}>
                    {selectedPhotos.has(photo.id) && <Check className="h-2.5 w-2.5" />}
                  </div>
                )}
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
