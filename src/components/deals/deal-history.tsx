"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, Clock, ArrowRight, DollarSign, User, Tag, FileText } from "lucide-react"

interface HistoryEntry {
  id: string
  action: string
  entityType: string
  details: any
  createdAt: string
  userId?: string
  userName?: string
}

const ACTION_CONFIG: Record<string, { icon: any; bg: string; text: string }> = {
  stage_change: { icon: ArrowRight, bg: "bg-blue-100", text: "text-blue-600" },
  value_change: { icon: DollarSign, bg: "bg-green-100", text: "text-green-600" },
  assign_change: { icon: User, bg: "bg-violet-100", text: "text-violet-600" },
  created: { icon: FileText, bg: "bg-indigo-100", text: "text-indigo-600" },
  updated: { icon: Tag, bg: "bg-amber-100", text: "text-amber-600" },
  default: { icon: Clock, bg: "bg-gray-100", text: "text-gray-600" },
}

const ACTION_KEY_MAP: Record<string, string> = {
  "create deal": "actionCreateDeal",
  "create_deal": "actionCreateDeal",
  "move deal stage": "actionMoveDealStage",
  "move_deal_stage": "actionMoveDealStage",
  "update deal": "actionUpdateDeal",
  "update_deal": "actionUpdateDeal",
  "delete deal": "actionDeleteDeal",
  "delete_deal": "actionDeleteDeal",
  "create contact": "actionCreateContact",
  "create_contact": "actionCreateContact",
  "update contact": "actionUpdateContact",
  "update_contact": "actionUpdateContact",
  "create note": "actionCreateNote",
  "create_note": "actionCreateNote",
  "update note": "actionUpdateNote",
  "update_note": "actionUpdateNote",
}

export function DealHistory({ dealId, orgId, deal }: { dealId: string; orgId?: string; deal: any }) {
  const tc = useTranslations("common")
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const headers: any = orgId ? { "x-organization-id": orgId } : {}
    fetch(`/api/v1/audit-log?entityType=deal&entityId=${dealId}&limit=50`, { headers })
      .then(r => r.json())
      .then(j => {
        if (j.success) setEntries(j.data?.logs || j.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dealId, orgId])

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString("az-AZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  function translateAction(action: string): string {
    const normalized = action.toLowerCase()
    const key = ACTION_KEY_MAP[normalized] || ACTION_KEY_MAP[normalized.replace(/ /g, "_")]
    if (key) {
      try { return tc(key as any) } catch { }
    }
    return action.replace(/_/g, " ")
  }

  const timeline: { id: string; date: string; icon: any; bg: string; text: string; title: string; detail: string }[] = []

  timeline.push({
    id: "created",
    date: deal.createdAt,
    ...ACTION_CONFIG.created,
    title: tc("dealCreated"),
    detail: `${deal.name} — ${deal.valueAmount?.toLocaleString()} ${deal.currency}`,
  })

  if (deal.stageChangedAt && deal.stageChangedAt !== deal.createdAt) {
    timeline.push({
      id: "stage-current",
      date: deal.stageChangedAt,
      ...ACTION_CONFIG.stage_change,
      title: tc("stageChangedTo", { stage: deal.stage }),
      detail: tc("currentStageSince", { date: new Date(deal.stageChangedAt).toLocaleDateString("az-AZ") }),
    })
  }

  entries.forEach(e => {
    const details = typeof e.details === "string" ? JSON.parse(e.details || "{}") : (e.details || {})
    const config = ACTION_CONFIG[e.action] || ACTION_CONFIG.default

    let title = translateAction(e.action)
    let detail = ""

    if (details.field) {
      title = tc("fieldChanged", { field: details.field })
      detail = `${details.oldValue || "—"} → ${details.newValue || "—"}`
    } else if (details.message) {
      detail = details.message
    }

    timeline.push({
      id: e.id,
      date: e.createdAt,
      ...config,
      title,
      detail: detail || (e.userName ? tc("by", { name: e.userName }) : ""),
    })
  })

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (timeline.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{tc("noHistory")}</p>
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-1">
        {timeline.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.id} className="flex gap-3 relative">
              <div className={`relative z-10 h-10 w-10 rounded-full ${item.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-4 w-4 ${item.text}`} />
              </div>
              <div className="flex-1 pb-4">
                <div className="bg-card rounded-lg border p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium">{item.title}</p>
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(item.date)}</span>
                  </div>
                  {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
