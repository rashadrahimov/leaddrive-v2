"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { Camera, ThumbsUp, ThumbsDown } from "lucide-react"

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
}

export default function MtmPhotosPage() {
  const t = useTranslations("nav")
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/mtm/photos?limit=50")
      .then((r) => r.json())
      .then((r) => { if (r.success) setPhotos(r.data.photos || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
