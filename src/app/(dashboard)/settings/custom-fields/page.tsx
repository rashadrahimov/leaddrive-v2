"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3, Filter, TrendingUp, DollarSign, CheckSquare,
  Ticket, Target, Heart, Activity, Check, LayoutDashboard,
  Building2, Handshake, Shield, Clock, Star, Users,
} from "lucide-react"

interface WidgetSetting {
  enabled: boolean
  roles: string[]
}

type WidgetConfig = Record<string, WidgetSetting>

const WIDGET_KEYS = [
  "statCards", "revenueChart", "dealPipeline", "forecast",
  "clientHealth", "activityFeed", "taskSummary", "ticketSummary", "leadFunnel",
]

const WIDGET_META: Record<string, { icon: any; color: string }> = {
  statCards: { icon: BarChart3, color: "bg-blue-500" },
  revenueChart: { icon: DollarSign, color: "bg-green-500" },
  dealPipeline: { icon: TrendingUp, color: "bg-purple-500" },
  forecast: { icon: Target, color: "bg-amber-500" },
  clientHealth: { icon: Heart, color: "bg-pink-500" },
  activityFeed: { icon: Activity, color: "bg-cyan-500" },
  taskSummary: { icon: CheckSquare, color: "bg-indigo-500" },
  ticketSummary: { icon: Ticket, color: "bg-orange-500" },
  leadFunnel: { icon: Filter, color: "bg-teal-500" },
}

