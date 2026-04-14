"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MotionPage } from "@/components/ui/motion"
import {
  Bot, Sparkles, Shield, Eye, CheckCircle2, XCircle,
  Clock, Loader2, RefreshCw, ToggleLeft, ToggleRight,
  Mail, Send, MessageSquare,
} from "lucide-react"
import { useAutoTour } from "@/components/tour/tour-provider"
import { TourReplayButton } from "@/components/tour/tour-replay-button"

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

const AI_FEATURE_KEYS: { key: string; labelKey: string; descKey: string; category: "analytics" | "copilot" | "autopilot" }[] = [
  { key: "ai_daily_briefing", labelKey: "dailyBriefing", descKey: "dailyBriefingDesc", category: "analytics" },
  { key: "ai_anomaly_detection", labelKey: "anomalyDetection", descKey: "anomalyDetectionDesc", category: "analytics" },
  { key: "ai_lead_scoring", labelKey: "leadScoring", descKey: "leadScoringDesc", category: "analytics" },
  { key: "ai_auto_acknowledge_shadow", labelKey: "autoAcknowledgeShadow", descKey: "autoAcknowledgeShadowDesc", category: "autopilot" },
  { key: "ai_auto_followup_shadow", labelKey: "autoFollowupShadow", descKey: "autoFollowupShadowDesc", category: "autopilot" },
  { key: "ai_auto_payment_reminder_shadow", labelKey: "paymentReminderShadow", descKey: "paymentReminderShadowDesc", category: "autopilot" },
  { key: "ai_auto_acknowledge", labelKey: "autoAcknowledgeLive", descKey: "autoAcknowledgeLiveDesc", category: "autopilot" },
  { key: "ai_auto_followup", labelKey: "autoFollowupLive", descKey: "autoFollowupLiveDesc", category: "autopilot" },
  { key: "ai_auto_payment_reminder", labelKey: "paymentReminderLive", descKey: "paymentReminderLiveDesc", category: "autopilot" },
]

