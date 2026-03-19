"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { Plus } from "lucide-react"

const WORKFLOWS = [
  { id: "1", name: "Auto-assign Leads", entity: "Lead", trigger: "Created", actions: 3, enabled: true },
  { id: "2", name: "Deal Stage Update", entity: "Deal", trigger: "Updated", actions: 2, enabled: true },
  { id: "3", name: "Ticket Escalation", entity: "Ticket", trigger: "High Priority", actions: 4, enabled: true },
  { id: "4", name: "Contact Birthday", entity: "Contact", trigger: "Date Field Match", actions: 1, enabled: false },
  { id: "5", name: "Contract Renewal Alert", entity: "Contract", trigger: "Date Field Match", actions: 2, enabled: true },
]

export default function WorkflowsPage() {
  const columns = [
    {
      key: "name",
      label: "Workflow Name",
      sortable: true,
      render: (item: typeof WORKFLOWS[0]) => (
        <div className="font-medium">{item.name}</div>
      ),
    },
    {
      key: "entity",
      label: "Entity Type",
      sortable: true,
      render: (item: typeof WORKFLOWS[0]) => (
        <Badge variant="outline">{item.entity}</Badge>
      ),
    },
    {
      key: "trigger",
      label: "Trigger",
      sortable: true,
      render: (item: typeof WORKFLOWS[0]) => (
        <Badge variant="secondary">{item.trigger}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: true,
      render: (item: typeof WORKFLOWS[0]) => (
        <div className="text-sm">{item.actions} action{item.actions !== 1 ? "s" : ""}</div>
      ),
    },
    {
      key: "enabled",
      label: "Status",
      sortable: true,
      render: (item: typeof WORKFLOWS[0]) => (
        <Badge variant={item.enabled ? "default" : "secondary"}>
          {item.enabled ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflow Rules</h1>
          <p className="text-muted-foreground">Automate business processes</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={WORKFLOWS}
            searchPlaceholder="Search workflows..."
            searchKey="name"
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
