"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { Plus } from "lucide-react"

interface WorkflowAction {
  id: string;
  actionType: string;
}

interface Workflow {
  id: string;
  name: string;
  entityType: string;
  triggerEvent: string;
  isActive: boolean;
  actions: WorkflowAction[];
}

export default function WorkflowsPage() {
  const { data: session } = useSession()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.email) return

    const fetchWorkflows = async () => {
      try {
        const response = await fetch("/api/v1/workflows")
        if (response.ok) {
          const result = await response.json()
          setWorkflows(result.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch workflows:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkflows()
  }, [session])

  const columns = [
    {
      key: "name",
      label: "Workflow Name",
      sortable: true,
      render: (item: any) => (
        <div className="font-medium">{item.name}</div>
      ),
    },
    {
      key: "entityType",
      label: "Entity Type",
      sortable: true,
      render: (item: any) => (
        <Badge variant="outline">{item.entityType}</Badge>
      ),
    },
    {
      key: "triggerEvent",
      label: "Trigger",
      sortable: true,
      render: (item: any) => (
        <Badge variant="secondary">{item.triggerEvent}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: true,
      render: (item: any) => (
        <div className="text-sm">{item.actions.length} action{item.actions.length !== 1 ? "s" : ""}</div>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (item: any) => (
        <Badge variant={item.isActive ? "default" : "secondary"}>
          {item.isActive ? "Active" : "Inactive"}
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
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <DataTable
              columns={columns}
              data={workflows}
              searchPlaceholder="Search workflows..."
              searchKey="name"
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
