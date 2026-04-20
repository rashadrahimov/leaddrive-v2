"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Inbox, ArrowRight, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

export function AiActionsWidget({ orgId }: { orgId?: string }) {
  const t = useTranslations("dashboardWidgets")
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/ai-shadow-actions?status=pending&limit=1", {
      headers: { "x-organization-id": orgId },
    })
      .then(r => r.json())
      .then(j => setCount(j?.pagination?.total ?? 0))
      .catch(() => setCount(0))
      .finally(() => setLoading(false))
  }, [orgId])

  return (
    <Link href="/ai/actions" className="block group">
      <Card className="p-4 h-full transition-colors hover:border-primary/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("aiActionsQueueLabel")}</p>
            <p className="text-xl font-semibold leading-tight">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : count}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t("aiActionsQueueHint")}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
      </Card>
    </Link>
  )
}
