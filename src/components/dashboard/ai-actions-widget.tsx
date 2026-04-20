"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Inbox, AlertTriangle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

interface PendingBreakdown {
  key: string
  count: number
}

interface Stats {
  pending: number
  pendingByUrgency: { critical: number; high: number; normal: number }
  topPendingFeatures: PendingBreakdown[]
  newToday: number
}

const FEATURE_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  ai_auto_followup:             { emoji: "📋", label: "Follow-up",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  ai_auto_followup_shadow:      { emoji: "📋", label: "Follow-up",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  ai_auto_acknowledge:          { emoji: "⚡", label: "SLA",        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  ai_auto_acknowledge_shadow:   { emoji: "⚡", label: "SLA",        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  ai_auto_payment_reminder:     { emoji: "💰", label: "Payment",    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  ai_auto_payment_reminder_shadow: { emoji: "💰", label: "Payment", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  ai_auto_renewal:              { emoji: "🔄", label: "Renewal",    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  ai_auto_renewal_shadow:       { emoji: "🔄", label: "Renewal",    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  ai_auto_hot_lead:             { emoji: "🔥", label: "Hot lead",   color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  ai_auto_hot_lead_shadow:      { emoji: "🔥", label: "Hot lead",   color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  ai_auto_triage:               { emoji: "🏷", label: "Triage",     color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  ai_auto_triage_shadow:        { emoji: "🏷", label: "Triage",     color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  ai_auto_stage_advance:        { emoji: "📈", label: "Stage",      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  ai_auto_stage_advance_shadow: { emoji: "📈", label: "Stage",      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  ai_auto_sentiment:            { emoji: "😠", label: "Sentiment",  color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  ai_auto_sentiment_shadow:     { emoji: "😠", label: "Sentiment",  color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  ai_auto_kb_close:             { emoji: "📖", label: "KB",         color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  ai_auto_kb_close_shadow:      { emoji: "📖", label: "KB",         color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  ai_auto_duplicate:            { emoji: "🔗", label: "Duplicate",  color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300" },
  ai_auto_duplicate_shadow:     { emoji: "🔗", label: "Duplicate",  color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300" },
  ai_auto_credit_limit:         { emoji: "💳", label: "Credit",     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  ai_auto_credit_limit_shadow:  { emoji: "💳", label: "Credit",     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  ai_auto_meeting_recap:        { emoji: "🎙", label: "Meeting",    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  ai_auto_meeting_recap_shadow: { emoji: "🎙", label: "Meeting",    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  ai_auto_social_reply:         { emoji: "💬", label: "Reply",      color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  ai_auto_social_reply_shadow:  { emoji: "💬", label: "Reply",      color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  ai_auto_social_viral:         { emoji: "🚨", label: "Viral",      color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  ai_auto_social_viral_shadow:  { emoji: "🚨", label: "Viral",      color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
}

function labelFor(key: string) {
  return FEATURE_LABELS[key] || { emoji: "•", label: key.replace("ai_auto_", "").replace("_shadow", ""), color: "bg-muted text-muted-foreground" }
}

export function AiActionsWidget({ orgId }: { orgId?: string }) {
  const t = useTranslations("dashboardWidgets")
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/settings/ai-stats", {
      headers: { "x-organization-id": orgId },
    })
      .then(r => r.json())
      .then(j => setStats(j?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  const critical = stats?.pendingByUrgency?.critical || 0
  const high = stats?.pendingByUrgency?.high || 0
  const urgentCount = critical + high

  return (
    <Link href="/ai/actions" className="block group">
      <Card className="p-4 h-full transition-colors hover:border-primary/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("aiActionsQueueLabel")}</p>
          </div>
          {urgentCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <AlertTriangle className="h-2.5 w-2.5" />
              {urgentCount} {t("aiActionsUrgent")}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-14">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold">{stats?.pending ?? 0}</span>
              {(stats?.newToday ?? 0) > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  +{stats?.newToday} {t("aiActionsToday")}
                </span>
              )}
            </div>
            {stats && stats.topPendingFeatures.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1">
                {stats.topPendingFeatures.map(f => {
                  const info = labelFor(f.key)
                  return (
                    <span
                      key={f.key}
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${info.color}`}
                    >
                      {info.emoji} {info.label} · {f.count}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    </Link>
  )
}
