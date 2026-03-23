"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { CustomFieldForm } from "@/components/custom-field-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"

interface CustomField {
  id: string
  entityType: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  options: string[]
  isRequired: boolean
  defaultValue?: string
  isActive: boolean
}

export default function CustomFieldsPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<CustomField | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = session?.user?.organizationId

  const fetchFields = async () => {
    try {
      const res = await fetch("/api/v1/custom-fields", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      if (res.ok) {
        const result = await res.json()
        setFields(result.data || [])
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchFields() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/custom-fields/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchFields()
  }

  const columns = [
    {
      key: "fieldLabel", label: "Label", sortable: true,
      render: (item: any) => <div className="font-medium">{item.fieldLabel}</div>,
    },
    {
      key: "fieldName", label: "Field Name", sortable: true,
      render: (item: any) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.fieldName}</code>,
    },
    {
      key: "entityType", label: "Entity", sortable: true,
      render: (item: any) => <Badge variant="outline">{item.entityType}</Badge>,
    },
    {
      key: "fieldType", label: tc("type"), sortable: true,
      render: (item: any) => <Badge variant="secondary">{item.fieldType}</Badge>,
    },
    {
      key: "isRequired", label: "Required", sortable: true,
      render: (item: any) => <span className="text-sm">{item.isRequired ? tc("yes") : tc("no")}</span>,
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
          <Button variant="ghost" size="sm" onClick={() => { setDeleteId(item.id); setDeleteName(item.fieldLabel) }}>
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
          <h1 className="text-2xl font-bold tracking-tight">{t("customFields")}</h1>
          <p className="text-muted-foreground">{t("customFieldsDesc")}</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4" /> {tc("add")} Field
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("customFields")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{tc("loading")}</p>
          ) : (
            <DataTable columns={columns} data={fields} searchPlaceholder={tc("search")} searchKey="fieldLabel" pageSize={10} />
          )}
        </CardContent>
      </Card>

      <CustomFieldForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchFields}
        initialData={editData}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={`${tc("delete")} Custom Field`}
        itemName={deleteName}
      />
    </div>
  )
}
