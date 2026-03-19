"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { SlaPolicyForm } from "@/components/sla-policy-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Plus, Pencil, Trash2, Clock } from "lucide-react"

interface SlaPolicy {
  id: string
  name: string
  priority: string
  firstResponseHours: number
  resolutionHours: number
  businessHoursOnly: boolean
  isActive: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

function formatHours(h: number): string {
  if (h < 1) return `${h * 60}m`
  if (h === Math.floor(h)) return `${h}h`
  return `${Math.floor(h)}h ${(h % 1) * 60}m`
}

export default function SlaPoliciesPage() {
  const { data: session } = useSession()
  const [policies, setPolicies] = useState<SlaPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<SlaPolicy | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = session?.user?.organizationId

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/v1/sla-policies", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      if (res.ok) {
        const result = await res.json()
        setPolicies(result.data || [])
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchPolicies() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/sla-policies/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchPolicies()
  }

  const columns = [
    {
      key: "name", label: "Policy Name", sortable: true,
      render: (item: any) => <div className="font-medium">{item.name}</div>,
    },
    {
      key: "priority", label: "Priority", sortable: true,
      render: (item: any) => <Badge className={PRIORITY_COLORS[item.priority]}>{item.priority}</Badge>,
    },
    {
      key: "firstResponseHours", label: "1st Response", sortable: true,
      render: (item: any) => <div className="font-mono text-sm">{formatHours(item.firstResponseHours)}</div>,
    },
    {
      key: "resolutionHours", label: "Resolution", sortable: true,
      render: (item: any) => <div className="font-mono text-sm">{formatHours(item.resolutionHours)}</div>,
    },
    {
      key: "businessHoursOnly", label: "Business Hours", sortable: true,
      render: (item: any) => <span className="text-sm">{item.businessHoursOnly ? "Yes" : "No"}</span>,
    },
    {
      key: "isActive", label: "Status", sortable: true,
      render: (item: any) => <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge>,
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
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6" /> SLA Policies
          </h1>
          <p className="text-sm text-muted-foreground">Define response and resolution time targets for each priority level</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4" /> Add Policy
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All SLA Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <DataTable columns={columns} data={policies} searchPlaceholder="Search policies..." searchKey="name" pageSize={10} />
          )}
        </CardContent>
      </Card>

      <SlaPolicyForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchPolicies}
        initialData={editData}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Delete SLA Policy"
        itemName={deleteName}
      />
    </div>
  )
}
