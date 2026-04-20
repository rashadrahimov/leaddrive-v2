"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Sparkles, CheckCircle2, Clock, ArrowRight, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

interface Stats {
  approvedThisMonth: number
  rejectedThisMonth: number
  pending: number
  minutesSaved: number
}

export function AiValueWidget({ orgId }: { orgId?: string }) {
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

  const minutes = stats?.minutesSaved ?? 0
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const timeLabel = hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`

  return (
    <Link href="/settings/ai-automation" className="block group">
      <Card className="p-4 h-full transition-colors hover:border-primary/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("aiValueMonthLabel")}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xl font-semibold">{stats?.approvedThisMonth ?? 0}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("aiValueApproved")}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-600">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xl font-semibold">{stats?.pending ?? 0}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("aiValuePending")}</p>
            </div>
            <div>
              <div className="text-xl font-semibold text-blue-600">{timeLabel}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("aiValueSaved")}</p>
            </div>
          </div>
        )}
      </Card>
    </Link>
  )
}
