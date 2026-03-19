"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { SegmentForm } from "@/components/segment-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Plus, Users, Pencil, Trash2 } from "lucide-react"

interface Segment {
  id: string
  name: string
  contactCount: number
  isDynamic: boolean
  conditions?: Record<string, unknown>
}

export default function SegmentsPage() {
  const { data: session } = useSession()
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Segment | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = session?.user?.organizationId

  const fetchSegments = async () => {
    try {
      const res = await fetch("/api/v1/segments?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setSegments(json.data.segments)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchSegments() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/segments/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchSegments()
  }

  const columns = [
    {
      key: "name", label: "Segment Name", sortable: true,
      render: (item: any) => <div className="font-medium">{item.name}</div>,
    },
    {
      key: "contactCount", label: "Contacts", sortable: true,
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{item.contactCount.toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: "conditions", label: "Conditions", sortable: false,
      render: (item: any) => (
        <div className="text-sm text-muted-foreground max-w-xs truncate">
          {item.conditions && typeof item.conditions === "object"
            ? JSON.stringify(item.conditions).slice(0, 50) + "..."
            : "—"}
        </div>
      ),
    },
    {
      key: "isDynamic", label: "Type", sortable: true,
      render: (item: any) => (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          {item.isDynamic ? "Dynamic" : "Static"}
        </Badge>
      ),
    },
    {
      key: "actions", label: "", sortable: false,
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Segments</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Segments</h1>
          <p className="text-muted-foreground">Target specific contact groups</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4" /> Create Segment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={segments} searchPlaceholder="Search segments..." searchKey="name" pageSize={10} />
        </CardContent>
      </Card>

      <SegmentForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchSegments}
        initialData={editData ? { ...editData, conditions: editData.conditions ? JSON.stringify(editData.conditions, null, 2) : "" } : undefined}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Delete Segment"
        itemName={deleteName}
      />
    </div>
  )
}
