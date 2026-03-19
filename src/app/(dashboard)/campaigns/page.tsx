"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Plus, Mail, TrendingUp } from "lucide-react"

const CAMPAIGNS = [
  { id: "1", name: "Spring Promotion", status: "sent", type: "email", recipients: 2540, opens: 1205, clicks: 342, openRate: "47%", clickRate: "13.5%" },
  { id: "2", name: "Product Launch", status: "scheduled", type: "email", recipients: 3200, opens: 0, clicks: 0, openRate: "—", clickRate: "—" },
  { id: "3", name: "Flash Sale", status: "draft", type: "sms", recipients: 0, opens: 0, clicks: 0, openRate: "—", clickRate: "—" },
  { id: "4", name: "Re-engagement Series", status: "sent", type: "email", recipients: 1850, opens: 445, clicks: 98, openRate: "24%", clickRate: "5.3%" },
  { id: "5", name: "VIP Exclusive Offer", status: "sent", type: "email", recipients: 450, opens: 390, clicks: 156, openRate: "86%", clickRate: "34.6%" },
]

export default function CampaignsPage() {
  const columns = [
    {
      key: "name",
      label: "Campaign",
      sortable: true,
      render: (item: typeof CAMPAIGNS[0]) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.recipients.toLocaleString()} recipients</div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (item: typeof CAMPAIGNS[0]) => (
        <Badge variant="outline">{item.type.toUpperCase()}</Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: typeof CAMPAIGNS[0]) => {
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
      render: (item: typeof CAMPAIGNS[0]) => <span className="text-sm">{item.openRate}</span>,
    },
    {
      key: "clickRate",
      label: "Click Rate",
      sortable: true,
      render: (item: typeof CAMPAIGNS[0]) => <span className="text-sm">{item.clickRate}</span>,
    },
  ]

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
        <StatCard title="Total Campaigns" value={5} icon={<Mail className="h-4 w-4" />} />
        <StatCard title="Recipients" value={8040} description="Unique contacts" />
        <StatCard title="Avg Open Rate" value="56%." icon={<TrendingUp className="h-4 w-4" />} trend="up" />
        <StatCard title="Avg Click Rate" value="13.5%" description="+2% vs last month" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={CAMPAIGNS}
            searchPlaceholder="Search campaigns..."
            searchKey="name"
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
