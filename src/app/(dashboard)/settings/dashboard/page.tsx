"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  BarChart3, TrendingUp, Users, DollarSign, Target, Brain,
  Activity, Megaphone, Calendar, BarChart, Shield, Ticket,
  FileText, CheckCircle2, PieChart, Wallet, Clock, Handshake,
  Save, RotateCcw, Loader2,
} from "lucide-react"

type WidgetConfig = { enabled: boolean; roles: string[] }

const WIDGET_META: Record<string, { label: string; description: string; icon: any; category: string }> = {
  // Main widgets
  statCards:       { label: "KPI Kartları",             description: "Gəlir, lidlər, sövdələşmələr, konversiya, tiketlər, kampaniyalar",  icon: BarChart3,    category: "main" },
  dealPipeline:    { label: "Satış Pipeline",           description: "Mərhələlər üzrə sövdələşmə hunisi",                                icon: Target,       category: "main" },
  revenueTrend:    { label: "Gəlir Trendi",             description: "12 aylıq gəlir area qrafiki",                                      icon: TrendingUp,   category: "main" },
  leadSources:     { label: "Lid Mənbələri",            description: "Mənbə üzrə lidlərin donut diaqramı",                                icon: PieChart,     category: "main" },
  recentDeals:     { label: "Son Sövdələşmələr",        description: "Son 5 sövdələşmə siyahısı",                                        icon: Handshake,    category: "main" },
  aiLeadScoring:   { label: "Da Vinci Lid Skorinq",           description: "Ən yüksək skora malik 5 lid",                                      icon: Brain,        category: "main" },
  activityFeed:    { label: "Son Fəaliyyət",            description: "Son zənglər, e-poçtlar, görüşlər",                                  icon: Activity,     category: "main" },
  campaignStats:   { label: "Kampaniyalar",             description: "Aktiv kampaniyalar: göndərildi, açılma, klik",                      icon: Megaphone,    category: "main" },
  upcomingEvents:  { label: "Tədbirlər",                description: "Gələcək tədbirlər və qeydiyyat sayı",                               icon: Calendar,     category: "main" },
  weeklyMetrics:   { label: "Həftəlik Metriklər",       description: "7 günlük lidlər/tiketlər + SLA/CSAT",                               icon: BarChart,     category: "main" },

  // Finance
  revenueChart:    { label: "Xidmətlər üzrə Gəlir",    description: "Xidmət növləri üzrə gəlir paylanması",                              icon: DollarSign,   category: "finance" },
  forecast:        { label: "Satış Proqnozu",           description: "6 ay faktiki + 6 ay proqnoz",                                      icon: TrendingUp,   category: "finance" },
  profitMargin:    { label: "Mənfəət Marjası",          description: "Ümumi marja və gəlirlilik göstəriciləri",                           icon: Wallet,       category: "finance" },
  revenueByClient: { label: "Müştəri üzrə Gəlir",      description: "Top-10 müştəri gəlir sıralaması",                                   icon: DollarSign,   category: "finance" },
  invoiceStats:    { label: "Hesab-faktura Statistikası", description: "Ödənilmiş, gözləyən, gecikmiş fakturalar",                         icon: FileText,     category: "finance" },
  overdueInvoices: { label: "Gecikmiş Fakturalar",      description: "Vaxtı keçmiş ödəniş gözləyən fakturalar",                           icon: Clock,        category: "finance" },

  // Leads & Deals
  leadFunnel:      { label: "Lid Hunisi",               description: "Yeni → Əlaqə → Kvalifikasiya → Konversiya",                        icon: Users,        category: "leads" },
  leadFunnelDetailed: { label: "Lid Hunisi (Ətraflı)",  description: "Hər mərhələdə konversiya faizi ilə",                                icon: Users,        category: "leads" },
  dealConversion:  { label: "Sövdələşmə Konversiyası",  description: "Mərhələ keçid analitikası və orta müddət",                          icon: TrendingUp,   category: "leads" },
  clientHealth:    { label: "Müştəri Sağlamlığı",       description: "Gəlirli vs zərərli müştərilər",                                    icon: Shield,       category: "leads" },

  // Operations
  ticketSummary:   { label: "Tiket İcmalı",             description: "Status üzrə tiketlər və həll müddəti",                              icon: Ticket,       category: "operations" },
  ticketSla:       { label: "Tiket SLA Analitikası",    description: "SLA uyğunluğu, orta cavab müddəti",                                 icon: Shield,       category: "operations" },
  taskSummary:     { label: "Tapşırıq İcmalı",          description: "Tapşırıqların tamamlanma faizi",                                    icon: CheckCircle2, category: "operations" },
  taskCompletion:  { label: "Tapşırıq Tamamlanması",    description: "Həftəlik tapşırıq tamamlanma trendi",                               icon: CheckCircle2, category: "operations" },
  teamPerformance: { label: "Komanda Performansı",      description: "Satış və dəstək komandası göstəriciləri",                            icon: Users,        category: "operations" },

  // Marketing
  campaignRoi:     { label: "Kampaniya ROI",            description: "Kampaniya xərc-gəlir analizi",                                      icon: Megaphone,    category: "marketing" },
}

