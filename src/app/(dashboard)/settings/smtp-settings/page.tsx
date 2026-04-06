"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Mail, Save, Send, Server, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const presets: Record<string, { host: string; port: number; tls: boolean }> = {
  gmail: { host: "smtp.gmail.com", port: 587, tls: true },
  yandex: { host: "smtp.yandex.ru", port: 465, tls: true },
  mailru: { host: "smtp.mail.ru", port: 465, tls: true },
  outlook: { host: "smtp.office365.com", port: 587, tls: true },
}

export default function SmtpSettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const orgId = session?.user?.organizationId

  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("587")
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpPass, setSmtpPass] = useState("")
  const [smtpTls, setSmtpTls] = useState(true)
  const [fromEmail, setFromEmail] = useState("")
  const [fromName, setFromName] = useState("")
  const [testEmail, setTestEmail] = useState("")
  const [isConfigured, setIsConfigured] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [testMsg, setTestMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Load settings
  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/settings/smtp", {
      headers: { "x-organization-id": String(orgId) },
    })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setSmtpHost(j.data.smtpHost)
          setSmtpPort(String(j.data.smtpPort))
          setSmtpUser(j.data.smtpUser)
          setSmtpPass(j.data.smtpPass)
          setSmtpTls(j.data.smtpTls)
          setFromEmail(j.data.fromEmail)
          setFromName(j.data.fromName)
          setIsConfigured(j.data.isConfigured)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  function applyPreset(key: string) {
    const p = presets[key]
    if (!p) return
    setSmtpHost(p.host)
    setSmtpPort(String(p.port))
    setSmtpTls(p.tls)
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch("/api/v1/settings/smtp", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify({
          smtpHost,
          smtpPort: Number(smtpPort),
          smtpUser,
          smtpPass,
          smtpTls,
          fromEmail: fromEmail || smtpUser,
          fromName,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Save error")
      setSaveMsg({ type: "success", text: tc("savedSuccessfully") })
      setIsConfigured(true)
    } catch (err: any) {
      setSaveMsg({ type: "error", text: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!testEmail) { setTestMsg({ type: "error", text: "Enter email" }); return }
    setTesting(true)
    setTestMsg(null)
    try {
      const res = await fetch("/api/v1/settings/smtp/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify({ email: testEmail }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Send error")
      setTestMsg({ type: "success", text: `Test email sent to ${testEmail}!` })
    } catch (err: any) {
      setTestMsg({ type: "error", text: err.message })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("smtp")}</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-lg">
          <Server className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("smtp")}</h1>
          <p className="text-sm text-muted-foreground">{t("smtpDesc")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("hintSmtp")}</p>
        </div>
        {isConfigured && (
          <div className="ml-auto flex items-center gap-1.5 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
            <CheckCircle className="h-4 w-4" /> Configured
          </div>
        )}
      </div>

      {/* Quick presets */}
      <div className="border rounded-lg p-4 bg-card">
        <p className="text-sm font-medium text-muted-foreground mb-3">Quick setup:</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "gmail", label: "Gmail", color: "bg-red-500 hover:bg-red-600" },
            { key: "yandex", label: "Yandex", color: "bg-yellow-500 hover:bg-yellow-600" },
            { key: "mailru", label: "Mail.ru", color: "bg-blue-500 hover:bg-blue-600" },
            { key: "outlook", label: "Outlook", color: "bg-blue-600 hover:bg-blue-700" },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={cn("text-white text-sm font-medium px-4 py-2 rounded-md transition-colors", color)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* SMTP Settings */}
      <div className="border rounded-lg p-6 bg-card space-y-5">
        {/* Host */}
        <div>
          <Label className="text-sm">SMTP Server</Label>
          <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">SMTP server address — e.g. smtp.gmail.com, smtp.mail.ru, smtp.office365.com</p>
        </div>

        {/* Port + TLS */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Port</Label>
            <Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Port: 587 (TLS) or 465 (SSL) — 25 is often blocked</p>
          </div>
          <div>
            <Label className="text-sm">Use TLS</Label>
            <Select value={smtpTls ? "yes" : "no"} onChange={e => setSmtpTls(e.target.value === "yes")} className="mt-1">
              <option value="yes">{tc("yes")}</option>
              <option value="no">{tc("no")}</option>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Enable TLS encryption — usually "Yes" for port 587</p>
          </div>
        </div>

        {/* Login + Password */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Login</Label>
            <Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="user@gmail.com" className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">SMTP username — usually your email address</p>
          </div>
          <div>
            <Label className="text-sm">Password</Label>
            <Input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••" className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">SMTP password or app-specific password</p>
          </div>
        </div>

        {/* Gmail warning */}
        {smtpHost.includes("gmail") && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">Important for Gmail:</p>
            <p className="text-sm text-amber-600 dark:text-amber-300">
              Gmail does not allow regular passwords. You need an <strong>App Password</strong>:
            </p>
            <ol className="text-sm text-amber-600 dark:text-amber-300 mt-1 ml-4 list-decimal space-y-0.5">
              <li>Go to myaccount.google.com/apppasswords</li>
              <li>Enable two-factor authentication if not already enabled</li>
              <li>Create an app password (select "Mail")</li>
              <li>Copy the 16-character password and paste it here</li>
            </ol>
          </div>
        )}

        {/* From Email + From Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">From Email</Label>
            <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="your@gmail.com" className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Email address that will appear as the sender</p>
          </div>
          <div>
            <Label className="text-sm">From Name</Label>
            <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="LeadDrive CRM" className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Display name shown to recipients — e.g. "Your Company"</p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving || !smtpHost || !smtpUser || !smtpPass} className="min-w-[200px]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {tc("save")} Settings
          </Button>
          {saveMsg && (
            <div className={cn(
              "flex items-center gap-1.5 text-sm",
              saveMsg.type === "success" ? "text-green-600" : "text-red-500"
            )}>
              {saveMsg.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {saveMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Test Email */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Test Email</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label className="text-sm">Test email address</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              className="mt-1"
            />
          </div>
          <Button onClick={handleTest} disabled={testing || !isConfigured} variant="outline" className="gap-1.5">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Test Email
          </Button>
        </div>
        {testMsg && (
          <div className={cn(
            "flex items-center gap-1.5 text-sm p-3 rounded-lg",
            testMsg.type === "success"
              ? "text-green-700 bg-green-50 dark:bg-green-900/20"
              : "text-red-600 bg-red-50 dark:bg-red-900/20"
          )}>
            {testMsg.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {testMsg.text}
          </div>
        )}
        {!isConfigured && (
          <p className="text-xs text-muted-foreground">Save SMTP settings first, then send a test email to verify</p>
        )}
      </div>
    </div>
  )
}
