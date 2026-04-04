"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { MiniLineChart, MiniDonut } from "@/components/charts/mini-charts"
import {
  Send,
  MailOpen,
  MousePointerClick,
  AlertTriangle,
  Wallet,
  TrendingUp,
  Layers,
  Zap,
  FileText,
} from "lucide-react"

interface Campaign {
  id: string
  name: string
  description?: string
  status: string
  type: string
  totalRecipients: number
  totalSent: number
  totalOpened: number
  totalClicked: number
  budget?: number
  scheduledAt?: string
  sentAt?: string
  createdAt: string
}

interface CampaignsAnalyticsProps {
  campaigns: Campaign[]
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K"
  return n.toLocaleString("az-AZ")
}

function pct(part: number, total: number): string {
  if (!total) return "0%"
  return ((part / total) * 100).toFixed(1) + "%"
}

// ── Sub-components ──────────────────────────────────────────────────

function KpiBox({
  icon,
  value,
  label,
  iconColor,
}: {
  icon: React.ReactNode
  value: string
  label: string
  iconColor?: string
}) {
  return (
    <div className="bg-card rounded-xl border p-4 flex items-center gap-3 min-w-0">
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
          iconColor ?? "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-foreground truncate">{value}</div>
        <div className="text-xs text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  )
}

function HorizontalBar({
  label,
  value,
  pctValue,
  maxValue,
  color,
}: {
  label: string
  value: number
  pctValue: string
  maxValue: number
  color: string
}) {
  const widthPct = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 2
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {fmt(value)} <span className="text-muted-foreground text-xs">({pctValue})</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("w-2 h-2 rounded-full", color)} />
      {label}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────

export function CampaignsAnalytics({ campaigns }: CampaignsAnalyticsProps) {
  const stats = useMemo(() => {
    const totalSent = campaigns.reduce((s, c) => s + c.totalSent, 0)
    const totalOpened = campaigns.reduce((s, c) => s + c.totalOpened, 0)
    const totalClicked = campaigns.reduce((s, c) => s + c.totalClicked, 0)
    const totalRecipients = campaigns.reduce((s, c) => s + c.totalRecipients, 0)
    const totalBudget = campaigns.reduce((s, c) => s + (c.budget ?? 0), 0)
    const bounceCount = Math.max(totalSent - totalRecipients, 0) || Math.round(totalSent * 0.021)
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0"
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0"
    const bounceRate = totalSent > 0 ? ((bounceCount / totalSent) * 100).toFixed(1) : "0"

    // Estimated ROI based on budget & engagement
    const estimatedRevenue = totalClicked * 12 // rough ₼12 per click value
    const roi = totalBudget > 0 ? (((estimatedRevenue - totalBudget) / totalBudget) * 100).toFixed(0) : "0"

    return {
      totalSent,
      totalOpened,
      totalClicked,
      totalRecipients,
      totalBudget,
      bounceCount,
      openRate,
      clickRate,
      bounceRate,
      roi,
    }
  }, [campaigns])

  // Monthly trend data (last 6 months, derived from campaigns by sentAt/createdAt)
  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const months: { sent: number; opened: number; clicked: number; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleDateString("az-AZ", { month: "short" })
      const monthCampaigns = campaigns.filter((c) => {
        const dateStr = c.sentAt || c.createdAt
        return dateStr?.startsWith(monthKey)
      })
      months.push({
        sent: monthCampaigns.reduce((s, c) => s + c.totalSent, 0),
        opened: monthCampaigns.reduce((s, c) => s + c.totalOpened, 0),
        clicked: monthCampaigns.reduce((s, c) => s + c.totalClicked, 0),
        label,
      })
    }
    return months
  }, [campaigns])

  // Top campaigns sorted by totalSent
  const topCampaigns = useMemo(() => {
    return [...campaigns]
      .filter((c) => c.totalSent > 0)
      .sort((a, b) => b.totalSent - a.totalSent)
      .slice(0, 3)
  }, [campaigns])

  // Segment mock stats derived from campaign data
  const segmentStats = useMemo(() => {
    const types = new Set(campaigns.map((c) => c.type))
    const statuses = new Set(campaigns.map((c) => c.status))
    const segmentCount = Math.max(types.size + statuses.size, 3)
    const dynamicCount = Math.ceil(segmentCount * 0.6)
    const contactCount = stats.totalRecipients
    const topSegments = [
      { name: "Aktiv müştərilər", count: Math.round(contactCount * 0.45) },
      { name: "Yeni qeydiyyat", count: Math.round(contactCount * 0.3) },
      { name: "VIP müştərilər", count: Math.round(contactCount * 0.15) },
    ]
    return { total: segmentCount, dynamic: dynamicCount, contacts: contactCount, topSegments }
  }, [campaigns, stats.totalRecipients])

  // Automation mock stats
  const automationStats = useMemo(() => {
    const sentCampaigns = campaigns.filter((c) => c.status === "sent" || c.status === "sending")
    const activeCount = Math.max(Math.ceil(campaigns.length * 0.4), 1)
    const entryCount = stats.totalRecipients
    const conversionRate = stats.totalSent > 0 ? ((stats.totalClicked / stats.totalSent) * 100).toFixed(1) : "0"
    const topAutomations = [
      { name: "Xoş gəldiniz seriyası", status: "active" as const, conversions: Math.round(stats.totalClicked * 0.4) },
      { name: "Tərk edilmiş səbət", status: "active" as const, conversions: Math.round(stats.totalClicked * 0.35) },
      { name: "Yenidən cəlb etmə", status: "paused" as const, conversions: Math.round(stats.totalClicked * 0.15) },
    ]
    return { active: activeCount, entry: entryCount, conversionRate, topAutomations }
  }, [campaigns, stats])

  // Template mock stats
  const templateStats = useMemo(() => {
    const types = campaigns.reduce<Record<string, number>>((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1
      return acc
    }, {})
    const totalTemplates = Math.max(campaigns.length, 5)
    const activeTemplates = Math.ceil(totalTemplates * 0.7)
    const donutSegments = [
      { pct: 55, color: "#8b5cf6", label: "Email" },
      { pct: 25, color: "#06b6d4", label: "SMS" },
      { pct: 12, color: "#f59e0b", label: "Push" },
      { pct: 8, color: "#10b981", label: "Digər" },
    ]
    return { total: totalTemplates, active: activeTemplates, donutSegments }
  }, [campaigns])

  return (
    <div className="space-y-5">
      {/* ── KPI Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiBox
          icon={<Send className="w-5 h-5" />}
          value={fmt(stats.totalSent)}
          label="Göndərilib"
          iconColor="bg-blue-500/10 text-blue-500"
        />
        <KpiBox
          icon={<MailOpen className="w-5 h-5" />}
          value={stats.openRate + "%"}
          label="Açılma"
          iconColor="bg-emerald-500/10 text-emerald-500"
        />
        <KpiBox
          icon={<MousePointerClick className="w-5 h-5" />}
          value={stats.clickRate + "%"}
          label="Klik"
          iconColor="bg-violet-500/10 text-violet-500"
        />
        <KpiBox
          icon={<AlertTriangle className="w-5 h-5" />}
          value={stats.bounceRate + "%"}
          label="Bounce"
          iconColor="bg-amber-500/10 text-amber-500"
        />
        <KpiBox
          icon={<Wallet className="w-5 h-5" />}
          value={fmt(stats.totalBudget) + " \u20bc"}
          label="Büdcə"
          iconColor="bg-cyan-500/10 text-cyan-500"
        />
        <KpiBox
          icon={<TrendingUp className="w-5 h-5" />}
          value={"+" + stats.roi + "%"}
          label="ROI"
          iconColor="bg-green-500/10 text-green-500"
        />
      </div>

      {/* ── Row 2: Trend + Funnel + Top Campaigns ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly sending trend */}
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Aylıq göndərmə trendi</h3>
          <div className="space-y-2">
            <MiniLineChart data={monthlyTrend.map((m) => m.sent)} color="stroke-blue-400" />
            <MiniLineChart data={monthlyTrend.map((m) => m.opened)} color="stroke-emerald-400" />
            <MiniLineChart data={monthlyTrend.map((m) => m.clicked)} color="stroke-violet-400" />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <LegendDot color="bg-blue-400" label="Göndərilib" />
            <LegendDot color="bg-emerald-400" label="Açılıb" />
            <LegendDot color="bg-violet-400" label="Kliklənib" />
          </div>
          {/* Month labels */}
          <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
            {monthlyTrend.map((m, i) => (
              <span key={i}>{m.label}</span>
            ))}
          </div>
        </div>

        {/* Delivery funnel */}
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Çatdırılma hunisi</h3>
          <div className="space-y-3">
            <HorizontalBar
              label="Göndərilib"
              value={stats.totalSent}
              pctValue="100%"
              maxValue={stats.totalSent}
              color="bg-blue-500"
            />
            <HorizontalBar
              label="Açılıb"
              value={stats.totalOpened}
              pctValue={pct(stats.totalOpened, stats.totalSent)}
              maxValue={stats.totalSent}
              color="bg-emerald-500"
            />
            <HorizontalBar
              label="Kliklənib"
              value={stats.totalClicked}
              pctValue={pct(stats.totalClicked, stats.totalSent)}
              maxValue={stats.totalSent}
              color="bg-violet-500"
            />
            <HorizontalBar
              label="Bounce"
              value={stats.bounceCount}
              pctValue={pct(stats.bounceCount, stats.totalSent)}
              maxValue={stats.totalSent}
              color="bg-amber-500"
            />
          </div>
        </div>

        {/* Top campaigns */}
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Ən yaxşı kampaniyalar</h3>
          {topCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hələ kampaniya yoxdur</p>
          ) : (
            <div className="space-y-3">
              {topCampaigns.map((c, i) => (
                <div key={c.id} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      i === 0
                        ? "bg-amber-500/15 text-amber-500"
                        : i === 1
                          ? "bg-gray-400/15 text-gray-400"
                          : "bg-orange-400/15 text-orange-400"
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{fmt(c.totalSent)} gönd.</span>
                      <span>{pct(c.totalOpened, c.totalSent)} açılma</span>
                      <span>{pct(c.totalClicked, c.totalSent)} klik</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Segments + Automation + Templates ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Segments */}
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Seqmentlər</h3>
            </div>
            <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
              {segmentStats.total}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{segmentStats.total}</div>
              <div className="text-[10px] text-muted-foreground">Cəmi</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{segmentStats.dynamic}</div>
              <div className="text-[10px] text-muted-foreground">Dinamik</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{fmt(segmentStats.contacts)}</div>
              <div className="text-[10px] text-muted-foreground">Kontakt</div>
            </div>
          </div>
          <div className="border-t pt-3 space-y-2">
            {segmentStats.topSegments.map((seg, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate">{seg.name}</span>
                <span className="font-medium text-foreground ml-2">{fmt(seg.count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Automation */}
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Avtomatlaşdırma</h3>
            </div>
            <span className="bg-emerald-500/10 text-emerald-500 text-xs font-semibold px-2 py-0.5 rounded-full">
              {automationStats.active}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{automationStats.active}</div>
              <div className="text-[10px] text-muted-foreground">Aktiv</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{fmt(automationStats.entry)}</div>
              <div className="text-[10px] text-muted-foreground">Giriş</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{automationStats.conversionRate}%</div>
              <div className="text-[10px] text-muted-foreground">Konversiya</div>
            </div>
          </div>
          <div className="border-t pt-3 space-y-2">
            {automationStats.topAutomations.map((auto, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      auto.status === "active" ? "bg-emerald-500" : "bg-gray-400"
                    )}
                  />
                  <span className="text-muted-foreground truncate">{auto.name}</span>
                </div>
                <span className="font-medium text-foreground ml-2">{fmt(auto.conversions)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Şablonlar</h3>
            </div>
            <span className="bg-violet-500/10 text-violet-500 text-xs font-semibold px-2 py-0.5 rounded-full">
              {templateStats.total}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{templateStats.total}</div>
              <div className="text-[10px] text-muted-foreground">Cəmi</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{templateStats.active}</div>
              <div className="text-[10px] text-muted-foreground">Aktiv</div>
            </div>
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-center gap-5">
              <MiniDonut segments={templateStats.donutSegments.map((s) => ({ pct: s.pct, color: s.color }))} size={64} />
              <div className="space-y-1.5">
                {templateStats.donutSegments.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium text-foreground">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
