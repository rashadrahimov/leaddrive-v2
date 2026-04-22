"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  MessageCircle, CheckCircle2, AlertTriangle, RefreshCw, FileText,
  ExternalLink, Copy, Check, ChevronDown, ChevronUp, Bell, Save,
} from "lucide-react"
import { PageDescription } from "@/components/page-description"

type Template = {
  id: string
  name: string
  language: string
  category: string
  status: string
  bodyText: string | null
  headerText: string | null
  headerType: string | null
  footerText: string | null
  buttons: any
  variables: string[]
  lastSyncAt: string
  metaTemplateId: string | null
}

type ChannelMeta = {
  hasConfig: boolean
  phoneNumberId: string | null
  displayName: string | null
  lastValidatedAt: string | null
  lastTemplateSyncAt: string | null
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
  const [meta, setMeta] = useState<ChannelMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Notification template settings (per-status ticket, survey, journey default)
  const [ticketStatuses, setTicketStatuses] = useState<string[]>([])
  const [statusTemplates, setStatusTemplates] = useState<Record<string, string>>({})
  const [surveyTemplate, setSurveyTemplate] = useState("")
  const [journeyTemplate, setJourneyTemplate] = useState("")
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/v1/webhooks/whatsapp?t=${orgSlug}`
    : `/api/v1/webhooks/whatsapp?t=${orgSlug}`

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/templates?status=all", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setTemplates(json.data)
        if (json.meta) setMeta(json.meta)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const fetchNotificationSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/notification-settings", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setTicketStatuses(json.ticketStatuses || [])
        setStatusTemplates(json.data?.whatsappTicketStatusTemplates || {})
        setSurveyTemplate(json.data?.whatsappSurveyTemplate || "")
        setJourneyTemplate(json.data?.whatsappJourneyDefaultTemplate || "")
      } else if (json.error === "WhatsApp not configured") {
        // Tenant hasn't set up the channel yet — we still show the section
        // disabled so they know it's there.
        setTicketStatuses(["new","open","in_progress","waiting","resolved","closed","escalated"])
      }
    } catch { /* ignore */ }
  }, [orgId])

  useEffect(() => {
    if (orgId) {
      void fetchTemplates()
      void fetchNotificationSettings()
    }
  }, [orgId, fetchTemplates, fetchNotificationSettings])

  async function saveNotificationSettings() {
    setSavingSettings(true)
    setSettingsMsg(null)
    try {
      const res = await fetch("/api/v1/whatsapp/notification-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({
          whatsappTicketStatusTemplates: statusTemplates,
          whatsappSurveyTemplate: surveyTemplate,
          whatsappJourneyDefaultTemplate: journeyTemplate,
        }),
      })
      const json = await res.json()
      setSettingsMsg(json.success ? "Настройки сохранены" : (json.error || "Ошибка"))
    } catch (e) {
      setSettingsMsg(e instanceof Error ? e.message : "network error")
    } finally {
      setSavingSettings(false)
      setTimeout(() => setSettingsMsg(null), 3000)
    }
  }

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

  function formatRelative(iso: string | null): string {
    if (!iso) return "никогда"
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return "только что"
    if (m < 60) return `${m} мин назад`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} ч назад`
    const d = Math.floor(h / 24)
    if (d < 30) return `${d} дн назад`
    return new Date(iso).toLocaleDateString()
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
            {meta && (
              <p className="text-xs text-muted-foreground mt-2">
                {meta.hasConfig ? (
                  <>
                    {meta.displayName && <>Настроен: <span className="font-medium">{meta.displayName}</span> · </>}
                    {meta.phoneNumberId && <>Phone ID: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{meta.phoneNumberId}</code> · </>}
                    Последняя проверка: {formatRelative(meta.lastValidatedAt)}
                  </>
                ) : (
                  <span className="text-amber-600">WhatsApp не настроен — заполните creds в /settings/channels</span>
                )}
              </p>
            )}
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

      {/* Notification template mappings */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" /> Автоматические уведомления
            </h2>
            <p className="text-sm text-muted-foreground">
              Выбери какие approved шаблоны использовать для системных событий. Если не выбрать — уведомление просто не будет отправлено (без ошибок для клиента).
            </p>
          </div>
          <Button onClick={saveNotificationSettings} disabled={savingSettings || !meta?.hasConfig} className="gap-1.5">
            <Save className="w-4 h-4" />
            {savingSettings ? "Сохраняю…" : "Сохранить"}
          </Button>
        </div>

        {!meta?.hasConfig && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Сначала настройте WhatsApp credentials в <Link href="/settings/channels" className="underline font-medium">/settings/channels</Link>, потом возвращайтесь сюда.
            </p>
          </div>
        )}

        {settingsMsg && (
          <p className="text-xs text-muted-foreground">{settingsMsg}</p>
        )}

        {/* Ticket status notifications */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Уведомления при смене статуса тикета</Label>
          <p className="text-xs text-muted-foreground">
            Для каждого статуса — свой шаблон. Пустой выбор = не слать. Переменные шаблона: <code className="text-[10px] bg-muted px-1 rounded">ticketNumber</code>, <code className="text-[10px] bg-muted px-1 rounded">status</code>, <code className="text-[10px] bg-muted px-1 rounded">agentName</code>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ticketStatuses.map((status) => (
              <div key={status} className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] w-24 justify-center shrink-0">{status}</Badge>
                <Select
                  value={statusTemplates[status] || ""}
                  onChange={(e: any) => {
                    const v = e.target.value
                    setStatusTemplates(prev => {
                      const next = { ...prev }
                      if (v) next[status] = v
                      else delete next[status]
                      return next
                    })
                  }}
                  disabled={!meta?.hasConfig}
                  className="flex-1 text-sm"
                >
                  <option value="">— не слать —</option>
                  {templates
                    .filter(t => t.status === "APPROVED")
                    .map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                    ))}
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Survey + Journey single dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Survey invite шаблон</Label>
            <p className="text-xs text-muted-foreground">
              Отправляется когда survey-trigger стреляет с каналом WhatsApp.
            </p>
            <Select
              value={surveyTemplate}
              onChange={(e: any) => setSurveyTemplate(e.target.value)}
              disabled={!meta?.hasConfig}
              className="text-sm"
            >
              <option value="">— не слать —</option>
              {templates
                .filter(t => t.status === "APPROVED")
                .map(t => (
                  <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium">Journey default шаблон</Label>
            <p className="text-xs text-muted-foreground">
              Fallback для <code className="text-[10px] bg-muted px-1 rounded">send_whatsapp</code> шага, если сам шаг не указывает template.
            </p>
            <Select
              value={journeyTemplate}
              onChange={(e: any) => setJourneyTemplate(e.target.value)}
              disabled={!meta?.hasConfig}
              className="text-sm"
            >
              <option value="">— не слать —</option>
              {templates
                .filter(t => t.status === "APPROVED")
                .map(t => (
                  <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                ))}
            </Select>
          </div>
        </div>

        {templates.filter(t => t.status === "APPROVED").length === 0 && meta?.hasConfig && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Нет approved шаблонов — сначала нажмите «Синхронизировать с Meta» ниже.
          </p>
        )}
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
            {meta && (
              <p className="text-xs text-muted-foreground mt-1">
                Последняя синхронизация: {formatRelative(meta.lastTemplateSyncAt)}
              </p>
            )}
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
            {templates.map((t) => {
              const isOpen = expanded === t.id
              return (
                <div key={t.id} className="border rounded-lg hover:bg-muted/30 transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    className="w-full text-left p-3 flex items-start justify-between gap-3 flex-wrap"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono text-sm font-medium">{t.name}</code>
                        <span className="text-xs text-muted-foreground">· {t.language}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {t.category}
                        </Badge>
                        {statusBadge(t.status)}
                        {t.variables.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {t.variables.length} {t.variables.length === 1 ? "переменная" : "переменных"}
                          </span>
                        )}
                      </div>
                      {t.bodyText && !isOpen && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.bodyText}</p>
                      )}
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2 border-t bg-muted/20">
                      {t.headerText && (
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wide mt-2">Header{t.headerType ? ` · ${t.headerType}` : ""}</p>
                          <p className="text-sm font-medium">{t.headerText}</p>
                        </div>
                      )}
                      {t.bodyText && (
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wide mt-2">Body</p>
                          <p className="text-sm whitespace-pre-wrap">{t.bodyText}</p>
                        </div>
                      )}
                      {t.footerText && (
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wide mt-2">Footer</p>
                          <p className="text-xs text-muted-foreground">{t.footerText}</p>
                        </div>
                      )}
                      {t.variables.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wide mt-2">Переменные</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.variables.map((v) => (
                              <code key={v} className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded">{`{{${v}}}`}</code>
                            ))}
                          </div>
                        </div>
                      )}
                      {t.buttons && (
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wide mt-2">Кнопки</p>
                          <pre className="text-[10px] bg-background border rounded p-2 overflow-auto">{JSON.stringify(t.buttons, null, 2)}</pre>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground pt-2 border-t">
                        {t.metaTemplateId && <>Meta template ID: <code>{t.metaTemplateId}</code> · </>}
                        Last sync: {formatRelative(t.lastSyncAt)}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
