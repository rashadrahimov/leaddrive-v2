"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { OfferForm } from "@/components/offer-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { InfoHint } from "@/components/info-hint"
import { PageDescription } from "@/components/page-description"
import { FileSpreadsheet, Plus, Pencil, Trash2 } from "lucide-react"

interface Offer {
  id: string
  offerNumber: string
  title: string
  companyId?: string
  status: "draft" | "sent" | "accepted" | "rejected"
  totalAmount?: number
  currency: string
  validUntil?: string
  notes?: string
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = { draft: "secondary", sent: "default", accepted: "outline", rejected: "destructive" }

export default function OffersPage() {
  const { data: session } = useSession()
  const t = useTranslations("offers")
  const [offers, setOffers] = useState<Offer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Offer | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = session?.user?.organizationId

  const fetchOffers = async () => {
    try {
      const res = await fetch("/api/v1/offers?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setOffers(json.data.offers)
        setTotal(json.data.total)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchOffers() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/offers/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchOffers()
  }

  const columns = [
    { key: "offerNumber", label: t("colNumber"), sortable: true, hint: t("hintColNumber") },
    { key: "title", label: t("colTitle"), sortable: true, hint: t("hintColTitle") },
    {
      key: "totalAmount", label: t("colAmount"), sortable: true, hint: t("hintColAmount"),
      render: (item: any) => <span className="font-medium">{item.totalAmount ? item.totalAmount.toLocaleString() : "—"} {item.currency}</span>,
    },
    {
      key: "status", label: t("colStatus"), sortable: true, hint: t("hintColStatus"),
      render: (item: any) => <Badge variant={statusColors[item.status]}>{item.status}</Badge>,
    },
    {
      key: "validUntil", label: t("colValidUntil"), sortable: true, hint: t("hintColValidUntil"),
      render: (item: any) => item.validUntil ? new Date(item.validUntil).toLocaleDateString() : "—",
    },
    {
      key: "actions", label: "", sortable: false,
      render: (item: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setEditData(item); setShowForm(true) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setDeleteId(item.id); setDeleteName(item.title) }}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse h-96 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }}><Plus className="h-4 w-4 mr-1" /> {t("newOffer")}</Button>
      </div>

      <PageDescription text={t("pageDescription")} />

      <DataTable columns={columns} data={offers} searchPlaceholder={t("searchPlaceholder")} searchKey="title" />

      <OfferForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchOffers}
        initialData={editData as any}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={t("deleteOffer")}
        itemName={deleteName}
      />
    </div>
  )
}
