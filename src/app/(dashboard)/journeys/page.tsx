"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Plus, Zap, Users, CheckCircle } from "lucide-react"

const JOURNEYS = [
  { id: "1", name: "Lead Nurture Sequence", status: "active", trigger: "New Lead", entries: 234, active: 89, completed: 145 },
  { id: "2", name: "Post-Demo Follow-up", status: "active", trigger: "Demo Completed", entries: 156, active: 42, completed: 114 },
  { id: "3", name: "Upsell Campaign", status: "paused", trigger: "Deal Won", entries: 89, active: 0, completed: 89 },
  { id: "4", name: "Re-engagement", status: "draft", trigger: "Inactive 30 Days", entries: 0, active: 0, completed: 0 },
  { id: "5", name: "VIP Onboarding", status: "active", trigger: "Large Deal Won", entries: 45, active: 12, completed: 33 },
]

export default function JourneysPage() {
  const columns = [
    {
      key: "name",
      label: "Journey Name",
      sortable: true,
      render: (item: typeof JOURNEYS[0]) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.trigger}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: typeof JOURNEYS[0]) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          active: "default",
          paused: "secondary",
          draft: "outline",
        }
        return <Badge variant={variants[item.status]}>{item.status}</Badge>
      },
    },
    { key: "entries", label: "Total Entries", sortable: true },
    { key: "active", label: "Active", sortable: true },
    { key: "completed", label: "Completed", sortable: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Journeys</h1>
          <p className="text-muted-foreground">Automate customer engagement workflows</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Journey
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Journeys" value={3} icon={<Zap className="h-4 w-4" />} trend="up" />
        <StatCard title="Total Entries" value={524} icon={<Users className="h-4 w-4" />} description="This month" />
        <StatCard title="Completed" value={381} icon={<CheckCircle className="h-4 w-4" />} description="72% success rate" />
        <StatCard title="In Progress" value={143} description="27% active" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journeys</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={JOURNEYS}
            searchPlaceholder="Search journeys..."
            searchKey="name"
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
