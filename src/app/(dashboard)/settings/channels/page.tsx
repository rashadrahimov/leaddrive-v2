"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ChannelConfigForm } from "@/components/channel-config-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import {
  Plus, Pencil, Trash2, Settings, Mail, MessageSquare, Smartphone, Send,
  Search, Radio,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

const channelMeta: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  email: { label: "Email", icon: Mail, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  telegram: { label: "Telegram", icon: Send, color: "text-sky-600", bgColor: "bg-sky-100 dark:bg-sky-900/30" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  sms: { label: "SMS", icon: Smartphone, color: "text-muted-foreground", bgColor: "bg-muted" },
  facebook: { label: "Facebook", icon: MessageSquare, color: "text-blue-700", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  instagram: { label: "Instagram", icon: MessageSquare, color: "text-pink-600", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
  tiktok: { label: "TikTok", icon: MessageSquare, color: "text-foreground", bgColor: "bg-muted" },
}

export default function ChannelsPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const [channels, setChannels] = useState<ChannelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<ChannelConfig | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [search, setSearch] = useState("")
  const [testPhone, setTestPhone] = useState("")
  const [testChannelId, setTestChannelId] = useState<string | null>(null)
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const orgId = session?.user?.organizationId

  const sendTestWhatsApp = async () => {
    if (!testPhone) return
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/v1/whatsapp/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify({ to: testPhone }),
      })
      const data = await res.json()
      setTestResult({
        success: data.success,
        message: data.success ? "Message sent!" : (data.error || "Send error"),
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
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      if (res.ok) {
        const result = await res.json()
        setChannels(result.data || [])
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchChannels() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/channels/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    fetchChannels()
  }

  const filtered = channels.filter(ch => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return ch.configName.toLowerCase().includes(q) || ch.channelType.toLowerCase().includes(q)
  })

  const activeCount = channels.filter(c => c.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            {t("channels")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("channelsDesc")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{t("hintChannels")}</p>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" /> {tc("add")} Channel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Radio className="h-4 w-4" /> Total Channels
          </div>
          <p className="text-2xl font-bold">{channels.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <div className="h-2 w-2 rounded-full bg-green-500" /> {tc("active")}
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" /> {tc("inactive")}
          </div>
          <p className="text-2xl font-bold text-muted-foreground">{channels.length - activeCount}</p>
        </div>
      </div>

      {/* Search */}
      {channels.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tc("search")}
            className="pl-9"
          />
        </div>
      )}

      {/* Channel cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/20 py-16 text-center">
            <Radio className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {search ? tc("noResults") : "No channels configured"}
            </p>
            {!search && (
              <>
                <p className="text-sm text-muted-foreground mt-1">Add your first communication channel</p>
                <Button className="mt-4 gap-1.5" onClick={() => { setEditData(undefined); setShowForm(true) }}>
                  <Plus className="h-4 w-4" /> {tc("add")} Channel
                </Button>
              </>
            )}
          </div>
        ) : (
          filtered.map(channel => {
            const meta = channelMeta[channel.channelType] || channelMeta.email
            const Icon = meta.icon
            return (
              <div
                key={channel.id}
                className="border rounded-lg bg-card hover:shadow-md transition-shadow p-4 flex items-center gap-4"
              >
                {/* Icon */}
                <div className={cn("flex items-center justify-center w-12 h-12 rounded-lg shrink-0", meta.bgColor)}>
                  <Icon className={cn("h-6 w-6", meta.color)} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold truncate">{channel.configName}</h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] shrink-0",
                        channel.isActive
                          ? "border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "border-border bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <span className={cn(
                        "inline-block w-1.5 h-1.5 rounded-full mr-1",
                        channel.isActive ? "bg-green-500" : "bg-muted-foreground/40"
                      )} />
                      {channel.isActive ? tc("active") : tc("inactive")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {meta.label.toUpperCase()}
                    {channel.phoneNumber && ` · ${channel.phoneNumber}`}
                    {channel.botToken && " · Token configured"}
                    {channel.webhookUrl && " · Webhook configured"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {channel.channelType === "whatsapp" && channel.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      onClick={() => { setTestChannelId(channel.id); setTestResult(null); setTestPhone("") }}
                      title="Test message"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    onClick={() => { setEditData(channel); setShowForm(true) }}
                    title={tc("edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => { setDeleteId(channel.id); setDeleteName(channel.configName) }}
                    title={tc("delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

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
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp Test Message
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Recipient number</label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+994501234567"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Format: +country_code number (no spaces)</p>
              </div>
              {testResult && (
                <div className={`text-sm p-3 rounded ${testResult.success ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                  {testResult.message}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setTestChannelId(null)}>{tc("cancel")}</Button>
                <Button onClick={sendTestWhatsApp} disabled={testSending || !testPhone} className="bg-green-600 hover:bg-green-700 gap-2">
                  <Send className="h-4 w-4" />
                  {testSending ? tc("sending") : tc("send")}
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
