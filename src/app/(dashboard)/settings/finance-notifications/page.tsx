"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Bell, Save, Loader2 } from "lucide-react"

interface NotifCategory {
  enabled: boolean
  channels: string[]
  daysBeforeDeadline?: number
}

interface Settings {
  recipientEmail: string
  overdue: NotifCategory
  advance: NotifCategory & { daysBeforeDeadline: number }
  paymentOrders: NotifCategory
  billPayments: NotifCategory
}

const DEFAULTS: Settings = {
  recipientEmail: "",
  overdue: { enabled: true, channels: ["telegram"] },
  advance: { enabled: true, channels: ["telegram"], daysBeforeDeadline: 7 },
  paymentOrders: { enabled: true, channels: ["telegram"] },
  billPayments: { enabled: true, channels: ["telegram"] },
}

const CHANNELS = [
  { key: "telegram", label: "Telegram", desc: "Отправлять уведомление в Telegram" },
  { key: "inApp", label: "В приложении", desc: "Показывать в центре уведомлений" },
  { key: "email", label: "Email", desc: "Отправлять email-уведомление" },
]

const DAY_OPTIONS = [1, 3, 7, 14]

export default function FinanceNotificationsPage() {
  const { data: session } = useSession()
  const orgId = (session?.user as any)?.organizationId || ""
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!orgId) return
    fetch("/api/finance/payment-orders/notification-settings", {
      headers: { "x-organization-id": orgId },
    })
      .then((r) => r.json())
      .then((json) => setSettings({ ...DEFAULTS, ...json.data }))
      .finally(() => setLoading(false))
  }, [orgId])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await fetch("/api/finance/payment-orders/notification-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-organization-id": orgId },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const toggleEnabled = (key: keyof Settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }))
  }

  const toggleChannel = (key: keyof Settings, channel: string) => {
    setSettings((prev) => {
      const cat = prev[key]
      const channels = cat.channels.includes(channel)
        ? cat.channels.filter((c) => c !== channel)
        : [...cat.channels, channel]
      return { ...prev, [key]: { ...cat, channels } }
    })
  }

  const setDays = (days: number) => {
    setSettings((prev) => ({
      ...prev,
      advance: { ...prev.advance, daysBeforeDeadline: days },
    }))
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Уведомления об оплатах</h1>
          <p className="text-sm text-muted-foreground mt-1">Настройте когда и куда приходят финансовые уведомления</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Сохранено!" : "Сохранить"}
        </Button>
      </div>

      {/* Recipient Email */}
      <Card>
        <CardContent className="pt-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Email для уведомлений</Label>
            <p className="text-xs text-muted-foreground">На этот адрес будут приходить финансовые уведомления (если включен канал Email)</p>
            <Input
              type="email"
              value={settings.recipientEmail}
              onChange={(e) => setSettings((prev) => ({ ...prev, recipientEmail: e.target.value }))}
              placeholder="finance@company.com"
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Overdue */}
      <NotifSection
        title="Просроченные оплаты"
        desc="Получать уведомления о просроченных платежах"
        category={settings.overdue}
        onToggle={() => toggleEnabled("overdue")}
        onToggleChannel={(ch) => toggleChannel("overdue", ch)}
      />

      {/* Advance Warning */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <div>
                <CardTitle className="text-base">Предварительное уведомление</CardTitle>
                <p className="text-sm text-muted-foreground">Уведомлять о приближающихся дедлайнах</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.advance.enabled} onChange={() => toggleEnabled("advance")} className="sr-only peer" />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        </CardHeader>
        {settings.advance.enabled && (
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Дней до дедлайна</Label>
              <div className="flex gap-2 mt-2">
                {DAY_OPTIONS.map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={settings.advance.daysBeforeDeadline === d ? "default" : "outline"}
                    className="h-8"
                    onClick={() => setDays(d)}
                  >
                    {d} {d === 1 ? "день" : d < 5 ? "дня" : "дней"}
                  </Button>
                ))}
              </div>
            </div>
            <ChannelToggles channels={settings.advance.channels} onToggle={(ch) => toggleChannel("advance", ch)} />
          </CardContent>
        )}
      </Card>

      {/* Payment Orders */}
      <NotifSection
        title="Платёжные поручения"
        desc="Уведомления при отправке на согласование и исполнении"
        category={settings.paymentOrders}
        onToggle={() => toggleEnabled("paymentOrders")}
        onToggleChannel={(ch) => toggleChannel("paymentOrders", ch)}
      />

      {/* Bill Payments */}
      <NotifSection
        title="Оплата счетов"
        desc="Уведомления при записи оплаты по счёту"
        category={settings.billPayments}
        onToggle={() => toggleEnabled("billPayments")}
        onToggleChannel={(ch) => toggleChannel("billPayments", ch)}
      />
    </div>
  )
}

function NotifSection({ title, desc, category, onToggle, onToggleChannel }: {
  title: string; desc: string; category: NotifCategory
  onToggle: () => void; onToggleChannel: (ch: string) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={category.enabled} onChange={onToggle} className="sr-only peer" />
            <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
      </CardHeader>
      {category.enabled && (
        <CardContent>
          <ChannelToggles channels={category.channels} onToggle={onToggleChannel} />
        </CardContent>
      )}
    </Card>
  )
}

function ChannelToggles({ channels, onToggle }: { channels: string[]; onToggle: (ch: string) => void }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">Каналы доставки</Label>
      <div className="space-y-2 mt-2">
        {CHANNELS.map(({ key, label, desc }) => (
          <label key={key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <input type="checkbox" checked={channels.includes(key)} onChange={() => onToggle(key)} className="rounded border-border w-4 h-4" />
          </label>
        ))}
      </div>
    </div>
  )
}
