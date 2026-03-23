"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { WorkflowForm } from "@/components/workflow-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"

interface WorkflowAction {
  id: string
  actionType: string
}

interface Workflow {
  id: string
  name: string
  entityType: string
  triggerEvent: string
  conditions?: Record<string, any>
  isActive: boolean
  actions: WorkflowAction[]
}

export default function WorkflowsPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Workflow | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = session?.user?.organizationId

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/v1/workflows", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      if (res.ok) {
        const result = await res.json()
        setWorkflows(result.data || [])
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchWorkflows() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/workflows/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchWorkflows()
  }

  const columns = [
    {
      key: "name", label: "Workflow Name", sortable: true,
      render: (item: any) => <div className="font-medium">{item.name}</div>,
    },
    {
      key: "entityType", label: "Entity Type", sortable: true,
      render: (item: any) => <Badge variant="outline">{item.entityType}</Badge>,
    },
    {
      key: "triggerEvent", label: "Trigger", sortable: true,
      render: (item: any) => <Badge variant="secondary">{item.triggerEvent}</Badge>,
    },
    {
      key: "actions", label: tc("actions"), sortable: true,
      render: (item: any) => <div className="text-sm">{item.actions.length} action{item.actions.length !== 1 ? "s" : ""}</div>,
    },
    {
      key: "isActive", label: tc("status"), sortable: true,
      render: (item: any) => <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? tc("active") : tc("inactive")}</Badge>,
    },
    {
      key: "edit", label: "", sortable: false,
      render: (item: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setEditData(item); setShowForm(true) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setDeleteId(item.id); setDeleteName(item.name) }}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("workflows")}</h1>
          <p className="text-muted-foreground">{t("workflowsDesc")}</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4" /> {tc("create")} Workflow
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("workflows")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{tc("loading")}</p>
          ) : (
            <DataTable columns={columns} data={workflows} searchPlaceholder={tc("search")} searchKey="name" pageSize={10} />
          )}
        </CardContent>
      </Card>

      <WorkflowForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchWorkflows}
        initialData={editData ? { ...editData, conditions: JSON.stringify(editData.conditions || {}, null, 2) } : undefined}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={`${tc("delete")} Workflow`}
        itemName={deleteName}
      />
    </div>
  )
}
