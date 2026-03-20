"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { ChannelConfigForm } from "@/components/channel-config-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Plus, Pencil, Trash2, Send, MessageCircle, Mail, Phone, Bot } from "lucide-react"
import { Input } from "@/components/ui/input"

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
  const [testPhone, setTestPhone] = useState("")
  const [testChannelId, setTestChannelId] = useState<string | null>(null)
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const orgId = session?.user?.organizationId

  const channelIcons: Record<string, any> = {
    whatsapp: <MessageCircle className="h-4 w-4 text-green-600" />,
    telegram: <Bot className="h-4 w-4 text-blue-500" />,
    email: <Mail className="h-4 w-4 text-orange-500" />,
    sms: <Phone className="h-4 w-4 text-purple-500" />,
  }

  const sendTestWhatsApp = async () => {
    if (!testPhone) return
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/v1/whatsapp/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ to: testPhone }),
      })
      const data = await res.json()
      setTestResult({
        success: data.success,
        message: data.success ? "Сообщение отправлено!" : (data.error || "Ошибка отправки"),
      })
    } catch (err: any) {
      setTestResult({ success: false, message: err.message })
    } finally {
      setTestSending(false)
    }
  }

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
      render: (item: any) => (
        <Badge variant="outline" className="gap-1.5">
          {channelIcons[item.channelType] || null}
          {item.channelType}
        </Badge>
      ),
    },
    {
      key: "isActive", label: "Status", sortable: true,
      render: (item: any) => <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "edit", label: "", sortable: false,
      render: (item: any) => (
        <div className="flex gap-1">
          {item.channelType === "whatsapp" && item.isActive && (
            <Button variant="ghost" size="sm" className="text-green-600" onClick={() => { setTestChannelId(item.id); setTestResult(null); setTestPhone("") }}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
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

      {/* WhatsApp Test Message Dialog */}
      {testChannelId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setTestChannelId(null)}>
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Тестовое сообщение WhatsApp
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Номер получателя</label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+994501234567"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Формат: +код_страны номер (без пробелов)</p>
              </div>
              {testResult && (
                <div className={`text-sm p-3 rounded ${testResult.success ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                  {testResult.message}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setTestChannelId(null)}>Отмена</Button>
                <Button onClick={sendTestWhatsApp} disabled={testSending || !testPhone} className="bg-green-600 hover:bg-green-700 gap-2">
                  <Send className="h-4 w-4" />
                  {testSending ? "Отправка..." : "Отправить"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
