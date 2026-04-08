"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Camera, ThumbsUp, ThumbsDown, Check, X, Trash2 } from "lucide-react"

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
}

export default function MtmPhotosPage() {
  const { data: session } = useSession()
  const t = useTranslations("nav")
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const orgId = session?.user?.organizationId

  const fetchPhotos = async () => {
    try {
      const res = await fetch("/api/v1/mtm/photos?limit=50", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const r = await res.json()
      if (r.success) setPhotos(r.data.photos || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPhotos() }, [session])

  const updatePhotoStatus = async (photoId: string, status: string) => {
    try {
      await fetch(`/api/v1/mtm/photos/${photoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify({ status }),
      })
      fetchPhotos()
    } catch {}
  }

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/photos/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchPhotos()
  }

  return (
    <div className="space-y-4">
      <PageDescription icon={Camera} title={t("mtmPhotos")} description="Photo gallery with review system" />

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : photos.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">No photos yet</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="rounded-lg border bg-card overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {photo.url ? (
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
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
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-green-600 hover:bg-green-50" onClick={() => updatePhotoStatus(photo.id, "APPROVED")}>
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => updatePhotoStatus(photo.id, "REJECTED")}>
                      <X className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
                <div className="flex justify-end mt-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { setDeleteItem(photo); setDeleteOpen(true) }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Photo"
        itemName="this photo"
      />
    </div>
  )
}
