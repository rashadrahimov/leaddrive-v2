"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MotionPage } from "@/components/ui/motion"
import {
  Shield, CheckCircle2, XCircle, Loader2, RefreshCw, ChevronDown, Inbox,
} from "lucide-react"
import { toast } from "sonner"

interface ShadowAction {
  id: string
  featureName: string
  entityType: string
  entityId: string
  actionType: string
  payload: any
  approved: boolean | null
  createdAt: string
}

type UrgencyLevel = "critical" | "high" | "normal"

function urgencyLevel(action: ShadowAction): UrgencyLevel {
  const p = action.payload as any || {}
  const feature = action.featureName.replace("ai_auto_", "").replace("_shadow", "")
  if (feature === "payment_reminder") {
    const days = p.daysOverdue || 0
    if (days >= 30) return "critical"
    if (days >= 7) return "high"
    return "normal"
  }
  if (feature === "acknowledge") {
    const percent = p.percentElapsed || 0
    if (percent >= 90) return "critical"
    if (percent >= 70) return "high"
    return "normal"
  }
  if (feature === "renewal") {
    const days = p.daysUntilEnd ?? 30
    if (days <= 7) return "critical"
    if (days <= 14) return "high"
    return "normal"
  }
  const days = p.daysSinceActivity || 0
  if (days >= 30) return "critical"
  if (days >= 14) return "high"
  return "normal"
}

function urgencyScore(action: ShadowAction): number {
  const level = urgencyLevel(action)
  const base = level === "critical" ? 3000 : level === "high" ? 2000 : 1000
  const p = action.payload as any || {}
  const feature = action.featureName.replace("ai_auto_", "").replace("_shadow", "")
  let secondary = 0
  if (feature === "payment_reminder") secondary = (p.daysOverdue || 0) * 5 + (p.amount || 0) * 0.001
  else if (feature === "acknowledge") secondary = p.percentElapsed || 0
  else if (feature === "renewal") secondary = Math.max(0, 30 - (p.daysUntilEnd ?? 30)) * 10 + (p.proposedValue || 0) * 0.001
  else secondary = p.daysSinceActivity || 0
  return base + secondary
}

function getShadowDetail(action: ShadowAction, t: (key: string, vars?: any) => string): string {
  const feature = action.featureName.replace("ai_auto_", "").replace("_shadow", "")
  if (feature === "payment_reminder") return t("shadowPaymentDetail")
  if (feature === "acknowledge") return t("shadowAckDetail")
  if (feature === "renewal") return t("shadowRenewalDetail")
  return t("shadowFollowupDetail")
}

function getShadowInfo(action: ShadowAction, t: (key: string, vars?: any) => string) {
  const p = action.payload as any || {}
  const feature = action.featureName.replace("ai_auto_", "").replace("_shadow", "")

  if (feature === "payment_reminder") {
    return {
      label: t("shadowPaymentLabel"),
      badgeBg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      borderColor: "border-l-red-500",
      entityLabel: t("shadowInvoiceEntity"),
      title: `${p.invoiceNumber || t("shadowInvoiceEntity")} — $${(p.amount || 0).toLocaleString()}`,
      reason: t("shadowPaymentReason", { days: p.daysOverdue || 0 }) + (p.companyName ? ` · ${p.companyName}` : ""),
    }
  }
  if (feature === "acknowledge") {
    return {
      label: t("shadowAcknowledgeLabel"),
      badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      borderColor: "border-l-amber-500",
      entityLabel: t("shadowTicketEntity"),
      title: p.ticketNumber || t("shadowTicketEntity"),
      reason: t("shadowAcknowledgeReason", { percent: p.percentElapsed || 0 }),
    }
  }
  if (feature === "renewal") {
    const currency = p.currency || "USD"
    const currentValue = Number(p.currentValue || 0)
    const proposedValue = Number(p.proposedValue || 0)
    const uplift = currentValue > 0 ? Math.round(((proposedValue - currentValue) / currentValue) * 100) : 0
    const upliftStr = uplift > 0 ? `+${uplift}%` : `${uplift}%`
    return {
      label: t("shadowRenewalLabel"),
      badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      borderColor: "border-l-emerald-500",
      entityLabel: t("shadowContractEntity"),
      title: `${p.companyName || p.contractNumber || t("shadowContractEntity")} — ${proposedValue.toLocaleString()} ${currency}`,
      reason: t("shadowRenewalReason", { days: p.daysUntilEnd ?? 0, uplift: upliftStr }),
    }
  }
  return {
    label: t("shadowFollowupLabel"),
    badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    borderColor: "border-l-blue-500",
    entityLabel: t("shadowDealEntity"),
    title: p.title || action.entityId,
    reason: t("shadowFollowupReason", { days: p.daysSinceActivity || 0 }),
  }
}

