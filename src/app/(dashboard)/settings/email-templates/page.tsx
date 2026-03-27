"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { ColorStatCard } from "@/components/color-stat-card"
import { EmailTemplateForm } from "@/components/email-template-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Plus, Mail, Pencil, Trash2, Globe, Tag } from "lucide-react"
import { useTranslations } from "next-intl"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlBody: string
  textBody?: string
  category?: string
  variables?: string
  language?: string
  createdAt: string
}

export default function EmailTemplatesPage() {
  const { data: session } = useSession()
  const ts = useTranslations("settings")
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<EmailTemplate | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = session?.user?.organizationId

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/v1/email-templates?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setTemplates(json.data.templates)
        setTotal(json.data.total)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchTemplates() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/email-templates/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchTemplates()
  }

  const langFlags: Record<string, string> = { en: "EN", ru: "RU", az: "AZ" }

  const columns = [
    {
      key: "name", label: "Template", sortable: true,
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.subject}</div>
        </div>
      ),
    },
    {
      key: "category", label: "Category", sortable: true,
      render: (item: any) => <Badge variant="outline">{item.category || "general"}</Badge>,
    },
    {
      key: "language", label: "Lang", sortable: true,
      render: (item: any) => <span className="text-xs font-medium">{langFlags[item.language] || item.language || "EN"}</span>,
    },
    {
      key: "createdAt", label: "Created", sortable: true,
      render: (item: any) => new Date(item.createdAt).toLocaleDateString(),
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
        <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
        <div className="animate-pulse h-96 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-sm text-muted-foreground">Manage email templates for campaigns and notifications</p>
          <p className="text-sm text-muted-foreground mt-1">{ts("hintEmailTemplatesSettings")}</p>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> New Template
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ColorStatCard label="Total Templates" value={total} icon={<Mail className="h-4 w-4" />} color="blue" />
        <ColorStatCard label="Languages" value={new Set(templates.map(t => t.language)).size} icon={<Globe className="h-4 w-4" />} color="violet" />
        <ColorStatCard label="Categories" value={new Set(templates.map(t => t.category)).size} icon={<Tag className="h-4 w-4" />} color="orange" />
      </div>

      <DataTable columns={columns} data={templates} searchPlaceholder="Search templates..." searchKey="name" pageSize={10} />

      <EmailTemplateForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchTemplates}
        initialData={editData}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Delete Template"
        itemName={deleteName}
      />
    </div>
  )
}
