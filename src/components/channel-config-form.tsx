"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface ChannelConfigFormData {
  configName: string
  channelType: string
  botToken: string
  webhookUrl: string
  apiKey: string
  phoneNumber: string
  isActive: boolean
}

interface ChannelConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<ChannelConfigFormData> & { id?: string }
  orgId?: string
}

export function ChannelConfigForm({ open, onOpenChange, onSaved, initialData, orgId }: ChannelConfigFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<ChannelConfigFormData>({
    configName: "",
    channelType: "email",
    botToken: "",
    webhookUrl: "",
    apiKey: "",
    phoneNumber: "",
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        configName: initialData?.configName || "",
        channelType: initialData?.channelType || "email",
        botToken: initialData?.botToken || "",
        webhookUrl: initialData?.webhookUrl || "",
        apiKey: initialData?.apiKey || "",
        phoneNumber: initialData?.phoneNumber || "",
        isActive: initialData?.isActive ?? true,
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/channels/${initialData!.id}` : "/api/v1/channels"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({
          configName: form.configName,
          channelType: form.channelType,
          botToken: form.botToken || undefined,
          webhookUrl: form.webhookUrl || undefined,
          apiKey: form.apiKey || undefined,
          phoneNumber: form.phoneNumber || undefined,
          isActive: form.isActive,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof ChannelConfigFormData, value: any) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Channel" : "New Channel"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="configName">Config Name *</Label>
                <Input id="configName" value={form.configName} onChange={(e) => update("configName", e.target.value)} placeholder="My Telegram Bot" required />
              </div>
              <div>
                <Label htmlFor="channelType">Channel Type</Label>
                <Select value={form.channelType} onChange={(e) => update("channelType", e.target.value)}>
                  <option value="email">Email</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </Select>
              </div>
            </div>
            {form.channelType === "telegram" && (
              <div>
                <Label htmlFor="botToken">Bot Token</Label>
                <Input id="botToken" value={form.botToken} onChange={(e) => update("botToken", e.target.value)} placeholder="123456:ABC-DEF..." />
              </div>
            )}
            {form.channelType === "whatsapp" && (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Meta WhatsApp Business API</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Данные из developers.facebook.com → WhatsApp → API Setup</p>
                </div>
                <div>
                  <Label htmlFor="apiKey">Access Token (Маркер доступа) *</Label>
                  <Input id="apiKey" type="password" value={form.apiKey} onChange={(e) => update("apiKey", e.target.value)} placeholder="EAAi..." required />
                  <p className="text-xs text-muted-foreground mt-1">Временный токен действует 24 часа. Для постоянного — создайте System User.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number ID *</Label>
                    <Input id="phoneNumber" value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} placeholder="1089534267571015" required />
                    <p className="text-xs text-muted-foreground mt-1">ID номера телефона из API Setup</p>
                  </div>
                  <div>
                    <Label htmlFor="webhookUrl">Business Account ID</Label>
                    <Input id="webhookUrl" value={form.webhookUrl} onChange={(e) => update("webhookUrl", e.target.value)} placeholder="907151598973492" />
                    <p className="text-xs text-muted-foreground mt-1">ID аккаунта WhatsApp Business</p>
                  </div>
                </div>
              </>
            )}
            {form.channelType === "sms" && (
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} placeholder="+1234567890" />
              </div>
            )}
            {form.channelType !== "whatsapp" && form.channelType !== "telegram" && form.channelType !== "sms" && (
              <>
                <div>
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input id="webhookUrl" value={form.webhookUrl} onChange={(e) => update("webhookUrl", e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input id="apiKey" value={form.apiKey} onChange={(e) => update("apiKey", e.target.value)} placeholder="sk-..." />
                </div>
              </>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} className="rounded" />
              <span className="text-sm">Active</span>
            </label>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
