"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
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
const DAY_LABELS: Array<[DayKey, string]> = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"],
]

export default function WebChatSettingsPage() {
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

    // Parse, validate, dedup, normalize origins. Each line must be a valid URL origin (scheme + host[:port], no path).
    const seen = new Set<string>()
    const normalized: string[] = []
    const invalid: string[] = []
    for (const raw of originsText.split("\n").map(s => s.trim()).filter(Boolean)) {
      try {
        const u = new URL(raw)
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad scheme")
        const origin = `${u.protocol}//${u.host}`  // strips path/query/fragment
        if (!seen.has(origin)) {
          seen.add(origin)
          normalized.push(origin)
        }
      } catch {
        invalid.push(raw)
      }
    }
    if (invalid.length > 0) {
      setOriginsError(`Invalid origin: ${invalid.slice(0, 3).join(", ")}. Use full URL e.g. https://example.com`)
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
    if (!confirm("Regenerate public key? Existing embeds will stop working.")) return
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
          <h1 className="text-2xl font-bold tracking-tight">Web Chat Widget</h1>
          <p className="text-sm text-muted-foreground">Embed a live chat bubble on your website (§4)</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Widget enabled</p>
            <p className="text-xs text-muted-foreground">Turn off to hide the bubble on all embeds</p>
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
        <h2 className="text-sm font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> Embed snippet</h2>
        <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">{embedSnippet}</div>
        <div className="flex items-center gap-2">
          <Button onClick={copyEmbed} variant="outline" size="sm" className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy snippet"}
          </Button>
          <Button onClick={regenerateKey} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate key
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste the snippet before <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> on every page where you want the chat to appear.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={cfg.title} onChange={e => update({ title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Primary color</Label>
            <Input type="color" value={cfg.primaryColor} onChange={e => update({ primaryColor: e.target.value })} className="h-9 w-full" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Greeting message</Label>
            <Textarea value={cfg.greeting} onChange={e => update({ greeting: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Position</Label>
            <Select value={cfg.position} onChange={e => update({ position: e.target.value })}>
              <option value="bottom-right">Bottom right</option>
              <option value="bottom-left">Bottom left</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Offline message</Label>
            <Input
              value={cfg.offlineMessage || ""}
              onChange={e => update({ offlineMessage: e.target.value })}
              placeholder="We're offline — leave us a message"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Behavior</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={cfg.aiEnabled}
              onChange={e => update({ aiEnabled: e.target.checked })}
            />
            <span className="text-sm">Auto-reply with Da Vinci (AI)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={cfg.escalateToTicket}
              onChange={e => update({ escalateToTicket: e.target.checked })}
            />
            <span className="text-sm">Create a ticket when visitor leaves an email</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={cfg.showLauncher}
              onChange={e => update({ showLauncher: e.target.checked })}
            />
            <span className="text-sm">Show floating launcher button</span>
          </label>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Working hours</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hoursEnabled} onChange={e => setHoursEnabled(e.target.checked)} />
            Enabled
          </label>
        </div>
        <p className="text-xs text-muted-foreground">When disabled, the widget is always online. When enabled, AI auto-reply pauses outside hours and the offline message is shown.</p>
        {hoursEnabled && (
          <div className="space-y-2">
            {DAY_LABELS.map(([day, label]) => {
              const ranges: [string, string][] = Array.isArray(workingHours[day]) ? workingHours[day] : []
              const closed = ranges.length === 0
              const r = ranges[0] || ["09:00", "18:00"]
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-medium">{label}</span>
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
                    Open
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
              <Label className="text-xs text-muted-foreground">Timezone (IANA name, optional)</Label>
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
        <h2 className="text-sm font-semibold">Allowed origins</h2>
        <p className="text-xs text-muted-foreground">One per line. Leave empty to allow any origin (not recommended for production).</p>
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
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}