const CATEGORIES = [
  { id: "main",       label: "Əsas Vidjetlər",           description: "Dəshbordda göstərilən əsas vidjetlər" },
  { id: "finance",    label: "Maliyyə Analitikası",       description: "Gəlir, mənfəət, faktura göstəriciləri" },
  { id: "leads",      label: "Lidlər & Sövdələşmələr",    description: "Lid hunisi, konversiya, müştəri sağlamlığı" },
  { id: "operations", label: "Əməliyyatlar",              description: "Tiketlər, tapşırıqlar, komanda performansı" },
  { id: "marketing",  label: "Marketinq",                 description: "Kampaniya performansı və ROI" },
]

export default function DashboardSettingsPage() {
  const { data: session } = useSession()
  const [widgets, setWidgets] = useState<Record<string, WidgetConfig>>({})
  const [original, setOriginal] = useState<Record<string, WidgetConfig>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
          setOriginal(j.data.widgets)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session])

  function toggle(key: string) {
    setWidgets(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key]?.enabled },
    }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const orgId = session?.user?.organizationId
      await fetch("/api/v1/dashboard/widget-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": String(orgId),
        },
        body: JSON.stringify({ widgets }),
      })
      setOriginal(widgets)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setWidgets(original)
    setSaved(false)
  }

  const hasChanges = JSON.stringify(widgets) !== JSON.stringify(original)
  const enabledCount = Object.values(widgets).filter(w => w.enabled).length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Parametrləri</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dəshbordda göstəriləcək vidjetləri seçin · {enabledCount} aktiv vidjet
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Sıfırla
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            {saved ? "Saxlanıldı ✓" : "Yadda saxla"}
          </Button>
        </div>
      </div>

      {/* Categories */}
      {CATEGORIES.map(cat => {
        const catWidgets = Object.entries(WIDGET_META).filter(([, m]) => m.category === cat.id)
        if (catWidgets.length === 0) return null

        const catEnabled = catWidgets.filter(([key]) => widgets[key]?.enabled).length

        return (
          <div key={cat.id}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold">{cat.label}</h2>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {catEnabled}/{catWidgets.length}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {catWidgets.map(([key, meta]) => {
                const Icon = meta.icon
                const enabled = widgets[key]?.enabled ?? false
                return (
                  <Card
                    key={key}
                    className={`p-3.5 cursor-pointer transition-all hover:shadow-md border-2 ${
                      enabled
                        ? "border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20"
                        : "border-transparent hover:border-border"
                    }`}
                    onClick={() => toggle(key)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        enabled
                          ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{meta.label}</div>
                        <div className="text-[11px] text-muted-foreground leading-tight">{meta.description}</div>
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
      })}
    </div>
  )
}
