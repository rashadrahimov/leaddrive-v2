"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Mail, Send, MessageSquare, Smartphone, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChannelConfigFormData {
  configName: string
  channelType: string
  botToken: string
  webhookUrl: string
  apiKey: string
  phoneNumber: string
  chatId: string
  accountSid: string
  appId: string
  appSecret: string
  pageId: string
  confirmationCode: string
  isActive: boolean
}

interface ChannelConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<ChannelConfigFormData> & { id?: string }
  orgId?: string
}

const channelTypes = [
  { value: "email", label: "Email", icon: Mail, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", borderActive: "border-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  { value: "telegram", label: "Telegram", icon: Send, color: "text-sky-600", bgColor: "bg-sky-100 dark:bg-sky-900/30", borderActive: "border-sky-500 bg-sky-50 dark:bg-sky-900/20" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", borderActive: "border-green-500 bg-green-50 dark:bg-green-900/20" },
  { value: "sms", label: "SMS", icon: Smartphone, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900/30", borderActive: "border-gray-500 bg-gray-50 dark:bg-gray-900/20" },
  { value: "facebook", label: "Facebook", icon: MessageSquare, color: "text-blue-700", bgColor: "bg-blue-100 dark:bg-blue-900/30", borderActive: "border-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  { value: "instagram", label: "Instagram", icon: MessageSquare, color: "text-pink-600", bgColor: "bg-pink-100 dark:bg-pink-900/30", borderActive: "border-pink-500 bg-pink-50 dark:bg-pink-900/20" },
]

export function ChannelConfigForm({ open, onOpenChange, onSaved, initialData, orgId }: ChannelConfigFormProps) {
  const tf = useTranslations("forms")
  const tc = useTranslations("common")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<ChannelConfigFormData>({
    configName: "",
    channelType: "email",
    botToken: "",
    webhookUrl: "",
    apiKey: "",
    phoneNumber: "",
    chatId: "",
    accountSid: "",
    appId: "",
    appSecret: "",
    pageId: "",
    confirmationCode: "",
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      const settings = (initialData as any)?.settings || {}
      setForm({
        configName: initialData?.configName || "",
        channelType: initialData?.channelType || "email",
        botToken: initialData?.botToken || "",
        webhookUrl: initialData?.webhookUrl || "",
        apiKey: initialData?.apiKey || "",
        phoneNumber: initialData?.phoneNumber || "",
        chatId: settings.chatId || "",
        accountSid: settings.accountSid || "",
        appId: (initialData as any)?.appId || "",
        appSecret: (initialData as any)?.appSecret || "",
        pageId: (initialData as any)?.pageId || "",
        confirmationCode: settings.confirmationCode || "",
        isActive: initialData?.isActive ?? true,
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.configName.trim()) {
      setError(tc("required"))
      return
    }
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/channels/${initialData!.id}` : "/api/v1/channels"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({
          configName: form.configName,
          channelType: form.channelType,
          botToken: form.botToken || undefined,
          webhookUrl: form.webhookUrl || undefined,
          apiKey: form.apiKey || undefined,
          phoneNumber: form.phoneNumber || undefined,
          appId: form.appId || undefined,
          appSecret: form.appSecret || undefined,
          pageId: form.pageId || undefined,
          settings: {
            ...(form.chatId ? { chatId: form.chatId } : {}),
            ...(form.accountSid ? { accountSid: form.accountSid } : {}),
            ...(form.confirmationCode ? { confirmationCode: form.confirmationCode } : {}),
          },
          isActive: form.isActive,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || tc("failedToSave"))
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
        <DialogTitle>{isEdit ? tf("editChannel") : tf("newChannel")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Name */}
            <div>
              <Label htmlFor="configName" className="text-sm font-medium">{tc("name")}</Label>
              <Input
                id="configName"
                value={form.configName}
                onChange={(e) => update("configName", e.target.value)}
                placeholder={tf("channelNamePlaceholder")}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tf("channelNameHint")}
              </p>
            </div>

            {/* Channel type */}
            <div>
              <Label className="text-sm font-medium">{tf("channelType")}</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5 sm:grid-cols-7">
                {channelTypes.map(ct => {
                  const Icon = ct.icon
                  const selected = form.channelType === ct.value
                  return (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => update("channelType", ct.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-medium transition-all",
                        selected
                          ? ct.borderActive + " border-2"
                          : "border-transparent bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", selected ? ct.color : "")} />
                      {ct.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tf("channelTypeHint")}
              </p>
            </div>

            {/* Динамические поля по типу канала */}
            {form.channelType === "telegram" && (
              <>
                <div>
                  <Label htmlFor="botToken" className="text-sm font-medium">Bot Token</Label>
                  <Input
                    id="botToken"
                    value={form.botToken}
                    onChange={(e) => update("botToken", e.target.value)}
                    placeholder="123456:ABC-DEF..."
                    className="mt-1.5 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tf("telegramBotTokenHint")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="chatId" className="text-sm font-medium">Chat ID</Label>
                  <Input
                    id="chatId"
                    value={form.chatId}
                    onChange={(e) => update("chatId", e.target.value)}
                    placeholder="123456789"
                    className="mt-1.5 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tf("telegramChatIdHint")}
                  </p>
                </div>
              </>
            )}

            {form.channelType === "email" && (
              <>
                <div>
                  <Label htmlFor="apiKey" className="text-sm font-medium">{tf("apiKeySmtpPassword")}</Label>
                  <Input
                    id="apiKey"
                    value={form.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="sk-..."
                    className="mt-1.5 font-mono text-sm"
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tf("apiKeyHint")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="webhookUrl" className="text-sm font-medium">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={form.webhookUrl}
                    onChange={(e) => update("webhookUrl", e.target.value)}
                    placeholder="https://hooks.example.com/..."
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tf("webhookUrlHint")}
                  </p>
                </div>
              </>
            )}

            {form.channelType === "whatsapp" && (
              <>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">Meta WhatsApp Business API</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Data from developers.facebook.com → WhatsApp → API Setup</p>
                </div>
                <div>
                  <Label htmlFor="apiKey" className="text-sm font-medium">{tf("whatsappAccessToken")} *</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="EAAi..."
                    className="mt-1.5 font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tf("whatsappTokenHint")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number ID *</Label>
                    <Input
                      id="phoneNumber"
                      value={form.phoneNumber}
                      onChange={(e) => update("phoneNumber", e.target.value)}
                      placeholder="1089534267571015"
                      className="mt-1.5 font-mono text-sm"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">{tf("whatsappPhoneIdHint")}</p>
                  </div>
                  <div>
                    <Label htmlFor="webhookUrl" className="text-sm font-medium">Business Account ID</Label>
                    <Input
                      id="webhookUrl"
                      value={form.webhookUrl}
                      onChange={(e) => update("webhookUrl", e.target.value)}
                      placeholder="907151598973492"
                      className="mt-1.5 font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{tf("whatsappAccountIdHint")}</p>
                  </div>
                </div>
              </>
            )}

            {form.channelType === "sms" && (
              <>
                <div>
                  <Label htmlFor="accountSid" className="text-sm font-medium">Twilio Account SID</Label>
                  <Input
                    id="accountSid"
                    value={form.accountSid}
                    onChange={(e) => update("accountSid", e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="mt-1.5 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tf("twilioSidHint")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="apiKey" className="text-sm font-medium">Twilio Auth Token</Label>
                  <Input
                    id="apiKey"
                    value={form.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="Auth Token from Twilio"
                    className="mt-1.5 font-mono text-sm"
                    type="password"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber" className="text-sm font-medium">{tf("twilioSenderPhone")}</Label>
                  <Input
                    id="phoneNumber"
                    value={form.phoneNumber}
                    onChange={(e) => update("phoneNumber", e.target.value)}
                    placeholder="+14155552671"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tf("twilioPhoneHint")}
                  </p>
                </div>
              </>
            )}

            {(form.channelType === "facebook" || form.channelType === "instagram") && (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                    {form.channelType === "facebook" ? "Facebook Messenger" : "Instagram Direct"} — Meta Graph API
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                    Webhook URL: <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">
                      {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/webhooks/facebook
                    </code>
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Verify Token: <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">leaddrive_fb_verify</code>
                  </p>
                </div>
                <div>
                  <Label htmlFor="apiKey" className="text-sm font-medium">Page Access Token *</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="EAAi..."
                    className="mt-1.5 font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="appId" className="text-sm font-medium">Facebook App ID</Label>
                    <Input
                      id="appId"
                      value={form.appId}
                      onChange={(e) => update("appId", e.target.value)}
                      placeholder="1234567890"
                      className="mt-1.5 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="appSecret" className="text-sm font-medium">App Secret</Label>
                    <Input
                      id="appSecret"
                      type="password"
                      value={form.appSecret}
                      onChange={(e) => update("appSecret", e.target.value)}
                      placeholder="App secret for webhook verification"
                      className="mt-1.5 font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pageId" className="text-sm font-medium">Page ID *</Label>
                  <Input
                    id="pageId"
                    value={form.pageId}
                    onChange={(e) => update("pageId", e.target.value)}
                    placeholder="Your Facebook Page ID"
                    className="mt-1.5 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Found in your Page settings or via Graph API
                  </p>
                </div>
              </>
            )}

            {/* Status */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update("isActive", e.target.checked)}
                className="rounded h-4 w-4"
              />
              <div>
                <span className="text-sm font-medium">{tf("channelActive")}</span>
                <p className="text-xs text-muted-foreground">{tf("channelActiveHint")}</p>
              </div>
            </label>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
          <Button type="submit" disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? tc("saving") : isEdit ? tc("save") : tc("create")}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
