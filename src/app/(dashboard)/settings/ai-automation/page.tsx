"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MotionPage } from "@/components/ui/motion"
import {
  Bot, Sparkles, Shield, Eye, CheckCircle2, XCircle,
  Clock, Loader2, RefreshCw, ToggleLeft, ToggleRight,
} from "lucide-react"

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

interface AiFeature {
  key: string
  label: string
  description: string
  category: "analytics" | "copilot" | "autopilot"
  enabled: boolean
}

const AI_FEATURES: Omit<AiFeature, "enabled">[] = [
  { key: "ai_daily_briefing", label: "Daily Briefing", description: "Morning digest with stale deals, SLA risks, overdue invoices", category: "analytics" },
  { key: "ai_anomaly_detection", label: "Anomaly Detection", description: "Detect ticket spikes, large invoices, engagement drops", category: "analytics" },
  { key: "ai_lead_scoring", label: "Lead Scoring", description: "Enhanced scoring: email quality, title, source history, engagement", category: "analytics" },
  { key: "ai_auto_acknowledge_shadow", label: "Auto-Acknowledge (Shadow)", description: "Auto-respond to tickets approaching SLA — shadow mode", category: "autopilot" },
  { key: "ai_auto_followup_shadow", label: "Auto Follow-Up (Shadow)", description: "Create tasks for stale deals (>7 days no activity) — shadow mode", category: "autopilot" },
  { key: "ai_auto_payment_reminder_shadow", label: "Payment Reminders (Shadow)", description: "Enroll overdue invoices in reminder journey — shadow mode", category: "autopilot" },
  { key: "ai_auto_acknowledge", label: "Auto-Acknowledge (Live)", description: "Auto-respond to tickets — LIVE mode, sends real messages", category: "autopilot" },
  { key: "ai_auto_followup", label: "Auto Follow-Up (Live)", description: "Create tasks for stale deals — LIVE mode", category: "autopilot" },
  { key: "ai_auto_payment_reminder", label: "Payment Reminders (Live)", description: "Enroll overdue invoices — LIVE mode, sends real emails", category: "autopilot" },
]

const CATEGORY_LABELS = {
  analytics: { label: "Analytics", icon: Eye, color: "text-blue-600" },
  copilot: { label: "Copilot", icon: Sparkles, color: "text-violet-600" },
  autopilot: { label: "Autopilot", icon: Bot, color: "text-amber-600" },
}

export default function AiAutomationPage() {
  const { data: session } = useSession()
  const orgId = (session?.user as any)?.organizationId
  const [features, setFeatures] = useState<AiFeature[]>([])
  const [shadowActions, setShadowActions] = useState<ShadowAction[]>([])
  const [shadowTotal, setShadowTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (orgId) headers["x-organization-id"] = orgId

  const fetchData = async () => {
    setLoading(true)
    try {
      const [featuresRes, shadowRes] = await Promise.all([
        fetch("/api/v1/settings/ai-features", { headers }).then(r => r.json()).catch(() => null),
        fetch("/api/v1/ai-shadow-actions?status=pending&limit=20", { headers }).then(r => r.json()).catch(() => null),
      ])

      const orgFeatures: string[] = Array.isArray(featuresRes?.data?.features) ? featuresRes.data.features : []
      setFeatures(AI_FEATURES.map(f => ({ ...f, enabled: orgFeatures.includes(f.key) })))

      if (shadowRes?.data) {
        setShadowActions(shadowRes.data)
        setShadowTotal(shadowRes.pagination?.total || 0)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [orgId])

  const toggleFeature = async (key: string, currentlyEnabled: boolean) => {
    setToggling(key)
    try {
      const action = currentlyEnabled ? "remove" : "add"
      await fetch("/api/v1/settings/ai-features", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ feature: key, action }),
      })
      setFeatures(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f))
    } catch {}
    setToggling(null)
  }

  const reviewAction = async (actionId: string, decision: "approve" | "reject") => {
    setReviewing(actionId)
    try {
      await fetch("/api/v1/ai-shadow-actions", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ actionId, decision }),
      })
      setShadowActions(prev => prev.filter(a => a.id !== actionId))
      setShadowTotal(prev => Math.max(0, prev - 1))
    } catch {}
    setReviewing(null)
  }

  if (loading) {
    return (
      <MotionPage>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MotionPage>
    )
  }

  const grouped = {
    analytics: features.filter(f => f.category === "analytics"),
    copilot: features.filter(f => f.category === "copilot"),
    autopilot: features.filter(f => f.category === "autopilot"),
  }

  return (
    <MotionPage>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" /> AI Automation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage AI features, review shadow actions, control automation behavior
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-6 mb-8">
        {(Object.entries(grouped) as [keyof typeof CATEGORY_LABELS, AiFeature[]][]).map(([cat, items]) => {
          if (items.length === 0) return null
          const { label, icon: Icon, color } = CATEGORY_LABELS[cat]
          return (
            <div key={cat}>
              <h2 className={`text-sm font-semibold flex items-center gap-1.5 mb-3 ${color}`}>
                <Icon className="h-4 w-4" /> {label}
              </h2>
              <div className="grid gap-2">
                {items.map(f => (
                  <div
                    key={f.key}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      f.enabled ? "bg-card border-border" : "bg-muted/30 border-transparent"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                    <button
                      onClick={() => toggleFeature(f.key, f.enabled)}
                      disabled={toggling === f.key}
                      className="shrink-0 ml-4"
                    >
                      {toggling === f.key ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : f.enabled ? (
                        <ToggleRight className="h-6 w-6 text-primary" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Shadow Actions Review */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Shadow Actions
              {shadowTotal > 0 && (
                <Badge variant="secondary" className="text-xs">{shadowTotal} pending</Badge>
              )}
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Actions AI would take — review and approve before enabling live mode
          </p>
        </CardHeader>
        <CardContent>
          {shadowActions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending shadow actions</p>
          ) : (
            <div className="space-y-2">
              {shadowActions.map(action => (
                <div key={action.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{action.featureName.replace("ai_auto_", "")}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{action.actionType}</Badge>
                      <span className="text-[10px] text-muted-foreground">{action.entityType}</span>
                    </div>
                    <p className="text-xs text-foreground/80">
                      {formatPayload(action.payload)}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(action.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => reviewAction(action.id, "approve")}
                      disabled={reviewing === action.id}
                    >
                      {reviewing === action.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => reviewAction(action.id, "reject")}
                      disabled={reviewing === action.id}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MotionPage>
  )
}

function formatPayload(payload: any): string {
  if (!payload) return "—"
  if (payload.title) return payload.title
  if (payload.message) return payload.message.slice(0, 80) + (payload.message.length > 80 ? "..." : "")
  if (payload.invoiceNumber) return `Invoice ${payload.invoiceNumber} — $${payload.amount || 0} (${payload.daysOverdue || 0}d overdue)`
  return JSON.stringify(payload).slice(0, 80)
}
