"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Plus, Mail, TrendingUp } from "lucide-react"

interface Campaign {
  id: string
  name: string
  status: "draft" | "scheduled" | "sent"
  type: string
  totalRecipients: number
  totalOpened: number
  totalClicked: number
}

export default function CampaignsPage() {
  const { data: session } = useSession()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const orgId = (session?.user as any)?.organizationId

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/v1/campaigns?limit=500", {
        headers: orgId ? { "x-organization-id": orgId } : {},
      })
      const json = await res.json()
      if (json.success) {
        setCampaigns(json.data.campaigns)
        setTotal(json.data.total)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchCampaigns() }, [session])
  const calculateOpenRate = (campaign: Campaign) => {
    if (campaign.totalRecipients === 0) return "—"
    return `${Math.round((campaign.totalOpened / campaign.totalRecipients) * 100)}%`
  }

  const calculateClickRate = (campaign: Campaign) => {
    if (campaign.totalRecipients === 0) return "—"
    return `${Math.round((campaign.totalClicked / campaign.totalRecipients) * 100)}%`
  }

  const columns = [
    {
      key: "name",
      label: "Campaign",
      sortable: true,
      render: (item: Campaign) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.totalRecipients.toLocaleString()} recipients</div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (item: Campaign) => (
        <Badge variant="outline">{item.type.toUpperCase()}</Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: Campaign) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          sent: "default",
          scheduled: "secondary",
          draft: "outline",
        }
        return <Badge variant={variants[item.status]}>{item.status}</Badge>
      },
    },
    {
      key: "openRate",
      label: "Open Rate",
      sortable: true,
      render: (item: Campaign) => <span className="text-sm">{calculateOpenRate(item)}</span>,
    },
    {
      key: "clickRate",
      label: "Click Rate",
      sortable: true,
      render: (item: Campaign) => <span className="text-sm">{calculateClickRate(item)}</span>,
    },
  ]

  const avgOpenRate = campaigns.length > 0
    ? Math.round(campaigns.reduce((s, c) => s + (c.totalRecipients > 0 ? (c.totalOpened / c.totalRecipients) * 100 : 0), 0) / campaigns.length)
    : 0

  const avgClickRate = campaigns.length > 0
    ? Math.round(campaigns.reduce((s, c) => s + (c.totalRecipients > 0 ? (c.totalClicked / c.totalRecipients) * 100 : 0), 0) / campaigns.length)
    : 0

  const totalRecipients = campaigns.reduce((s, c) => s + c.totalRecipients, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Manage email and SMS campaigns</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Campaigns" value={total} icon={<Mail className="h-4 w-4" />} />
        <StatCard title="Recipients" value={totalRecipients.toLocaleString()} description="Unique contacts" />
        <StatCard title="Avg Open Rate" value={`${avgOpenRate}%`} icon={<TrendingUp className="h-4 w-4" />} trend="up" />
        <StatCard title="Avg Click Rate" value={`${avgClickRate}%`} description="Performance metric" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={campaigns}
            searchPlaceholder="Search campaigns..."
            searchKey="name"
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
