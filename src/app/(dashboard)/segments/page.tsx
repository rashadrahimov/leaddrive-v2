"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { Plus, Users } from "lucide-react"

const SEGMENTS = [
  { id: "1", name: "High-Value Customers", contactCount: 245, conditions: "Deal Value > $50k", dynamic: true },
  { id: "2", name: "Recent Signups", contactCount: 1203, conditions: "Created Date within 30 days", dynamic: true },
  { id: "3", name: "Inactive (90 days)", contactCount: 567, conditions: "No activity in 90 days", dynamic: true },
  { id: "4", name: "Enterprise Accounts", contactCount: 89, conditions: "Company Size > 500, Industry = Tech", dynamic: true },
  { id: "5", name: "Churn Risk", contactCount: 132, conditions: "Support Tickets > 5, NPS <= 5", dynamic: true },
]

export default function SegmentsPage() {
  const columns = [
    {
      key: "name",
      label: "Segment Name",
      sortable: true,
      render: (item: typeof SEGMENTS[0]) => (
        <div className="font-medium">{item.name}</div>
      ),
    },
    {
      key: "contactCount",
      label: "Contacts",
      sortable: true,
      render: (item: typeof SEGMENTS[0]) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{item.contactCount.toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: "conditions",
      label: "Conditions",
      sortable: false,
      render: (item: typeof SEGMENTS[0]) => (
        <div className="text-sm text-muted-foreground max-w-xs truncate">{item.conditions}</div>
      ),
    },
    {
      key: "dynamic",
      label: "Type",
      sortable: true,
      render: (item: typeof SEGMENTS[0]) => (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          Dynamic
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Segments</h1>
          <p className="text-muted-foreground">Target specific contact groups</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Segment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={SEGMENTS}
            searchPlaceholder="Search segments..."
            searchKey="name"
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
