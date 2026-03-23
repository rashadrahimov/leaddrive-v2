"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Pencil, Trash2, FileCheck, DollarSign, Calendar, Hash } from "lucide-react"
import { OfferForm } from "@/components/offer-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "default",
  accepted: "default",
  rejected: "destructive",
}

export default function OfferDetailPage() {
  const t = useTranslations("offers")
  const tc = useTranslations("common")
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [offer, setOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const orgId = session?.user?.organizationId

  const fetchOffer = async () => {
    try {
      const res = await fetch(`/api/v1/offers/${params.id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success && json.data) setOffer(json.data)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) fetchOffer()
  }, [params.id, session])

  const handleDelete = async () => {
    const res = await fetch(`/api/v1/offers/${params.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || "Failed to delete")
    router.push("/offers")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (!offer) {
    return <div className="text-center py-12 text-muted-foreground">{tc("noData")}</div>
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/offers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{offer.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{offer.offerNumber || "—"}</span>
                <Badge variant={statusColors[offer.status] || "secondary"}>{offer.status}</Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" /> {tc("edit")}
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> {tc("delete")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">{t("colAmount")}</div>
              <span className="text-sm font-medium">
                {offer.totalAmount ? `${Number(offer.totalAmount).toLocaleString()} ${offer.currency || "USD"}` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">{t("colValidUntil")}</div>
              <span className="text-sm font-medium">{formatDate(offer.validUntil)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">{t("colNumber")}</div>
              <span className="text-sm font-medium">{offer.offerNumber || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tc("details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">{t("colNumber")}:</span>
              <span className="ml-2 font-medium">{offer.offerNumber || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{tc("status")}:</span>
              <Badge variant={statusColors[offer.status] || "secondary"} className="ml-2">{offer.status}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">{t("colAmount")}:</span>
              <span className="ml-2 font-medium">
                {offer.totalAmount ? `${Number(offer.totalAmount).toLocaleString()} ${offer.currency || "USD"}` : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("colValidUntil")}:</span>
              <span className="ml-2 font-medium">{formatDate(offer.validUntil)}</span>
            </div>
          </div>
          {offer.notes && (
            <div className="pt-4 border-t">
              <span className="text-muted-foreground">{tc("notes")}:</span>
              <p className="mt-1 whitespace-pre-wrap">{offer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <OfferForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchOffer}
        orgId={orgId}
        initialData={{
          id: offer.id,
          offerNumber: offer.offerNumber || "",
          title: offer.title || "",
          status: offer.status,
          totalAmount: offer.totalAmount || 0,
          currency: offer.currency || "USD",
          validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().split("T")[0] : "",
          notes: offer.notes || "",
        }}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t("deleteOffer")}
        itemName={offer.title}
      />
    </div>
  )
}
