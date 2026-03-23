"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  BarChart3, Filter, TrendingUp, DollarSign, CheckSquare,
  Ticket, Target, Heart, Activity, Check, LayoutDashboard,
} from "lucide-react"

interface WidgetConfig {
  statCards: boolean
  leadFunnel: boolean
  dealPipeline: boolean
  revenueChart: boolean
  taskSummary: boolean
  ticketSummary: boolean
  forecast: boolean
  clientHealth: boolean
  activityFeed: boolean
}

const DEFAULT_CONFIG: WidgetConfig = {
  statCards: true,
  leadFunnel: true,
  dealPipeline: true,
  revenueChart: true,
  taskSummary: true,
  ticketSummary: true,
  forecast: true,
  clientHealth: true,
  activityFeed: true,
}

const WIDGETS: { key: keyof WidgetConfig; icon: any; labelKey: string; descKey: string }[] = [
  { key: "statCards", icon: BarChart3, labelKey: "wStatCards", descKey: "wStatCardsDesc" },
  { key: "leadFunnel", icon: Filter, labelKey: "wLeadFunnel", descKey: "wLeadFunnelDesc" },
  { key: "dealPipeline", icon: TrendingUp, labelKey: "wDealPipeline", descKey: "wDealPipelineDesc" },
  { key: "revenueChart", icon: DollarSign, labelKey: "wRevenueChart", descKey: "wRevenueChartDesc" },
  { key: "taskSummary", icon: CheckSquare, labelKey: "wTaskSummary", descKey: "wTaskSummaryDesc" },
  { key: "ticketSummary", icon: Ticket, labelKey: "wTicketSummary", descKey: "wTicketSummaryDesc" },
  { key: "forecast", icon: Target, labelKey: "wForecast", descKey: "wForecastDesc" },
  { key: "clientHealth", icon: Heart, labelKey: "wClientHealth", descKey: "wClientHealthDesc" },
  { key: "activityFeed", icon: Activity, labelKey: "wActivityFeed", descKey: "wActivityFeedDesc" },
]

function getStorageKey(userId: string) {
  return `dashboard-widgets-${userId}`
}

export default function DashboardSettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("dashboardSettings")
  const tc = useTranslations("common")
  const userId = (session?.user as any)?.id || ""

  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (!userId) return
    try {
      const stored = localStorage.getItem(getStorageKey(userId))
      if (stored) {
        const parsed = JSON.parse(stored)
        setConfig({ ...DEFAULT_CONFIG, ...parsed })
      }
    } catch {}
  }, [userId])

  const toggle = (key: keyof WidgetConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const handleSave = () => {
    if (!userId) return
    localStorage.setItem(getStorageKey(userId), JSON.stringify(config))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const activeCount = Object.values(config).filter(Boolean).length

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {WIDGETS.map(({ key, icon: Icon, labelKey, descKey }) => {
          const enabled = config[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                enabled
                  ? "border-primary/30 bg-primary/5 shadow-sm"
                  : "border-muted bg-card hover:border-muted-foreground/20"
              }`}
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
                  {t(labelKey)}
                </div>
                <div className="text-xs text-muted-foreground">{t(descKey)}</div>
              </div>
              <div className={`h-6 w-11 rounded-full relative transition-colors duration-200 shrink-0 ${
                enabled ? "bg-primary" : "bg-muted-foreground/20"
              }`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  enabled ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          {t("activeWidgets")}: <span className="font-bold text-foreground">{activeCount}</span> / {WIDGETS.length}
        </p>
        <Button onClick={handleSave} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]">
          <Check className="h-4 w-4" />
          {saved ? t("saved") : tc("save")}
        </Button>
      </div>
    </div>
  )
}
