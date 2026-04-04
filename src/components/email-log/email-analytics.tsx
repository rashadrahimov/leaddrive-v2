"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { MiniDonut } from "@/components/charts/mini-charts"
import {
  Mail, Send, Inbox, CheckCircle, AlertTriangle, RotateCcw,
  BarChart3, TrendingUp, Clock, Users, Sparkles,
} from "lucide-react"

interface EmailLogEntry {
  id: string
  direction: string
  fromEmail: string
  toEmail: string
  subject: string | null
  status: string
  campaignId: string | null
  sentBy: string | null
  createdAt: string
}

interface Stats {
  total: number
  outbound: number
  inbound: number
  sent: number
  failed: number
  bounced: number
}

interface EmailAnalyticsProps {
  logs: EmailLogEntry[]
  stats: Stats
  labels: {
    total: string
    outbound: string
    inbound: string
    sent: string
    failed: string
    bounced: string
    pending: string
    deliveryRate: string
    statusDistribution: string
    directionBreakdown: string
    emailsByMonth: string
    topRecipients: string
    topSenders: string
    campaignEmails: string
    noData: string
  }
}

export function EmailAnalytics({ logs, stats, labels }: EmailAnalyticsProps) {
  const computed = useMemo(() => {
    const deliveryRate = stats.outbound > 0
      ? Math.round((stats.sent / stats.outbound) * 100)
      : 0

    const failRate = stats.outbound > 0
      ? Math.round(((stats.failed + stats.bounced) / stats.outbound) * 100)
      : 0

    // Status counts
    const statusCounts: Record<string, number> = { sent: 0, delivered: 0, failed: 0, bounced: 0, pending: 0 }
    logs.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1 })

    // Top recipients
    const recipientMap: Record<string, number> = {}
    logs.filter(l => l.direction === "outbound").forEach(l => {
      recipientMap[l.toEmail] = (recipientMap[l.toEmail] || 0) + 1
    })
    const topRecipients = Object.entries(recipientMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Top senders (for outbound)
    const senderMap: Record<string, number> = {}
    logs.filter(l => l.direction === "outbound" && l.sentBy).forEach(l => {
      senderMap[l.sentBy!] = (senderMap[l.sentBy!] || 0) + 1
    })
    const topSenders = Object.entries(senderMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Campaign vs manual
    const campaignCount = logs.filter(l => l.campaignId).length
    const manualCount = logs.length - campaignCount

    // Monthly trend (last 6 months)
    const now = new Date()
    const monthlyData: { month: string; sent: number; failed: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const monthLabel = d.toLocaleDateString("az", { month: "short" })
      const monthLogs = logs.filter(l => l.createdAt.startsWith(monthKey))
      monthlyData.push({
        month: monthLabel,
        sent: monthLogs.filter(l => ["sent", "delivered"].includes(l.status)).length,
        failed: monthLogs.filter(l => ["failed", "bounced"].includes(l.status)).length,
      })
    }
    const maxMonthly = Math.max(...monthlyData.map(m => m.sent + m.failed), 1)

    return {
      deliveryRate, failRate, statusCounts, topRecipients, topSenders,
      campaignCount, manualCount, monthlyData, maxMonthly,
    }
  }, [logs, stats])

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Mail className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">{labels.noData}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: labels.total, value: stats.total, icon: Mail, color: "from-primary to-primary/80", sub: `${stats.outbound} out / ${stats.inbound} in` },
          { label: labels.outbound, value: stats.outbound, icon: Send, color: "from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))]", sub: `${computed.deliveryRate}% delivered` },
          { label: labels.inbound, value: stats.inbound, icon: Inbox, color: "from-primary/80 to-primary", sub: "received" },
          { label: labels.sent, value: stats.sent, icon: CheckCircle, color: "from-emerald-500 to-green-600", sub: `${computed.deliveryRate}% rate` },
          { label: labels.failed, value: stats.failed, icon: AlertTriangle, color: "from-red-500 to-rose-600", sub: `${computed.failRate}% fail rate` },
          { label: labels.bounced, value: stats.bounced, icon: RotateCcw, color: "from-orange-500 to-amber-600", sub: "bounced back" },
        ].map((kpi, i) => (
          <div key={i} className="relative overflow-hidden rounded-xl text-white p-4">
            <div className={cn("absolute inset-0 bg-gradient-to-br", kpi.color)} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/80 truncate">{kpi.label}</span>
                <kpi.icon className="h-4 w-4 text-white/60" />
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight">{kpi.value}</p>
              <p className="text-[11px] text-white/70 mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Status + Direction + Campaign */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            {labels.statusDistribution}
          </h3>
          <div className="space-y-3">
            {[
              { key: "sent", label: labels.sent, color: "bg-emerald-500" },
              { key: "delivered", label: "Delivered", color: "bg-blue-500" },
              { key: "failed", label: labels.failed, color: "bg-red-500" },
              { key: "bounced", label: labels.bounced, color: "bg-orange-500" },
              { key: "pending", label: labels.pending, color: "bg-amber-500" },
            ].map(s => {
              const count = computed.statusCounts[s.key] || 0
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
                      <span className="text-xs font-medium">{s.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", s.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Direction Breakdown */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            {labels.directionBreakdown}
          </h3>
          <div className="flex items-center justify-center h-32">
            <MiniDonut
              segments={[
                { value: stats.outbound, color: "#8b5cf6" },
                { value: stats.inbound, color: "#3b82f6" },
              ]}
              size={110}
              thickness={14}
            />
            <div className="ml-4 space-y-3">
              {[
                { label: labels.outbound, count: stats.outbound, color: "bg-[hsl(var(--ai-from))]" },
                { label: labels.inbound, count: stats.inbound, color: "bg-blue-500" },
              ].map(p => (
                <div key={p.label} className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", p.color)} />
                  <span className="text-xs">{p.label}</span>
                  <span className="text-xs font-semibold">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campaign vs Manual */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            {labels.campaignEmails}
          </h3>
          <div className="flex items-center justify-center h-32">
            <MiniDonut
              segments={[
                { value: computed.campaignCount, color: "#8b5cf6" },
                { value: computed.manualCount, color: "#6b7280" },
              ]}
              size={110}
              thickness={14}
            />
            <div className="ml-4 space-y-3">
              {[
                { label: labels.campaignEmails, count: computed.campaignCount, color: "bg-[hsl(var(--ai-from))]" },
                { label: "Manual", count: computed.manualCount, color: "bg-gray-500" },
              ].map(p => (
                <div key={p.label} className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", p.color)} />
                  <span className="text-xs">{p.label}</span>
                  <span className="text-xs font-semibold">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Monthly Trend + Top Recipients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            {labels.emailsByMonth}
          </h3>
          <div className="flex items-end gap-2 h-36">
            {computed.monthlyData.map((m, i) => {
              const total = m.sent + m.failed
              const sentPct = total > 0 ? (m.sent / computed.maxMonthly) * 100 : 0
              const failPct = total > 0 ? (m.failed / computed.maxMonthly) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground">{total}</span>
                  <div className="w-full flex flex-col-reverse">
                    {m.sent > 0 && (
                      <div className="w-full rounded-t-md bg-emerald-500/80 transition-all" style={{ height: `${sentPct}%`, minHeight: "4px" }} />
                    )}
                    {m.failed > 0 && (
                      <div className="w-full bg-red-500/80 transition-all" style={{ height: `${failPct}%`, minHeight: "4px" }} />
                    )}
                    {total === 0 && <div className="w-full bg-muted rounded-t-md" style={{ height: "2px" }} />}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">{m.month}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-emerald-500" /> {labels.sent}</span>
            <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-red-500" /> {labels.failed}</span>
          </div>
        </div>

        {/* Top Recipients */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {labels.topRecipients}
          </h3>
          {computed.topRecipients.length > 0 ? (
            <div className="space-y-3">
              {computed.topRecipients.map(([email, count], i) => {
                const maxCount = computed.topRecipients[0]?.[1] || 1
                const pct = (count / maxCount) * 100
                return (
                  <div key={email}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate max-w-[200px]">{email}</span>
                      <span className="text-xs text-muted-foreground font-semibold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-[hsl(var(--ai-from))] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">{labels.noData}</p>
          )}
        </div>
      </div>
    </div>
  )
}
