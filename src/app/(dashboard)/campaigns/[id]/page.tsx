"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Pencil, Trash2, Megaphone, Users, Mail, MousePointerClick, DollarSign, Calendar } from "lucide-react"
import { CampaignForm } from "@/components/campaign-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

const typeColors: Record<string, "default" | "secondary"> = {
  email: "default",
  sms: "secondary",
}

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  draft: "secondary",
  scheduled: "default",
  sending: "default",
  sent: "default",
  paused: "secondary",
  cancelled: "destructive",
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const orgId = session?.user?.organizationId

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/v1/campaigns/${params.id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success && json.data) setCampaign(json.data)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) fetchCampaign()
  }, [params.id, session])

  const handleDelete = async () => {
    const res = await fetch(`/api/v1/campaigns/${params.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || "Failed to delete")
    router.push("/campaigns")
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

  if (!campaign) {
    return <div className="text-center py-12 text-muted-foreground">Campaign not found</div>
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—"
  const totalSent = campaign.totalSent ?? 0
  const totalOpened = campaign.totalOpened ?? 0
  const totalClicked = campaign.totalClicked ?? 0
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0"
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0.0"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={typeColors[campaign.type] || "secondary"}>{campaign.type}</Badge>
                <Badge variant={statusColors[campaign.status] || "secondary"}>{campaign.status}</Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Recipients</div>
              <span className="text-sm font-medium">{campaign.totalRecipients ?? 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Sent</div>
              <span className="text-sm font-medium">{totalSent}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Opened</div>
              <span className="text-sm font-medium">{totalOpened} ({openRate}%)</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Clicked</div>
              <span className="text-sm font-medium">{totalClicked} ({clickRate}%)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Subject:</span>
              <span className="ml-2 font-medium">{campaign.subject || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>
              <Badge variant={typeColors[campaign.type] || "secondary"} className="ml-2">{campaign.type}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={statusColors[campaign.status] || "secondary"} className="ml-2">{campaign.status}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Budget:</span>
              <span className="ml-2 font-medium">
                {campaign.budget ? `$${Number(campaign.budget).toLocaleString()}` : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Scheduled At:</span>
              <span className="ml-2 font-medium">{formatDate(campaign.scheduledAt)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sent At:</span>
              <span className="ml-2 font-medium">{formatDate(campaign.sentAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold">{campaign.totalRecipients ?? 0}</div>
              <div className="text-xs text-muted-foreground">Total Recipients</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalSent}</div>
              <div className="text-xs text-muted-foreground">Total Sent</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{openRate}%</div>
              <div className="text-xs text-muted-foreground">Open Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{clickRate}%</div>
              <div className="text-xs text-muted-foreground">Click Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CampaignForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchCampaign}
        orgId={orgId}
        initialData={{
          id: campaign.id,
          name: campaign.name || "",
          type: campaign.type || "email",
          status: campaign.status || "draft",
          subject: campaign.subject || "",
          totalRecipients: campaign.totalRecipients || 0,
          budget: campaign.budget || 0,
          scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().split("T")[0] : "",
        }}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Campaign"
        itemName={campaign.name}
      />
    </div>
  )
}
