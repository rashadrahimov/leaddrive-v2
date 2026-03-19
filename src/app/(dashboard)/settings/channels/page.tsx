"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { ChannelConfigForm } from "@/components/channel-config-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"

interface ChannelConfig {
  id: string
  channelType: string
  configName: string
  botToken?: string
  webhookUrl?: string
  apiKey?: string
  phoneNumber?: string
  isActive: boolean
}

export default function ChannelsPage() {
  const { data: session } = useSession()
  const [channels, setChannels] = useState<ChannelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<ChannelConfig | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = session?.user?.organizationId

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/v1/channels", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      if (res.ok) {
        const result = await res.json()
        setChannels(result.data || [])
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchChannels() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/channels/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchChannels()
  }

  const columns = [
    {
      key: "configName", label: "Name", sortable: true,
      render: (item: any) => <div className="font-medium">{item.configName}</div>,
    },
    {
      key: "channelType", label: "Type", sortable: true,
      render: (item: any) => <Badge variant="outline">{item.channelType}</Badge>,
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
          <Button variant="ghost" size="sm" onClick={() => { setDeleteId(item.id); setDeleteName(item.configName) }}>
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
          <h1 className="text-2xl font-bold tracking-tight">Communication Channels</h1>
          <p className="text-muted-foreground">Configure your communication channels for customer engagement</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4" /> Add Channel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Channels</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <DataTable columns={columns} data={channels} searchPlaceholder="Search channels..." searchKey="configName" pageSize={10} />
          )}
        </CardContent>
      </Card>

      <ChannelConfigForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchChannels}
        initialData={editData}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Delete Channel"
        itemName={deleteName}
      />
    </div>
  )
}
