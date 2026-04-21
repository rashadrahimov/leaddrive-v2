"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Save, Send, CheckCircle2, XCircle } from "lucide-react"

type DigestType = "daily_briefing" | "anomaly_alert" | "renewal"
type Frequency = "off" | "daily" | "every_2_days" | "weekly" | "monthly"
type Channel = "email" | "in_app" | "telegram" | "slack"

interface SubscriptionRow {
  type: DigestType
  frequency: Frequency
  channels: Channel[]
  isActive: boolean
  lastSentAt: string | null
  configured: boolean
}

interface UserWithSubs {
  user: { id: string; name: string | null; email: string; role: string; preferredLanguage: string | null }
  subscriptions: SubscriptionRow[]
}

const TYPE_LABELS: Record<DigestType, { ru: string; en: string; icon: string }> = {
  daily_briefing: { ru: "Дневная сводка", en: "Daily briefing", icon: "📊" },
  anomaly_alert:  { ru: "Аномалии",       en: "Anomaly alert",  icon: "⚠️" },
  renewal:        { ru: "Продления",      en: "Renewal reminder", icon: "📅" },
}

const FREQ_LABELS: Record<Frequency, string> = {
  off:          "Выключено",
  daily:        "Ежедневно",
  every_2_days: "Раз в 2 дня",
  weekly:       "Еженедельно",
  monthly:      "Ежемесячно",
}

const CHANNEL_LABELS: Record<Channel, string> = {
  email:    "Email",
  in_app:   "In-app",
  telegram: "Telegram",
  slack:    "Slack",
}

export function DigestSubscriptionsPanel() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const role = (session?.user as { role?: string })?.role || "viewer"
  const canEdit = role === "admin" || role === "superadmin"

  const [rows, setRows] = useState<UserWithSubs[]>([])
  const [types, setTypes] = useState<DigestType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ userId: string; type: DigestType; deliveries: Array<{ channel: string; ok: boolean; error?: string }> } | null>(null)

  const headers = useMemo(
    () => (orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>)),
    [orgId],
  )

  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/digest-subscriptions", { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setRows(j.data.users)
          setTypes(j.data.types)
        }
      })
      .finally(() => setLoading(false))
  }, [orgId, headers])

  const updateRow = (userId: string, type: DigestType, patch: Partial<SubscriptionRow>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.user.id === userId
          ? {
              ...r,
              subscriptions: r.subscriptions.map((s) =>
                s.type === type ? { ...s, ...patch, configured: true } : s,
              ),
            }
          : r,
      ),
    )
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const flat: Array<{ userId: string; type: DigestType; frequency: Frequency; channels: Channel[]; isActive: boolean }> = []
      for (const r of rows) {
        for (const s of r.subscriptions) {
          flat.push({
            userId: r.user.id,
            type: s.type,
            frequency: s.frequency,
            channels: s.channels,
            isActive: s.isActive,
          })
        }
      }
      const res = await fetch("/api/v1/digest-subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ subscriptions: flat }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async (userId: string, type: DigestType) => {
    setTesting(`${userId}:${type}`)
    setTestResult(null)
    try {
      const res = await fetch("/api/v1/digest-subscriptions/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ userId, type }),
      })
      const json = await res.json()
      if (json.success) setTestResult({ userId, type, deliveries: json.deliveries })
    } finally {
      setTesting(null)
    }
  }

  const toggleChannel = (userId: string, type: DigestType, channel: Channel, on: boolean) => {
    const row = rows.find((r) => r.user.id === userId)
    const sub = row?.subscriptions.find((s) => s.type === type)
    if (!sub) return
    const next: Channel[] = on
      ? Array.from(new Set([...sub.channels, channel]))
      : sub.channels.filter((c) => c !== channel)
    updateRow(userId, type, { channels: next })
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Подписки на сводку
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Выбери кому из пользователей какая сводка приходит, как часто и через какие каналы.
          «Выключено» отписывает пользователя. Email + In-app по умолчанию включены для админа и менеджера.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Загрузка…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Нет активных пользователей в организации.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-3 font-medium min-w-[180px]">Пользователь</th>
                    {types.map((t) => (
                      <th key={t} className="text-left py-2 px-3 font-medium">
                        <span className="mr-1">{TYPE_LABELS[t].icon}</span>
                        {TYPE_LABELS[t].ru}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.user.id} className="border-b last:border-b-0 align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-foreground">{r.user.name || r.user.email}</div>
                        <div className="text-[11px] text-muted-foreground">{r.user.email}</div>
                        <Badge variant="outline" className="text-[9px] mt-1">{r.user.role}</Badge>
                      </td>
                      {r.subscriptions.map((s) => {
                        const testKey = `${r.user.id}:${s.type}`
                        const tr = testResult && testResult.userId === r.user.id && testResult.type === s.type ? testResult : null
                        return (
                          <td key={s.type} className="py-3 px-3">
                            <div className="space-y-2">
                              {/* Frequency dropdown */}
                              <select
                                value={s.frequency}
                                onChange={(e) => updateRow(r.user.id, s.type, { frequency: e.target.value as Frequency })}
                                disabled={!canEdit}
                                className="h-7 text-xs border rounded px-2 bg-background w-full"
                              >
                                {(["off","daily","every_2_days","weekly","monthly"] as Frequency[]).map((f) => (
                                  <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                                ))}
                              </select>

                              {/* Channel checkboxes */}
                              {s.frequency !== "off" && (
                                <div className="flex flex-wrap gap-1">
                                  {(["email","in_app","telegram","slack"] as Channel[]).map((ch) => (
                                    <label
                                      key={ch}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] cursor-pointer ${
                                        s.channels.includes(ch)
                                          ? "bg-primary/10 border-primary text-primary"
                                          : "bg-background border-border text-muted-foreground hover:bg-muted"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={s.channels.includes(ch)}
                                        onChange={(e) => toggleChannel(r.user.id, s.type, ch, e.target.checked)}
                                        disabled={!canEdit}
                                        className="h-3 w-3"
                                      />
                                      {CHANNEL_LABELS[ch]}
                                    </label>
                                  ))}
                                </div>
                              )}

                              {/* Test button + last result */}
                              {canEdit && s.frequency !== "off" && (
                                <button
                                  type="button"
                                  onClick={() => sendTest(r.user.id, s.type)}
                                  disabled={testing === testKey}
                                  className="text-[10px] text-primary hover:underline disabled:opacity-50"
                                >
                                  {testing === testKey ? "Отправка…" : "🧪 Тест"}
                                </button>
                              )}
                              {tr && (
                                <div className="text-[10px] space-y-0.5">
                                  {tr.deliveries.map((d, i) => (
                                    <div key={i} className={d.ok ? "text-green-600" : "text-red-500"}>
                                      {d.ok ? "✓" : "✗"} {d.channel}{d.error ? ` — ${d.error.slice(0, 40)}` : ""}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {s.lastSentAt && (
                                <div className="text-[10px] text-muted-foreground">
                                  последняя: {new Date(s.lastSentAt).toLocaleDateString("ru-RU")}
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canEdit && (
              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? (
                    "Сохранение…"
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1" /> Сохранить подписки
                    </>
                  )}
                </Button>
                {saved && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Сохранено
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