function timeAgo(dateStr: string, t: (key: string, vars?: any) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t("timeAgoJustNow")
  if (mins < 60) return t("timeAgoMinutes", { m: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t("timeAgoHours", { h: hours })
  const days = Math.floor(hours / 24)
  return t("timeAgoDays", { d: days })
}

export default function AiActionsPage() {
  const { data: session } = useSession()
  const t = useTranslations("aiSettings")
  const tPage = useTranslations("aiActions")
  const orgId = (session?.user as any)?.organizationId
  const [shadowActions, setShadowActions] = useState<ShadowAction[]>([])
  const [shadowTotal, setShadowTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (orgId) headers["x-organization-id"] = orgId

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/ai-shadow-actions?status=pending&limit=50", { headers }).then(r => r.json()).catch(() => null)
      if (res?.data) {
        setShadowActions(res.data)
        setShadowTotal(res.pagination?.total || 0)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [orgId])

  const handleReviewWithUndo = (action: ShadowAction, decision: "approve" | "reject") => {
    setShadowActions(prev => prev.filter(a => a.id !== action.id))
    setShadowTotal(prev => Math.max(0, prev - 1))

    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (cancelled) return
      fetch("/api/v1/ai-shadow-actions", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ actionId: action.id, decision }),
      }).catch(() => {})
    }, 5000)

    const info = getShadowInfo(action, t)
    toast(decision === "approve" ? t("toastApproved") : t("toastRejected"), {
      description: info.title,
      duration: 5000,
      action: {
        label: t("toastUndo"),
        onClick: () => {
          cancelled = true
          clearTimeout(timeoutId)
          setShadowActions(prev => [action, ...prev])
          setShadowTotal(prev => prev + 1)
        },
      },
    })
  }

  const handleBulkWithUndo = (decision: "approve" | "reject") => {
    const items = [...shadowActions]
    if (items.length === 0) return
    setShadowActions([])
    setShadowTotal(prev => Math.max(0, prev - items.length))

    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (cancelled) return
      for (const a of items) {
        fetch("/api/v1/ai-shadow-actions", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ actionId: a.id, decision }),
        }).catch(() => {})
      }
    }, 5000)

    toast(t(decision === "approve" ? "toastApprovedAll" : "toastRejectedAll", { n: items.length }), {
      duration: 5000,
      action: {
        label: t("toastUndo"),
        onClick: () => {
          cancelled = true
          clearTimeout(timeoutId)
          setShadowActions(items)
          setShadowTotal(prev => prev + items.length)
        },
      },
    })
  }

  return (
    <MotionPage>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6" /> {tPage("title")}
            {shadowTotal > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">{shadowTotal} {t("pending")}</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{tPage("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {t("refresh")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> {t("shadowActions")}
            </CardTitle>
            {shadowActions.length > 0 && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs text-green-600 border-green-300 hover:bg-green-50"
                  onClick={() => handleBulkWithUndo("approve")}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {t("approveAll")}
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs text-red-500 border-red-300 hover:bg-red-50"
                  onClick={() => handleBulkWithUndo("reject")}>
                  <XCircle className="h-3 w-3 mr-1" /> {t("rejectAll")}
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("shadowActionsDesc")}</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : shadowActions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("noPendingShadow")}</p>
          ) : (
            <div className="space-y-2">
              {[...shadowActions].sort((a, b) => {
                const levelRank = (l: UrgencyLevel) => l === "critical" ? 3 : l === "high" ? 2 : 1
                const lv = levelRank(urgencyLevel(b)) - levelRank(urgencyLevel(a))
                if (lv !== 0) return lv
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              }).map(action => {
                const info = getShadowInfo(action, t)
                const urgency = urgencyLevel(action)
                const urgencyBadge = urgency === "critical"
                  ? { text: t("urgencyCritical"), cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
                  : urgency === "high"
                  ? { text: t("urgencyHigh"), cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" }
                  : null
                const isExpanded = expandedId === action.id
                return (
                  <div key={action.id} className={`flex items-start justify-between p-3.5 rounded-lg border-l-[3px] bg-card border border-border ${info.borderColor}`}>
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${info.badgeBg}`}>{info.label}</span>
                        <span className="text-[10px] text-muted-foreground">{info.entityLabel}</span>
                        {urgencyBadge && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${urgencyBadge.cls}`}>
                            {urgencyBadge.text}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{info.title}</p>
                      {info.reason && <p className="text-xs text-muted-foreground">{info.reason}</p>}
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] text-muted-foreground">{timeAgo(action.createdAt, t)}</p>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : action.id)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          {isExpanded ? t("shadowCollapse") : t("shadowExpand")}
                          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-border/60">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            {t("shadowDetailWhatHappens")}
                          </p>
                          <p className="text-xs text-foreground leading-relaxed">{getShadowDetail(action, t)}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs font-medium text-green-700 border-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400"
                        onClick={() => handleReviewWithUndo(action, "approve")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t("approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleReviewWithUndo(action, "reject")}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </MotionPage>
  )
}
