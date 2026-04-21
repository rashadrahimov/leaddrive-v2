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

type SmsProvider = "atl" | "twilio" | "vonage"

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
  // SMS provider-specific (non-secret) fields
  smsProvider: SmsProvider
  atlLogin: string
  atlTitle: string
  twilioAccountSid: string
  twilioNumber: string
  vonageApiKey: string
  vonageFromName: string
  /** The secret for the selected SMS provider. Stored in ChannelConfig.apiKey (masked on read). */
  smsSecret: string
  /** True when the form loaded an existing channel — secret field shows a "leave blank to keep" placeholder. */
  smsEditing: boolean
}

interface ChannelConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<ChannelConfigFormData> & { id?: string }
  orgId?: string
}

/**
 * Build the POST/PUT payload from form state. Routes SMS configs through a
 * provider-aware shape: non-secrets go into `settings`, the secret goes into
 * the top-level `apiKey` column (which the GET endpoint masks as `****XXXX`).
 * Empty values are sent as `undefined` so Prisma's updateMany doesn't overwrite
 * stored secrets when the user leaves the field blank on edit.
 */
function buildChannelPayload(form: ChannelConfigFormData) {
  if (form.channelType === "sms") {
    const settings: Record<string, unknown> = { smsProvider: form.smsProvider }
    let secret: string | undefined
    let phoneNumber: string | undefined
    if (form.smsProvider === "atl") {
      if (form.atlLogin) settings.atlLogin = form.atlLogin
      if (form.atlTitle) settings.atlTitle = form.atlTitle
      secret = form.smsSecret || undefined
    } else if (form.smsProvider === "twilio") {
      if (form.twilioAccountSid) settings.accountSid = form.twilioAccountSid
      if (form.twilioNumber) settings.twilioNumber = form.twilioNumber
      secret = form.smsSecret || undefined
      phoneNumber = form.twilioNumber || undefined
    } else if (form.smsProvider === "vonage") {
      if (form.vonageApiKey) settings.apiKey = form.vonageApiKey
      if (form.vonageFromName) settings.fromName = form.vonageFromName
      secret = form.smsSecret || undefined
    }
    return {
      configName: form.configName,
      channelType: "sms",
      apiKey: secret,
      phoneNumber,
      settings,
      isActive: form.isActive,
    }
  }

  return {
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
  }
}

