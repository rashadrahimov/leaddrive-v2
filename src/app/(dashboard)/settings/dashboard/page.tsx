"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  BarChart3, TrendingUp, Users, DollarSign, Target, Brain,
  Activity, Megaphone, Calendar, BarChart, Shield, Ticket,
  FileText, CheckCircle2, PieChart, Wallet, Clock, Handshake,
  Eye, EyeOff, Loader2,
} from "lucide-react"

type WidgetConfig = { enabled: boolean; roles: string[] }

const WIDGET_META: Record<string, { label: string; description: string; icon: any }> = {
  statCards:          { label: "KPI Kartları",                description: "Gəlir, lidlər, sövdələşmələr, konversiya, tiketlər, kampaniyalar",  icon: BarChart3    },
  dealPipeline:       { label: "Satış Pipeline",              description: "Mərhələlər üzrə sövdələşmə hunisi",                                icon: Target       },
  revenueTrend:       { label: "Gəlir Trendi",                description: "12 aylıq gəlir area qrafiki",                                      icon: TrendingUp   },
  leadSources:        { label: "Lid Mənbələri",               description: "Mənbə üzrə lidlərin donut diaqramı",                                icon: PieChart     },
  recentDeals:        { label: "Son Sövdələşmələr",           description: "Son 5 sövdələşmə siyahısı",                                        icon: Handshake    },
  aiLeadScoring:      { label: "Da Vinci Lid Skorinq",        description: "Ən yüksək skora malik 5 lid",                                      icon: Brain        },
  activityFeed:       { label: "Son Fəaliyyət",               description: "Son zənglər, e-poçtlar, görüşlər",                                  icon: Activity     },
  campaignStats:      { label: "Kampaniyalar",                description: "Aktiv kampaniyalar: göndərildi, açılma, klik",                      icon: Megaphone    },
  upcomingEvents:     { label: "Tədbirlər",                   description: "Gələcək tədbirlər və qeydiyyat sayı",                               icon: Calendar     },
  weeklyMetrics:      { label: "Həftəlik Metriklər",          description: "7 günlük lidlər/tiketlər + SLA/CSAT",                               icon: BarChart     },
  recommendedActions: { label: "Tövsiyə olunan hərəkətlər",   description: "AI tərəfindən növbəti addımlar",                                    icon: Brain        },
  churnRisk:          { label: "İtirilmə riski",              description: "Risk altında olan müştərilər",                                       icon: Shield       },
}

// Order matches dashboard layout
const WIDGET_ORDER = [
  "statCards",
  "dealPipeline", "revenueTrend", "leadSources",
  "recentDeals", "aiLeadScoring", "activityFeed",
  "campaignStats", "upcomingEvents", "weeklyMetrics",
  "recommendedActions", "churnRisk",
]

export default function DashboardSettingsPage() {
  const { data: session } = useSession()
  const [widgets, setWidgets] = useState<Record<string, WidgetConfig>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const orgId = session?.user?.organizationId
    if (!orgId) return
    fetch("/api/v1/dashboard/widget-config", {
      headers: { "x-organization-id": String(orgId) },
    })
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.widgets) {
          setWidgets(j.data.widgets)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session])

  async function toggle(key: string) {
    const updated = {
      ...widgets,
      [key]: { ...widgets[key], enabled: !widgets[key]?.enabled },
    }
    setWidgets(updated)
    setSaving(key)

    try {
      const orgId = session?.user?.organizationId
      await fetch("/api/v1/dashboard/widget-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": String(orgId),
        },
        body: JSON.stringify({ widgets: updated }),
      })
    } catch (e) {
      console.error(e)
      // Revert on error
      setWidgets(widgets)
    } finally {
      setTimeout(() => setSaving(null), 300)
    }
  }

  const enabledCount = Object.values(widgets).filter(w => w.enabled).length
  const totalCount = WIDGET_ORDER.length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard Blokları</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Blokları söndürün/yandırın — dəyişikliklər avtomatik saxlanılır
        </p>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-600 font-medium">{enabledCount} aktiv</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{totalCount - enabledCount} gizli</span>
          </div>
        </div>
      </div>

      {/* Widgets grid — same 3-col layout as dashboard */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {WIDGET_ORDER.map((key) => {
          const meta = WIDGET_META[key]
          if (!meta) return null
          const Icon = meta.icon
          const enabled = widgets[key]?.enabled ?? true
          const isSaving = saving === key

          return (
            <Card
              key={key}
              className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
                enabled
                  ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10"
                  : "border-transparent bg-muted/30 opacity-60"
              }`}
              onClick={() => toggle(key)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  enabled
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{meta.label}</span>
                    {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{meta.description}</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => toggle(key)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