export default function AiAutomationPage() {
  const { data: session } = useSession()
  const t = useTranslations("aiSettings")
  useAutoTour("aiAutomation")
  const orgId = (session?.user as any)?.organizationId
  const [features, setFeatures] = useState<AiFeature[]>([])
  const [shadowActions, setShadowActions] = useState<ShadowAction[]>([])
  const [shadowTotal, setShadowTotal] = useState(0)
  const [budget, setBudget] = useState<{ spent: number; limit: number; remaining: number } | null>(null)
  const [budgetLimit, setBudgetLimit] = useState("")
  const [savingBudget, setSavingBudget] = useState(false)
  const [delivery, setDelivery] = useState({ telegramBotToken: "", telegramChatId: "", slackWebhookUrl: "", language: "ru" })
  const [savingDelivery, setSavingDelivery] = useState(false)
  const [deliverySaved, setDeliverySaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (orgId) headers["x-organization-id"] = orgId

  const fetchData = async () => {
    setLoading(true)
    try {
      const [featuresRes, shadowRes, budgetRes, deliveryRes] = await Promise.all([
        fetch("/api/v1/settings/ai-features", { headers }).then(r => r.json()).catch(() => null),
        fetch("/api/v1/ai-shadow-actions?status=pending&limit=20", { headers }).then(r => r.json()).catch(() => null),
        fetch("/api/v1/settings/ai-budget", { headers }).then(r => r.json()).catch(() => null),
        fetch("/api/v1/settings/ai-delivery", { headers }).then(r => r.json()).catch(() => null),
      ])

      const orgFeatures: string[] = Array.isArray(featuresRes?.data?.features) ? featuresRes.data.features : []
      setFeatures(AI_FEATURE_KEYS.map(f => ({
        key: f.key,
        label: t(f.labelKey),
        description: t(f.descKey),
        category: f.category,
        enabled: orgFeatures.includes(f.key),
      })))

      if (shadowRes?.data) {
        setShadowActions(shadowRes.data)
        setShadowTotal(shadowRes.pagination?.total || 0)
      }

      if (budgetRes?.data) {
        setBudget(budgetRes.data)
        setBudgetLimit(String(budgetRes.data.limit))
      }

      if (deliveryRes?.data) {
        setDelivery(d => ({ ...d, ...deliveryRes.data }))
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

  const saveBudgetLimit = async () => {
    const val = parseFloat(budgetLimit)
    if (isNaN(val) || val <= 0) return
    setSavingBudget(true)
    try {
      await fetch("/api/v1/settings/ai-budget", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ limit: val }),
      })
      setBudget(prev => prev ? { ...prev, limit: val, remaining: Math.max(0, val - prev.spent) } : prev)
    } catch {}
    setSavingBudget(false)
  }

  const saveDelivery = async () => {
    setSavingDelivery(true)
    setDeliverySaved(false)
    try {
      await fetch("/api/v1/settings/ai-delivery", {
        method: "PATCH",
        headers,
        body: JSON.stringify(delivery),
      })
      setDeliverySaved(true)
      setTimeout(() => setDeliverySaved(false), 3000)
    } catch {}
    setSavingDelivery(false)
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
            <Bot className="h-6 w-6" /> {t("title")} <TourReplayButton tourId="aiAutomation" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {t("refresh")}
        </Button>
      </div>

      {/* Budget Card */}
      {budget && (
        <Card data-tour-id="ai-budget" className="mb-6">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet-500" /> {t("budgetTitle")}
              </h3>
              <Badge variant={budget.spent >= budget.limit ? "destructive" : budget.spent >= budget.limit * 0.8 ? "secondary" : "outline"} className="text-xs">
                ${budget.spent.toFixed(3)} / ${budget.limit.toFixed(2)}
              </Badge>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${
                  budget.spent >= budget.limit ? "bg-red-500" : budget.spent >= budget.limit * 0.8 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, (budget.spent / budget.limit) * 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">{t("dailyLimit")}: $</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={budgetLimit}
                onChange={e => setBudgetLimit(e.target.value)}
                className="h-7 w-20 text-xs border rounded px-2 bg-background"
              />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={saveBudgetLimit} disabled={savingBudget}>
                {savingBudget ? "..." : t("save")}
              </Button>
              <span className="text-[10px] text-muted-foreground ml-auto">{t("budgetRemaining")}: ${budget.remaining.toFixed(3)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Channels */}
      <Card data-tour-id="ai-delivery" className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" /> {t("deliveryChannels")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("deliveryChannelsDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/30">
            <Mail className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground">{t("emailDeliveryDesc")}</p>
            </div>
            <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">{t("automatic")}</Badge>
          </div>

          {/* Telegram */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-sm font-medium">Telegram</span>
              {delivery.telegramBotToken && delivery.telegramChatId && (
                <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">{t("configured")}</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Bot Token"
                value={delivery.telegramBotToken}
                onChange={e => setDelivery(d => ({ ...d, telegramBotToken: e.target.value }))}
                className="h-8 text-xs border rounded px-2 bg-background"
              />
              <input
                type="text"
                placeholder="Chat ID"
                value={delivery.telegramChatId}
                onChange={e => setDelivery(d => ({ ...d, telegramChatId: e.target.value }))}
                className="h-8 text-xs border rounded px-2 bg-background"
              />
            </div>
          </div>

          {/* Slack */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-sm font-medium">Slack</span>
              {delivery.slackWebhookUrl && (
                <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">{t("configured")}</Badge>
              )}
            </div>
            <input
              type="text"
              placeholder="Webhook URL (https://hooks.slack.com/...)"
              value={delivery.slackWebhookUrl}
              onChange={e => setDelivery(d => ({ ...d, slackWebhookUrl: e.target.value }))}
              className="h-8 w-full text-xs border rounded px-2 bg-background"
            />
          </div>

          {/* Language */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{t("briefingLanguage")}:</span>
            <select
              value={delivery.language}
              onChange={e => setDelivery(d => ({ ...d, language: e.target.value }))}
              className="h-8 text-xs border rounded px-2 bg-background"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="az">Azərbaycan</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={saveDelivery} disabled={savingDelivery}>
              {savingDelivery ? "..." : t("save")}
            </Button>
            {deliverySaved && <span className="text-xs text-green-600">{t("saved")}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <div data-tour-id="ai-toggles" className="space-y-6 mb-8">
        {(Object.entries(grouped) as [string, AiFeature[]][]).map(([cat, items]) => {
          if (items.length === 0) return null
          const catConfig: Record<string, { icon: any; color: string }> = {
            analytics: { icon: Eye, color: "text-blue-600" },
            copilot: { icon: Sparkles, color: "text-violet-600" },
            autopilot: { icon: Bot, color: "text-amber-600" },
          }
          const { icon: Icon, color } = catConfig[cat] || catConfig.analytics
          const label = t(cat as any)
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
              <Shield className="h-4 w-4" /> {t("shadowActions")}
              {shadowTotal > 0 && (
                <Badge variant="secondary" className="text-xs">{shadowTotal} {t("pending")}</Badge>
              )}
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("shadowActionsDesc")}
          </p>
        </CardHeader>
        <CardContent>
          {shadowActions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t("noPendingShadow")}</p>
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