const channelTypes = [
  { value: "email", label: "Email", icon: Mail, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", borderActive: "border-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  { value: "telegram", label: "Telegram", icon: Send, color: "text-sky-600", bgColor: "bg-sky-100 dark:bg-sky-900/30", borderActive: "border-sky-500 bg-sky-50 dark:bg-sky-900/20" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", borderActive: "border-green-500 bg-green-50 dark:bg-green-900/20" },
  { value: "sms", label: "SMS", icon: Smartphone, color: "text-muted-foreground", bgColor: "bg-muted", borderActive: "border-border bg-muted/50" },
  { value: "facebook", label: "Facebook", icon: MessageSquare, color: "text-blue-700", bgColor: "bg-blue-100 dark:bg-blue-900/30", borderActive: "border-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  { value: "instagram", label: "Instagram", icon: MessageSquare, color: "text-pink-600", bgColor: "bg-pink-100 dark:bg-pink-900/30", borderActive: "border-pink-500 bg-pink-50 dark:bg-pink-900/20" },
  { value: "tiktok", label: "TikTok", icon: MessageSquare, color: "text-foreground", bgColor: "bg-muted", borderActive: "border-border bg-muted/50" },
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
    smsProvider: "atl",
    atlLogin: "",
    atlTitle: "",
    twilioAccountSid: "",
    twilioNumber: "",
    vonageApiKey: "",
    vonageFromName: "",
    smsSecret: "",
    smsEditing: false,
  })
  const [smsTesting, setSmsTesting] = useState(false)
  const [smsTestResult, setSmsTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [smsTestNumber, setSmsTestNumber] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      const settings = (initialData as any)?.settings || {}
      // SMS provider detection: explicit settings.smsProvider wins;
      // otherwise, if row has legacy Twilio fields (apiKey + phoneNumber + settings.accountSid), surface as "twilio".
      let detectedSmsProvider: SmsProvider = "atl"
      if (settings.smsProvider === "atl" || settings.smsProvider === "twilio" || settings.smsProvider === "vonage") {
        detectedSmsProvider = settings.smsProvider
      } else if (initialData?.channelType === "sms" && (settings.accountSid || initialData?.phoneNumber)) {
        detectedSmsProvider = "twilio"
      }
      const hasExistingSms = initialData?.channelType === "sms" && !!initialData?.id
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
        smsProvider: detectedSmsProvider,
        atlLogin: settings.atlLogin || "",
        atlTitle: settings.atlTitle || "",
        twilioAccountSid: settings.accountSid || "",
        twilioNumber: settings.twilioNumber || initialData?.phoneNumber || "",
        vonageApiKey: settings.apiKey || "",
        vonageFromName: settings.fromName || "",
        smsSecret: "",
        smsEditing: hasExistingSms,
      })
      setSmsTestResult(null)
      setSmsTestNumber("")
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
      const payload = buildChannelPayload(form)
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify(payload),
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
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
              <div className="grid grid-cols-4 gap-2 mt-1.5 sm:grid-cols-7 lg:grid-cols-7">
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
                  <Label htmlFor="smsProvider" className="text-sm font-medium">{tf("smsProviderLabel")}</Label>
                  <Select
                    id="smsProvider"
                    value={form.smsProvider}
                    onChange={(e: any) => { update("smsProvider", e.target.value as SmsProvider); update("smsSecret", "") }}
                    className="mt-1.5"
                  >
                    <option value="atl">{tf("smsProviderATL")}</option>
                    <option value="twilio">{tf("smsProviderTwilio")}</option>
                    <option value="vonage">{tf("smsProviderVonage")}</option>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{tf("smsProviderHint")}</p>
                </div>

                {form.smsProvider === "atl" && (
                  <>
                    <div>
                      <Label htmlFor="atlLogin" className="text-sm font-medium">{tf("atlLogin")}</Label>
                      <Input
                        id="atlLogin"
                        value={form.atlLogin}
                        onChange={(e) => update("atlLogin", e.target.value)}
                        placeholder="login"
                        className="mt-1.5 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smsSecret" className="text-sm font-medium">{tf("atlPassword")}</Label>
                      <Input
                        id="smsSecret"
                        value={form.smsSecret}
                        onChange={(e) => update("smsSecret", e.target.value)}
                        placeholder={form.smsEditing ? tf("leaveBlankToKeep") : "password"}
                        className="mt-1.5 font-mono text-sm"
                        type="password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="atlTitle" className="text-sm font-medium">{tf("atlTitle")}</Label>
                      <Input
                        id="atlTitle"
                        value={form.atlTitle}
                        onChange={(e) => update("atlTitle", e.target.value)}
                        placeholder="TEST"
                        className="mt-1.5 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{tf("atlTitleHint")}</p>
                    </div>
                  </>
                )}

                {form.smsProvider === "twilio" && (
                  <>
                    <div>
                      <Label htmlFor="twilioAccountSid" className="text-sm font-medium">Twilio Account SID</Label>
                      <Input
                        id="twilioAccountSid"
                        value={form.twilioAccountSid}
                        onChange={(e) => update("twilioAccountSid", e.target.value)}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="mt-1.5 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{tf("twilioSidHint")}</p>
                    </div>
                    <div>
                      <Label htmlFor="smsSecret" className="text-sm font-medium">Twilio Auth Token</Label>
                      <Input
                        id="smsSecret"
                        value={form.smsSecret}
                        onChange={(e) => update("smsSecret", e.target.value)}
                        placeholder={form.smsEditing ? tf("leaveBlankToKeep") : "Auth Token from Twilio"}
                        className="mt-1.5 font-mono text-sm"
                        type="password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="twilioNumber" className="text-sm font-medium">{tf("twilioSenderPhone")}</Label>
                      <Input
                        id="twilioNumber"
                        value={form.twilioNumber}
                        onChange={(e) => update("twilioNumber", e.target.value)}
                        placeholder="+14155552671"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{tf("twilioPhoneHint")}</p>
                    </div>
                  </>
                )}

                {form.smsProvider === "vonage" && (
                  <>
                    <div>
                      <Label htmlFor="vonageApiKey" className="text-sm font-medium">Vonage API Key</Label>
                      <Input
                        id="vonageApiKey"
                        value={form.vonageApiKey}
                        onChange={(e) => update("vonageApiKey", e.target.value)}
                        placeholder="a1b2c3d4"
                        className="mt-1.5 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smsSecret" className="text-sm font-medium">Vonage API Secret</Label>
                      <Input
                        id="smsSecret"
                        value={form.smsSecret}
                        onChange={(e) => update("smsSecret", e.target.value)}
                        placeholder={form.smsEditing ? tf("leaveBlankToKeep") : "Vonage API secret"}
                        className="mt-1.5 font-mono text-sm"
                        type="password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vonageFromName" className="text-sm font-medium">{tf("vonageFromName")}</Label>
                      <Input
                        id="vonageFromName"
                        value={form.vonageFromName}
                        onChange={(e) => update("vonageFromName", e.target.value)}
                        placeholder="LeadDrive"
                        className="mt-1.5"
                      />
                    </div>
                  </>
                )}

                {isEdit && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <Label htmlFor="smsTestNumber" className="text-sm font-medium">{tf("smsTestLabel")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="smsTestNumber"
                        value={smsTestNumber}
                        onChange={(e) => setSmsTestNumber(e.target.value)}
                        placeholder="+994501234567"
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={smsTesting || !smsTestNumber.trim()}
                        onClick={async () => {
                          setSmsTesting(true)
                          setSmsTestResult(null)
                          try {
                            const res = await fetch("/api/v1/channels/sms/test", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
                              },
                              body: JSON.stringify({ to: smsTestNumber.trim() }),
                            })
                            const json = await res.json()
                            setSmsTestResult({ success: !!json.success, message: json.success ? (tf("smsTestSuccess") as string) : (json.error || "Error") })
                          } catch (err: any) {
                            setSmsTestResult({ success: false, message: err.message || "Network error" })
                          } finally {
                            setSmsTesting(false)
                          }
                        }}
                      >
                        {smsTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : tf("smsTestButton")}
                      </Button>
                    </div>
                    {smsTestResult && (
                      <p className={cn("text-xs", smsTestResult.success ? "text-green-600" : "text-red-600")}>
                        {smsTestResult.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{tf("smsTestHint")}</p>
                  </div>
                )}
              </>
            )}

            {form.channelType === "tiktok" && (
              <>
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <p className="text-xs text-foreground/70 font-medium mb-1">TikTok for Business API</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    Webhook URL: <code className="font-mono bg-muted px-1 rounded">
                      {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/webhooks/tiktok
                    </code>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Configure at developers.tiktok.com → App → Webhooks
                  </p>
                </div>
                <div>
                  <Label htmlFor="apiKey" className="text-sm font-medium">Access Token *</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="act.xxxxxxxx..."
                    className="mt-1.5 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Server Access Token from TikTok for Business
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="appId" className="text-sm font-medium">App ID</Label>
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
                  <Label htmlFor="pageId" className="text-sm font-medium">Business Account ID *</Label>
                  <Input
                    id="pageId"
                    value={form.pageId}
                    onChange={(e) => update("pageId", e.target.value)}
                    placeholder="TikTok Business Account ID"
                    className="mt-1.5 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Found in TikTok for Business dashboard
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
