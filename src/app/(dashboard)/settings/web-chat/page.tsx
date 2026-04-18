"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Copy, RefreshCw, MessageCircle, Check, Globe } from "lucide-react"

interface WidgetConfig {
  id: string
  enabled: boolean
  publicKey: string
  title: string
  greeting: string
  primaryColor: string
  position: string
  showLauncher: boolean
  aiEnabled: boolean
  escalateToTicket: boolean
  allowedOrigins: string[]
  offlineMessage: string | null
  workingHours: Record<string, any> | null
}

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

export default function WebChatSettingsPage() {
  const t = useTranslations("webChatSettings")
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const [cfg, setCfg] = useState<WidgetConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [originsText, setOriginsText] = useState("")
  const [originsError, setOriginsError] = useState<string | null>(null)
  const [workingHours, setWorkingHours] = useState<Record<string, any>>({})
  const [hoursEnabled, setHoursEnabled] = useState(false)

  const headers: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}

  useEffect(() => {
    fetch("/api/v1/web-chat/config", { headers })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setCfg(res.data)
          setOriginsText((res.data.allowedOrigins || []).join("\n"))
          if (res.data.workingHours && typeof res.data.workingHours === "object") {
            setWorkingHours(res.data.workingHours)
            setHoursEnabled(Object.keys(res.data.workingHours).length > 0)
          }
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const update = (patch: Partial<WidgetConfig>) => {
    if (!cfg) return
    setCfg({ ...cfg, ...patch })
  }

  const save = async () => {
    if (!cfg) return
    setOriginsError(null)

    const seen = new Set<string>()
    const normalized: string[] = []
    const invalid: string[] = []
    for (const raw of originsText.split("\n").map(s => s.trim()).filter(Boolean)) {
      try {
        const u = new URL(raw)
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad scheme")
        const origin = `${u.protocol}//${u.host}`
        if (!seen.has(origin)) {
          seen.add(origin)
          normalized.push(origin)
        }
      } catch {
        invalid.push(raw)
      }
    }
    if (invalid.length > 0) {
      setOriginsError(t("originsInvalid", { list: invalid.slice(0, 3).join(", ") }))
      return
    }

    setSaving(true)
    try {
      const allowedOrigins = normalized
      const res = await fetch("/api/v1/web-chat/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          enabled: cfg.enabled,
          title: cfg.title,
          greeting: cfg.greeting,
          primaryColor: cfg.primaryColor,
          position: cfg.position,
          showLauncher: cfg.showLauncher,
          aiEnabled: cfg.aiEnabled,
          escalateToTicket: cfg.escalateToTicket,
          allowedOrigins,
          offlineMessage: cfg.offlineMessage || null,
          workingHours: hoursEnabled ? workingHours : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCfg(data.data)
        setOriginsText(normalized.join("\n"))
      }
    } finally {
      setSaving(false)
    }
  }

  const regenerateKey = async () => {
    if (!confirm(t("regenerateConfirm"))) return
    const res = await fetch("/api/v1/web-chat/config", { method: "POST", headers })
    const data = await res.json()
    if (data.success) setCfg(data.data)
  }

  if (!cfg) {
    return <div className="p-6"><div className="animate-pulse h-48 bg-muted rounded-lg" /></div>
  }

  const embedUrl = typeof window !== "undefined" ? window.location.origin : ""
  const embedSnippet = `<script src="${embedUrl}/widget.js" data-key="${cfg.publicKey}" async></script>`

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedSnippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("pageSubtitle")}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t("widgetEnabled")}</p>
            <p className="text-xs text-muted-foreground">{t("widgetEnabledDesc")}</p>
          </div>
          <button
            onClick={() => update({ enabled: !cfg.enabled })}
            className={`h-6 w-11 rounded-full transition-colors ${cfg.enabled ? "bg-green-500" : "bg-muted"}`}
          >
            <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${cfg.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> {t("embedSnippet")}</h2>
        <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">{embedSnippet}</div>
        <div className="flex items-center gap-2">
          <Button onClick={copyEmbed} variant="outline" size="sm" className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button onClick={regenerateKey} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> {t("regenerateKey")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("embedHint")}</p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">{t("appearance")}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>{t("title")}</Label>
            <Input value={cfg.title} onChange={e => update({ title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>{t("primaryColor")}</Label>
            <Input type="color" value={cfg.primaryColor} onChange={e => update({ primaryColor: e.target.value })} className="h-9 w-full" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>{t("greetingMessage")}</Label>
            <Textarea value={cfg.greeting} onChange={e => update({ greeting: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>{t("position")}</Label>
            <Select value={cfg.position} onChange={e => update({ position: e.target.value })}>
              <option value="bottom-right">{t("posBottomRight")}</option>
              <option value="bottom-left">{t("posBottomLeft")}</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("offlineMessage")}</Label>
            <Input
              value={cfg.offlineMessage || ""}
              onChange={e => update({ offlineMessage: e.target.value })}
              placeholder={t("offlinePlaceholder")}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">{t("behavior")}</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={cfg.aiEnabled}
              onChange={e => update({ aiEnabled: e.target.checked })}
            />
            <span className="text-sm">{t("aiReply")}</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={cfg.escalateToTicket}
              onChange={e => update({ escalateToTicket: e.target.checked })}
            />
            <span className="text-sm">{t("escalate")}</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={cfg.showLauncher}
              onChange={e => update({ showLauncher: e.target.checked })}
            />
            <span className="text-sm">{t("showLauncher")}</span>
          </label>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("workingHours")}</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hoursEnabled} onChange={e => setHoursEnabled(e.target.checked)} />
            {t("enabled")}
          </label>
        </div>
        <p className="text-xs text-muted-foreground">{t("workingHoursHint")}</p>
        {hoursEnabled && (
          <div className="space-y-2">
            {DAY_KEYS.map((day) => {
              const ranges: [string, string][] = Array.isArray(workingHours[day]) ? workingHours[day] : []
              const closed = ranges.length === 0
              const r = ranges[0] || ["09:00", "18:00"]
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-medium">{t(day)}</span>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={!closed}
                      onChange={e => {
                        const next = { ...workingHours }
                        next[day] = e.target.checked ? [["09:00", "18:00"]] : []
                        setWorkingHours(next)
                      }}
                    />
                    {t("open")}
                  </label>
                  {!closed && (
                    <>
                      <Input
                        type="time"
                        value={r[0]}
                        onChange={e => {
                          const next = { ...workingHours }
                          next[day] = [[e.target.value, r[1]]]
                          setWorkingHours(next)
                        }}
                        className="h-8 w-28"
                      />
                      <span className="text-xs text-muted-foreground">—</span>
                      <Input
                        type="time"
                        value={r[1]}
                        onChange={e => {
                          const next = { ...workingHours }
                          next[day] = [[r[0], e.target.value]]
                          setWorkingHours(next)
                        }}
                        className="h-8 w-28"
                      />
                    </>
                  )}
                </div>
              )
            })}
            <div className="pt-1">
              <Label className="text-xs text-muted-foreground">{t("timezone")}</Label>
              <Input
                value={workingHours.timezone || ""}
                onChange={e => setWorkingHours({ ...workingHours, timezone: e.target.value })}
                placeholder="Europe/Warsaw"
                className="h-8 w-60 mt-0.5"
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-2">
        <h2 className="text-sm font-semibold">{t("allowedOrigins")}</h2>
        <p className="text-xs text-muted-foreground">{t("allowedOriginsHint")}</p>
        <Textarea
          value={originsText}
          onChange={e => { setOriginsText(e.target.value); setOriginsError(null) }}
          rows={4}
          placeholder="https://example.com&#10;https://www.example.com"
          className="font-mono text-xs"
        />
        {originsError && <p className="text-xs text-red-500">{originsError}</p>}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="min-w-[140px]">
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  )
}
