"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import { CampaignForm } from "@/components/campaign-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Input } from "@/components/ui/input"
import { Plus, Mail, Users, Send, Pencil, Trash2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface Campaign {
  id: string
  name: string
  description?: string
  status: string
  type: string
  subject?: string
  totalRecipients: number
  totalSent: number
  totalOpened: number
  totalClicked: number
  budget?: number
  templateId?: string
  segmentId?: string
  recipientMode?: string
  recipientIds?: string[]
  recipientSource?: string
  scheduledAt?: string
  sentAt?: string
  createdAt: string
}

const statusColors: Record<string, string> = {
  draft: "text-gray-500",
  scheduled: "text-amber-500",
  sending: "text-blue-500",
  sent: "text-green-600",
  cancelled: "text-red-500",
}

const typeIcons: Record<string, string> = {
  email: "📧",
  sms: "📱",
}

export default function CampaignsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const t = useTranslations("campaigns")
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Campaign | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [search, setSearch] = useState("")
  const orgId = session?.user?.organizationId

  const statusLabels: Record<string, string> = {
    draft: t("statusDraft"),
    scheduled: t("statusScheduled"),
    sending: t("statusSending"),
    sent: t("statusSent"),
    cancelled: t("statusCancelled"),
  }

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/v1/campaigns?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setCampaigns(json.data.campaigns)
        setTotal(json.data.total)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchCampaigns() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/campaigns/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    fetchCampaigns()
  }

  const handleSend = async (campaign: Campaign) => {
    if (!confirm(`${t("sendCampaign")} "${campaign.name}"?\n\n${t("recipients")}: ${campaign.totalRecipients}`)) return
    try {
      const res = await fetch(`/api/v1/campaigns/${campaign.id}/send`, {
        method: "POST",
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.smtpMissing) {
          alert(t("smtpNotConfigured"))
        } else {
          alert(json.error || "Error")
        }
        return
      }
      if (json.data.sent === 0) {
        alert(`${t("sentToRecipients")}: 0 / ${json.data.total}`)
      } else {
        alert(`${t("sentToRecipients")}: ${json.data.sent} / ${json.data.total}`)
      }
      setShowForm(false)
      setEditData(undefined)
      fetchCampaigns()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Status counts
  const statusCounts: Record<string, number> = { draft: 0, scheduled: 0, sending: 0, sent: 0, cancelled: 0 }
  for (const c of campaigns) {
    if (statusCounts[c.status] !== undefined) statusCounts[c.status]++
  }

  // Filter by search
  const filtered = campaigns.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.description || "").toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-5">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
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
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> {t("newCampaign")}
        </Button>
      </div>

      {/* Stats — 5 status cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard title={t("statusDraft")} value={statusCounts.draft} />
        <StatCard title={t("statusScheduled")} value={statusCounts.scheduled} />
        <StatCard title={t("statusSending")} value={statusCounts.sending} />
        <StatCard title={t("statusSent")} value={statusCounts.sent} />
        <StatCard title={t("statusCancelled")} value={statusCounts.cancelled} />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Campaign cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {campaigns.length === 0 ? t("noCampaigns") : t("noResults")}
          </div>
        ) : (
          filtered.map(campaign => (
            <div
              key={campaign.id}
              className="border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer bg-card"
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base">{campaign.name}</h3>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{campaign.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className={cn("font-medium", statusColors[campaign.status] || "text-gray-500")}>
                      {statusLabels[campaign.status] || campaign.status}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      {typeIcons[campaign.type] || "📧"} {campaign.type === "sms" ? "SMS" : "Email"}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {campaign.totalRecipients}
                    </span>
                    {campaign.totalSent > 0 && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Send className="h-3.5 w-3.5" /> {campaign.totalSent}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  {campaign.status === "sent" ? (
                    <div>
                      <div className="text-lg font-bold text-green-600">{campaign.totalSent}/{campaign.totalRecipients}</div>
                      <div className="text-xs text-muted-foreground">{t("sent")}</div>
                    </div>
                  ) : campaign.budget ? (
                    <div>
                      <div className="text-lg font-bold">{campaign.budget.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{t("budget")}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <CampaignForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchCampaigns}
        initialData={editData ? {
          ...editData,
          templateId: editData.templateId || "",
          segmentId: editData.segmentId || "",
          totalRecipients: String(editData.totalRecipients ?? 0),
          budget: String(editData.budget ?? 0),
        } : undefined}
        orgId={orgId}
        onSend={editData ? () => handleSend(editData) : undefined}
        onDelete={editData ? () => { setDeleteId(editData.id); setDeleteName(editData.name); setShowForm(false) } : undefined}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={t("deleteCampaign")}
        itemName={deleteName}
      />
    </div>
  )
}
