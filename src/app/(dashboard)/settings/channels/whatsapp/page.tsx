"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  MessageCircle, CheckCircle2, AlertTriangle, RefreshCw, FileText,
  ExternalLink, Copy, Check,
} from "lucide-react"
import { PageDescription } from "@/components/page-description"

type Template = {
  id: string
  name: string
  language: string
  category: string
  status: string
  bodyText: string | null
  variables: string[]
  lastSyncAt: string
}

type ValidateResult = {
  ok: boolean
  verifiedName?: string
  displayPhoneNumber?: string
  error?: string
}

export default function WhatsAppSettingsPage() {
  const { data: session } = useSession()
  const orgSlug = (session?.user as { organizationSlug?: string })?.organizationSlug || "tenant"
  const orgId = session?.user?.organizationId

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/v1/webhooks/whatsapp?t=${orgSlug}`
    : `/api/v1/webhooks/whatsapp?t=${orgSlug}`

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/templates?status=all", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setTemplates(json.data)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    if (orgId) void fetchTemplates()
  }, [orgId, fetchTemplates])

  async function runValidate() {
    setValidating(true)
    setValidateResult(null)
    try {
      const res = await fetch("/api/v1/whatsapp/validate", {
        method: "POST",
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      setValidateResult(await res.json())
    } catch (e) {
      setValidateResult({ ok: false, error: e instanceof Error ? e.message : "network error" })
    } finally {
      setValidating(false)
    }
  }

  async function runSync() {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch("/api/v1/whatsapp/templates", {
        method: "POST",
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setSyncMessage(`Синхронизировано: ${json.synced} шаблонов`)
        await fetchTemplates()
      } else {
        setSyncMessage(`Ошибка: ${json.error || "unknown"}`)
      }
    } finally {
      setSyncing(false)
    }
  }

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  function statusBadge(s: string) {
    const map: Record<string, { label: string; cls: string }> = {
      APPROVED:  { label: "approved",  cls: "border-emerald-400 text-emerald-600" },
      PENDING:   { label: "pending",   cls: "border-amber-400 text-amber-600" },
      REJECTED:  { label: "rejected",  cls: "border-red-400 text-red-600" },
      DISABLED:  { label: "disabled",  cls: "border-muted-foreground text-muted-foreground" },
      PAUSED:    { label: "paused",    cls: "border-sky-400 text-sky-600" },
    }
    const e = map[s] || { label: s, cls: "border-muted-foreground text-muted-foreground" }
    return <Badge variant="outline" className={`text-[10px] ${e.cls}`}>{e.label}</Badge>
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-emerald-600" />
          WhatsApp Business
        </h1>
        <PageDescription text="Управление WhatsApp Business API для вашего тенанта: свой WABA, свой номер, свои одобренные шаблоны сообщений от Meta." />
      </div>

      {/* Validate credentials */}
      <Card className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Проверка credentials</h2>
            <p className="text-sm text-muted-foreground">
              Проверяет что access token и phone number ID работают и возвращает verified name из Meta.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/settings/channels">
                <ExternalLink className="w-4 h-4 mr-1" /> Изменить creds
              </Link>
            </Button>
            <Button onClick={runValidate} disabled={validating}>
              {validating ? "Проверяю…" : "Проверить"}
            </Button>
          </div>
        </div>

        {validateResult && (
          validateResult.ok ? (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div className="text-sm">
                <p className="font-medium text-emerald-900 dark:text-emerald-200">
                  Verified: {validateResult.verifiedName || "(no verified name)"}
                </p>
                <p className="text-emerald-800 dark:text-emerald-300/80">
                  Phone: {validateResult.displayPhoneNumber || "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 p-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <p className="text-sm text-red-900 dark:text-red-200">
                {validateResult.error || "Failed"}
              </p>
            </div>
          )
        )}
      </Card>

      {/* Webhook URL */}
      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold">Webhook URL (для Meta Business Manager)</h2>
        <p className="text-sm text-muted-foreground">
          Вставьте этот URL в настройки WhatsApp-приложения на <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">developers.facebook.com</a> → WhatsApp → Configuration → Webhook. Verify token задайте тот же что в настройках channel (см. /settings/channels).
        </p>
        <div className="flex gap-2">
          <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded break-all">
            {webhookUrl}
          </code>
          <Button variant="outline" size="sm" onClick={copyWebhook}>
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </Card>

      {/* Templates */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" /> Шаблоны ({templates.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Шаблоны создаются и проходят модерацию в Meta Business Manager. Здесь только чтение + синхронизация. Approved шаблоны используются для outbound outreach вне 24-часового сервисного окна.
            </p>
          </div>
          <Button onClick={runSync} disabled={syncing} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Синхронизирую…" : "Синхронизировать с Meta"}
          </Button>
        </div>

        {syncMessage && (
          <p className="text-xs text-muted-foreground">{syncMessage}</p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Загрузка…</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 border rounded-lg">
            <p className="text-sm text-muted-foreground">Шаблонов пока нет</p>
            <p className="text-xs text-muted-foreground mt-1">
              Создайте шаблоны в Meta Business Manager, потом нажмите «Синхронизировать с Meta».
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-sm font-medium">{t.name}</code>
                      <span className="text-xs text-muted-foreground">· {t.language}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {t.category}
                      </Badge>
                      {statusBadge(t.status)}
                    </div>
                    {t.bodyText && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.bodyText}</p>
                    )}
                    {t.variables.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Переменные: {t.variables.map((v) => `{{${v}}}`).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