// Mini preview components for each widget
function PreviewStatCards() {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {[
        { label: "Gəlir", value: "12,500 ₼", color: "bg-green-100 text-green-700" },
        { label: "Pipeline", value: "45,000 ₼", color: "bg-blue-100 text-blue-700" },
        { label: "Müştərilər", value: "241", color: "bg-indigo-100 text-indigo-700" },
        { label: "Tiketlər", value: "20", color: "bg-orange-100 text-orange-700" },
      ].map(s => (
        <div key={s.label} className={`rounded-md p-1.5 text-center ${s.color}`}>
          <div className="text-[10px] font-bold">{s.value}</div>
          <div className="text-[8px] opacity-70">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

function PreviewRevenueChart() {
  return (
    <div className="space-y-1">
      {["IT Outsource", "Web Dev", "Mobile", "Support"].map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className="text-[8px] w-16 truncate text-muted-foreground">{s}</span>
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary/60" style={{ width: `${90 - i * 20}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviewDealPipeline() {
  const stages = [
    { name: "LEAD", w: "85%", color: "#94a3b8" },
    { name: "QUALIFIED", w: "60%", color: "#3b82f6" },
    { name: "PROPOSAL", w: "40%", color: "#8b5cf6" },
    { name: "WON", w: "25%", color: "#22c55e" },
  ]
  return (
    <div className="space-y-1">
      {stages.map(s => (
        <div key={s.name} className="flex items-center gap-1.5">
          <span className="text-[8px] w-14 text-muted-foreground">{s.name}</span>
          <div className="flex-1 h-2.5 bg-muted rounded">
            <div className="h-full rounded" style={{ width: s.w, backgroundColor: s.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviewForecast() {
  return (
    <div className="flex items-end gap-1 h-12">
      {[40, 65, 50, 80, 55, 70].map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full rounded-t" style={{ height: `${h}%`, backgroundColor: i % 2 === 0 ? "#22c55e" : "#3b82f6", opacity: 0.6 }} />
          <span className="text-[7px] text-muted-foreground">{i + 1}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewClientHealth() {
  return (
    <div className="flex gap-2">
      <div className="flex-1 text-center p-1.5 rounded bg-green-50 border border-green-200/50">
        <div className="text-sm font-bold text-green-600">18</div>
        <div className="text-[8px] text-green-600">Gəlirli</div>
      </div>
      <div className="flex-1 text-center p-1.5 rounded bg-red-50 border border-red-200/50">
        <div className="text-sm font-bold text-red-600">3</div>
        <div className="text-[8px] text-red-600">Zərərli</div>
      </div>
      <div className="flex-1 text-center p-1.5 rounded bg-slate-50 border border-slate-200/50">
        <div className="text-sm font-bold text-slate-500">5</div>
        <div className="text-[8px] text-slate-500">Məlumat yox</div>
      </div>
    </div>
  )
}

function PreviewActivityFeed() {
  return (
    <div className="space-y-1.5">
      {[
        { icon: "📧", text: "Email göndərildi", time: "5 dəq" },
        { icon: "📞", text: "Zəng edildi", time: "1 saat" },
        { icon: "✅", text: "Tapşırıq tamamlandı", time: "3 saat" },
      ].map((a, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-xs">{a.icon}</span>
          <span className="text-[9px] flex-1 truncate">{a.text}</span>
          <span className="text-[8px] text-muted-foreground">{a.time}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewTaskSummary() {
  return (
    <div className="space-y-1.5">
      {[
        { label: "Lid konversiyası", value: "24%", icon: "🎯" },
        { label: "CSAT", value: "4.2 ★", icon: "⭐" },
        { label: "Tamamlanma", value: "78%", icon: "✅" },
      ].map(s => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span className="text-xs">{s.icon}</span>
          <span className="text-[9px] flex-1 text-muted-foreground">{s.label}</span>
          <span className="text-[9px] font-bold">{s.value}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewTicketSummary() {
  return (
    <div className="space-y-1.5">
      {[
        { name: "SLA pozulub", value: "2", color: "text-red-600" },
        { name: "Açıq tiketlər", value: "20", color: "text-amber-600" },
        { name: "Həll edilmiş", value: "45", color: "text-green-600" },
      ].map(s => (
        <div key={s.name} className="flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground">{s.name}</span>
          <span className={`text-[9px] font-bold ${s.color}`}>{s.value}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewLeadFunnel() {
  return (
    <div className="space-y-1.5">
      {[
        { label: "Yeni lidlər", value: "17", color: "bg-blue-100 text-blue-700" },
        { label: "Əlaqə saxlanıldı", value: "8", color: "bg-amber-100 text-amber-700" },
        { label: "Konvert edilmiş", value: "3", color: "bg-green-100 text-green-700" },
      ].map(s => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span className="text-[9px] flex-1">{s.label}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.color}`}>{s.value}</span>
        </div>
      ))}
    </div>
  )
}

const PREVIEW_COMPONENTS: Record<string, () => JSX.Element> = {
  statCards: PreviewStatCards,
  revenueChart: PreviewRevenueChart,
  dealPipeline: PreviewDealPipeline,
  forecast: PreviewForecast,
  clientHealth: PreviewClientHealth,
  activityFeed: PreviewActivityFeed,
  taskSummary: PreviewTaskSummary,
  ticketSummary: PreviewTicketSummary,
  leadFunnel: PreviewLeadFunnel,
}

export default function DashboardSettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("dashboardSettings")
  const tc = useTranslations("common")
  const orgId = session?.user?.organizationId

  const [config, setConfig] = useState<WidgetConfig>({})
  const [roles, setRoles] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/dashboard/widget-config", {
      headers: { "x-organization-id": String(orgId) },
    })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setConfig(j.data.widgets)
          setRoles(j.data.roles)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  const toggleEnabled = (key: string) => {
    setConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key]?.enabled },
    }))
    setSaved(false)
  }

  const toggleRole = (widgetKey: string, role: string) => {
    setConfig(prev => {
      const widget = prev[widgetKey] || { enabled: true, roles: [] }
      const hasRole = widget.roles.includes(role)
      return {
        ...prev,
        [widgetKey]: {
          ...widget,
          roles: hasRole
            ? widget.roles.filter(r => r !== role)
            : [...widget.roles, role],
        },
      }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      await fetch("/api/v1/dashboard/widget-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": String(orgId),
        },
        body: JSON.stringify({ widgets: config }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {} finally {
      setSaving(false)
    }
  }

  const activeCount = WIDGET_KEYS.filter(k => config[k]?.enabled).length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="space-y-4">
        {WIDGET_KEYS.map(key => {
          const widget = config[key] || { enabled: true, roles: [] }
          const meta = WIDGET_META[key]
          const Icon = meta.icon
          const Preview = PREVIEW_COMPONENTS[key]

          return (
            <div
              key={key}
              className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                widget.enabled ? "border-primary/20 bg-card shadow-sm" : "border-muted bg-muted/30"
              }`}
            >
              <div className="flex">
                {/* Left: Preview */}
                <div
                  className={`flex-1 p-4 transition-all duration-300 ${
                    !widget.enabled ? "opacity-30 grayscale" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-white ${meta.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-semibold text-sm">{t(`w${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}</span>
                  </div>
                  <div className="max-w-md">
                    <Preview />
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="w-52 shrink-0 border-l p-4 flex flex-col gap-3">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleEnabled(key)}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs font-medium">{widget.enabled ? t("active") : t("inactive")}</span>
                    <div className={`h-6 w-11 rounded-full relative transition-colors duration-200 ${
                      widget.enabled ? "bg-primary" : "bg-muted-foreground/20"
                    }`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                        widget.enabled ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </div>
                  </button>

                  {/* Role checkboxes */}
                  {widget.enabled && (
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("roles")}</span>
                      <div className="mt-1.5 space-y-1">
                        {roles.map(role => (
                          <label key={role} className="flex items-center gap-1.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={widget.roles.includes(role)}
                              onChange={() => toggleRole(key, role)}
                              className="rounded border-muted-foreground/30 h-3.5 w-3.5"
                            />
                            <span className="text-xs capitalize group-hover:text-foreground text-muted-foreground">
                              {role}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-2 pt-2 sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]"
        >
          <Check className="h-4 w-4" />
          {saved ? t("saved") : saving ? "..." : tc("save")}
        </Button>
        <p className="text-sm text-muted-foreground">
          {t("activeWidgets")}: <span className="font-bold text-foreground">{activeCount}</span> / {WIDGET_KEYS.length}
        </p>
      </div>
    </div>
  )
}
