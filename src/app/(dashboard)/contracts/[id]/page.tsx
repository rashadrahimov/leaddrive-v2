"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Pencil, Trash2, FileText, Calendar, DollarSign, Hash, Clock, AlertTriangle } from "lucide-react"
import { ColorStatCard } from "@/components/color-stat-card"
import { InfoHint } from "@/components/info-hint"
import { ContractForm } from "@/components/contract-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  expired: "destructive",
  draft: "secondary",
}

export default function ContractDetailPage() {
  const t = useTranslations("contracts")
  const tc = useTranslations("common")
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const orgId = session?.user?.organizationId

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/v1/contracts/${params.id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success && json.data) setContract(json.data)
    } catch (err) { console.error(err) } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) fetchContract()
  }, [params.id, session])

  const handleDelete = async () => {
    const res = await fetch(`/api/v1/contracts/${params.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || "Failed to delete")
    router.push("/contracts")
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

  if (!contract) {
    return <div className="text-center py-12 text-muted-foreground">{tc("noData")}</div>
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contracts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{contract.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{contract.contractNumber || "—"}</span>
                <Badge variant={statusColors[contract.status] || "secondary"}>{contract.status}</Badge>
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

      {(() => {
        const daysActive = contract.startDate
          ? Math.floor((Date.now() - new Date(contract.startDate).getTime()) / 86400000)
          : null
        const daysLeft = contract.endDate
          ? Math.floor((new Date(contract.endDate).getTime() - Date.now()) / 86400000)
          : null
        const endBg = daysLeft === null ? "bg-slate-400 shadow-slate-400/30"
          : daysLeft < 0 ? "bg-red-500 shadow-red-500/30"
          : daysLeft < 30 ? "bg-amber-500 shadow-amber-500/30"
          : "bg-orange-500 shadow-orange-500/30"
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ColorStatCard
              label={tc("daysActive")}
              value={daysActive !== null ? daysActive : "—"}
              icon={<Clock className="h-4 w-4" />}
              color="blue"
            />
            <ColorStatCard
              label={tc("value")}
              value={contract.valueAmount ? `${Number(contract.valueAmount).toLocaleString()} ${contract.currency || "USD"}` : "—"}
              icon={<DollarSign className="h-4 w-4" />}
              color="green"
              hint={t("hintColAmount")}
            />
            <ColorStatCard
              label={tc("type")}
              value={contract.type || "—"}
              icon={<Hash className="h-4 w-4" />}
              color="violet"
              hint={t("hintColType")}
            />
            <ColorStatCard
              label={tc("daysLeft")}
              value={daysLeft !== null ? (daysLeft < 0 ? t("expired") : `${daysLeft}`) : "—"}
              icon={<AlertTriangle className="h-4 w-4" />}
              bgClass={endBg}
              hint={t("hintColDates")}
            />
          </div>
        )
      })()}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1">{tc("details")} <InfoHint text={t("pageDescription")} size={12} /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">{t("number")}:</span>
              <span className="ml-2 font-medium">{contract.contractNumber || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{tc("type")}:</span>
              <span className="ml-2 font-medium">{contract.type || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{tc("status")}:</span>
              <Badge variant={statusColors[contract.status] || "secondary"} className="ml-2">{contract.status}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">{tc("currency")}:</span>
              <span className="ml-2 font-medium">{contract.currency || "—"}</span>
            </div>
          </div>
          {contract.notes && (
            <div className="pt-4 border-t">
              <span className="text-muted-foreground">{tc("notes")}:</span>
              <p className="mt-1 whitespace-pre-wrap">{contract.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ContractForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchContract}
        orgId={orgId}
        initialData={{
          id: contract.id,
          contractNumber: contract.contractNumber || "",
          title: contract.title || "",
          type: contract.type || "",
          status: contract.status,
          startDate: contract.startDate ? new Date(contract.startDate).toISOString().split("T")[0] : "",
          endDate: contract.endDate ? new Date(contract.endDate).toISOString().split("T")[0] : "",
          valueAmount: contract.valueAmount || 0,
          currency: contract.currency || "USD",
          notes: contract.notes || "",
        }}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t("deleteContract")}
        itemName={contract.title}
      />
    </div>
  )
}
