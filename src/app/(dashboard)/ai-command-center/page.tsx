"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/data-table"
import { AiConfigForm } from "@/components/ai-config-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { cn } from "@/lib/utils"
import { InfoHint } from "@/components/info-hint"
import { PageDescription } from "@/components/page-description"
import {
  Zap, TrendingUp, Clock, Plus, Pencil, Trash2,
  MessageSquare, ShieldCheck, Timer, DollarSign,
  Activity, AlertTriangle, Gauge, Star, BrainCircuit,
  Settings2, PlusCircle, Bell, ScrollText, Shield,
  X, Bot, User, Eye, CheckCircle, Sparkles, Power,
} from "lucide-react"

interface AgentConfig {
  id: string
  configName: string
  model: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  toolsEnabled?: string[]
  kbEnabled?: boolean
  kbMaxArticles?: number
  escalationEnabled?: boolean
  isActive: boolean
  version: number
  notes: string | null
  // Multi-agent orchestration
  agentType?: string
  department?: string
  priority?: number
  handoffTargets?: string[]
  intents?: string[]
  greeting?: string
  maxToolRounds?: number
}

interface ChatSession {
  id: string
  messagesCount: number
  status: string
  createdAt: string
  companyId: string | null
  portalUserId: string | null
}

interface ChatMessage {
  id: string
  role: string
  content: string
  tokenCount: number | null
  createdAt: string
}

interface AiStats {
  totalSessions: number
  activeSessions: number
  deflectionRate: number
  csat: number
  fcrRate: number
  avgResolutionTime: number
  totalMessages: number
  avgMessagesPerSession: number
  escalations: number
  avgLatency: number
  totalCost: number
  qualityScore: number
  totalTokens: number
}

interface AiAlert {
  id: string
  type: string
  severity: string
  message: string
  sessionId: string | null
  metadata: any
  isRead: boolean
  createdAt: string
}

interface InteractionLog {
  id: string
  sessionId: string | null
  userMessage: string
  aiResponse: string
  latencyMs: number | null
  promptTokens: number | null
  completionTokens: number | null
  costUsd: number | null
  model: string | null
  toolsCalled: string[]
  kbArticlesUsed: string[]
  qualityScore: number | null
  isCopilot: boolean
  createdAt: string
}

interface Guardrail {
  id: string
  ruleName: string
  ruleType: string
  description: string | null
  promptInjection: string | null
  isActive: boolean
  createdAt: string
}

type TabId = "dashboard" | "constructor"

function getModelLabel(model: string): { name: string; speed: string; color: string } {
  if (model.includes("opus")) return { name: "Claude Opus 4.6", speed: "Мощный", color: "text-purple-600" }
  if (model.includes("sonnet")) return { name: "Claude Sonnet 4.6", speed: "Сбалансированный", color: "text-blue-600" }
  return { name: "Claude Haiku 4.5", speed: "Быстрый", color: "text-emerald-600" }
}

const TOOL_COLORS: Record<string, string> = {
  get_tickets: "bg-primary/5 text-primary border-primary/20",
  create_ticket: "bg-green-50 text-green-700 border-green-200",
  escalate: "bg-red-50 text-red-700 border-red-200",
  escalate_to_human: "bg-red-50 text-red-700 border-red-200",
  contracts: "bg-[hsl(var(--ai-from))]/5 text-[hsl(var(--ai-from))] border-[hsl(var(--ai-from))]/20",
  documents: "bg-amber-50 text-amber-700 border-amber-200",
}

function getToolColor(tool: string): string {
  const key = Object.keys(TOOL_COLORS).find(k => tool.toLowerCase().includes(k))
  return key ? TOOL_COLORS[key] : "bg-muted text-foreground/70 border-border"
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function AICommandCenterPage() {
  const { data: session } = useSession()
  const t = useTranslations("ai")
  const tc = useTranslations("common")
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [stats, setStats] = useState<AiStats | null>(null)
  const [alerts, setAlerts] = useState<AiAlert[]>([])
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [logs, setLogs] = useState<InteractionLog[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<InteractionLog | null>(null)
  const [guardrails, setGuardrails] = useState<Guardrail[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<AgentConfig | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)
  const [handoffs, setHandoffs] = useState<any[]>([])
  const [intentDistribution, setIntentDistribution] = useState<any[]>([])
  const [agentMetrics, setAgentMetrics] = useState<Record<string, any>>({})

  // Constructor state
  const [newGuardrailName, setNewGuardrailName] = useState("")
  const [newGuardrailDesc, setNewGuardrailDesc] = useState("")
  const [newGuardrailPrompt, setNewGuardrailPrompt] = useState("")

  const orgId = session?.user?.organizationId

  const hdrs = (): Record<string, string> =>
    orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>

  const fetchData = async () => {
    try {
      const [agentsRes, sessionsRes, statsRes, alertsRes, logsRes, guardrailsRes] = await Promise.all([
        fetch("/api/v1/ai-configs", { headers: hdrs() }).then(r => r.json()).catch(() => ({ success: false })),
        fetch("/api/v1/ai-sessions", { headers: hdrs() }).then(r => r.json()).catch(() => ({ success: false })),
        fetch("/api/v1/ai-sessions/stats", { headers: hdrs() }).then(r => r.json()).catch(() => ({ success: false })),
        fetch("/api/v1/ai-alerts", { headers: hdrs() }).then(r => r.json()).catch(() => ({ success: false })),
        fetch("/api/v1/ai-interaction-logs?limit=50", { headers: hdrs() }).then(r => r.json()).catch(() => ({ success: false })),
        fetch("/api/v1/ai-guardrails", { headers: hdrs() }).then(r => r.json()).catch(() => ({ success: false })),
      ])
      if (agentsRes.success) setAgents(agentsRes.data?.configs || [])
      if (sessionsRes.success) setSessions(sessionsRes.data?.sessions || [])
      if (statsRes.success) setStats(statsRes.data)
      if (alertsRes.success) {
        setAlerts(alertsRes.data?.alerts || [])
        setUnreadAlerts(alertsRes.data?.unreadCount || 0)
      }
      if (logsRes.success) {
        setLogs(logsRes.data?.logs || [])
        setLogsTotal(logsRes.data?.total || 0)
      }
      if (guardrailsRes.success) setGuardrails(guardrailsRes.data?.guardrails || [])

      // Fetch handoffs and intent distribution
      fetch("/api/v1/ai-configs/stats", { headers: hdrs() })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setHandoffs(data.data?.handoffs || [])
            setIntentDistribution(data.data?.intentDistribution || [])
            const metricsMap: Record<string, any> = {}
            for (const a of (data.data?.agents || [])) {
              metricsMap[a.id] = a
            }
            setAgentMetrics(metricsMap)
          }
        })
        .catch(() => {})
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/ai-configs/${deleteId}`, { method: "DELETE", headers: hdrs() })
    fetchData()
  }

  const handleActivate = async (id: string) => {
    await fetch(`/api/v1/ai-configs/${id}`, {
      method: "PUT",
      headers: { ...hdrs(), "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    })
    fetchData()
  }

  const handleMarkAllRead = async () => {
    await fetch("/api/v1/ai-alerts", {
      method: "POST",
      headers: { ...hdrs(), "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    })
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
    setUnreadAlerts(0)
  }

  const handleViewSession = async (id: string) => {
    setSelectedSession(id)
    setSessionLoading(true)
    try {
      const res = await fetch(`/api/v1/ai-sessions/${id}`, { headers: hdrs() })
      const json = await res.json()
      if (json.success) setSessionMessages(json.data.session.messages || [])
    } catch (err) { console.error(err) } finally { setSessionLoading(false) }
  }

  const handleAddGuardrail = async () => {
    if (!newGuardrailName.trim()) return
    const res = await fetch("/api/v1/ai-guardrails", {
      method: "POST",
      headers: { ...hdrs(), "Content-Type": "application/json" },
      body: JSON.stringify({
        ruleName: newGuardrailName.trim(),
        description: newGuardrailDesc.trim(),
        promptInjection: newGuardrailPrompt.trim(),
      }),
    })
    const json = await res.json()
    if (json.success) {
      setGuardrails(prev => [json.data, ...prev])
      setNewGuardrailName("")
      setNewGuardrailDesc("")
      setNewGuardrailPrompt("")
    }
  }

  const handleDeleteGuardrail = async (id: string) => {
    await fetch(`/api/v1/ai-guardrails?id=${id}`, { method: "DELETE", headers: hdrs() })
    setGuardrails(prev => prev.filter(g => g.id !== id))
  }

  const sessionColumns = [
    { key: "id", label: t("sessions"), render: (item: any) => <span className="font-mono text-xs">{item.id?.slice(0, 8)}...</span> },
    { key: "messagesCount", label: t("messages"), sortable: true },
    {
      key: "status", label: tc("status"), sortable: true,
      render: (item: any) => (
        <Badge variant={item.status === "active" ? "default" : item.status === "escalated" ? "destructive" : "secondary"}>
          {item.status === "active" ? tc("active") : item.status === "resolved" ? tc("resolved") : item.status === "escalated" ? t("escalations") : item.status}
        </Badge>
      ),
    },
    {
      key: "createdAt", label: tc("date"), sortable: true,
      render: (item: any) => <span>{new Date(item.createdAt).toLocaleDateString(undefined)}</span>,
    },
    {
      key: "actions", label: "",
      render: (item: any) => (
        <Button variant="ghost" size="sm" onClick={() => handleViewSession(item.id)}>
          <Eye className="h-3.5 w-3.5 mr-1" /> {tc("details")}
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  const deflectionRate = stats?.deflectionRate || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))] flex items-center justify-center shadow-lg ai-glow">
            <BrainCircuit className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-700">Агент онлайн</span>
          </div>
          <span className="ai-pulse-dot" title="AI Active" />
        </div>
      </div>

      <PageDescription text={t("pageDescription")} />

      {/* Tabs — large, v1-style */}
      <div className="grid grid-cols-2 gap-0 rounded-xl overflow-hidden border">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={cn(
            "py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "dashboard"
              ? "bg-gradient-to-r from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))] text-white shadow-inner"
              : "bg-card hover:bg-muted text-muted-foreground"
          )}
        >
          <Activity className="h-4 w-4" /> Dashboard <InfoHint text={t("hintTabDashboard")} size={12} />
        </button>
        <button
          onClick={() => setActiveTab("constructor")}
          className={cn(
            "py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "constructor"
              ? "bg-gradient-to-r from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))] text-white shadow-inner"
              : "bg-card hover:bg-muted text-muted-foreground"
          )}
        >
          <Settings2 className="h-4 w-4" /> Agent Constructor <InfoHint text={t("hintTabAgentConstructor")} size={12} />
        </button>
      </div>

      {/* ═══ DASHBOARD TAB ═══ */}
      {activeTab === "dashboard" && (
        <>
          {/* KPI Row 1 — 4 cards with colorful icons */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Sessions */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">{t("totalSessions")} <InfoHint text={t("hintTotalSessions")} size={12} /></p>
                  <p className="text-3xl font-bold mt-1">{stats?.totalSessions || 0}</p>
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">{tc("today")}: {stats?.activeSessions || 0} <InfoHint text={t("hintActiveSessions")} size={12} /></p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>

            {/* Deflection */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">{t("deflectionRate")} <InfoHint text={t("hintDeflectionRate")} size={12} /></p>
                  <p className={cn("text-3xl font-bold mt-1", deflectionRate > 50 ? "text-green-600" : deflectionRate > 20 ? "text-amber-500" : "text-foreground")}>
                    {deflectionRate.toFixed(1)}%
                  </p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", deflectionRate > 50 ? "bg-amber-400" : "bg-blue-400")}
                      style={{ width: `${Math.min(deflectionRate, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center ml-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </div>

            {/* CSAT */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">CSAT <InfoHint text={t("hintCsat")} size={12} /></p>
                  <p className="text-3xl font-bold mt-1">
                    {stats?.csat ? <>{stats.csat}<span className="text-lg text-muted-foreground">/5</span></> : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Ср. удовлетворенность</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* FCR */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">{t("fcrRate")} <InfoHint text={t("hintFcr")} size={12} /></p>
                  <p className={cn("text-3xl font-bold mt-1", (stats?.fcrRate || 0) > 0 ? "text-green-600" : "")}>
                    {stats?.fcrRate || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Решено с первого раза</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-pink-50 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-pink-500" />
                </div>
              </div>
            </div>
          </div>

          {/* KPI Row 2 — 3x2 with round icons */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Avg resolution time */}
            <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">{t("avgResolutionTime")} <InfoHint text={t("hintAvgResolution")} size={12} /></p>
                <p className="text-2xl font-bold">{stats?.avgResolutionTime || 0} <span className="text-sm font-normal text-muted-foreground">{t("min")}</span></p>
              </div>
            </div>

            {/* Total messages */}
            <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4 ai-gradient-border">
              <div className="h-12 w-12 rounded-full bg-[hsl(var(--ai-from))]/10 flex items-center justify-center flex-shrink-0">
                <Activity className="h-5 w-5 text-[hsl(var(--ai-from))]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("totalMessages")}</p>
                <p className="text-2xl font-bold">{stats?.totalMessages || 0} <span className="text-sm font-normal text-muted-foreground">ср. {stats?.avgMessagesPerSession || 0}/сессия</span></p>
              </div>
            </div>

            {/* Escalations */}
            <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4 ai-gradient-border">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("escalations")}</p>
                <p className="text-2xl font-bold">{stats?.escalations || 0} <span className="text-sm font-normal text-muted-foreground">к агентам</span></p>
              </div>
            </div>

            {/* Avg latency */}
            <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4 ai-gradient-border">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("avgLatency")}</p>
                <p className="text-2xl font-bold">{stats?.avgLatency || 0}<span className="text-sm font-normal text-muted-foreground">s</span></p>
              </div>
            </div>

            {/* Total cost */}
            <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4 ai-gradient-border">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("totalCost")}</p>
                <p className="text-2xl font-bold text-green-600">${stats?.totalCost?.toFixed(3) || "0.000"}</p>
              </div>
            </div>

            {/* Quality */}
            <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4 ai-gradient-border">
              <div className="h-12 w-12 rounded-full bg-[hsl(var(--ai-to))]/10 flex items-center justify-center flex-shrink-0">
                <Gauge className="h-5 w-5 text-[hsl(var(--ai-to))]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("qualityScore")}</p>
                <p className="text-2xl font-bold">{stats?.qualityScore || 0}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
              </div>
            </div>
          </div>

          {/* Alerts Section */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold">{t("alerts")}</h3>
                {unreadAlerts > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">{unreadAlerts}</span>
                )}
              </div>
              {unreadAlerts > 0 && (
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleMarkAllRead}>
                  {t("markRead")}
                </Button>
              )}
            </div>
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {alerts.length > 0 ? alerts.map(alert => (
                <div key={alert.id} className={cn("flex items-center gap-4 p-4", !alert.isRead && "bg-amber-50/50")}>
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                    alert.type === "token_spike" ? "bg-amber-100" : alert.type === "high_latency" ? "bg-amber-100" : "bg-red-100"
                  )}>
                    <AlertTriangle className={cn("h-5 w-5", alert.severity === "critical" ? "text-red-500" : "text-amber-500")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {alert.type === "token_spike" ? "Token Spike" : alert.type === "high_latency" ? "High Latency" : alert.type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{timeAgo(alert.createdAt)}</p>
                    {alert.sessionId && (
                      <button onClick={() => handleViewSession(alert.sessionId!)} className="text-xs text-primary hover:underline mt-0.5 flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Trace
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-muted-foreground text-sm">{t("noAlerts")}</div>
              )}
            </div>
          </div>

          {/* Sessions Table */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="p-5 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" /> Сессии за 7 дней <InfoHint text={t("hintTabSessions")} size={12} />
              </h3>
            </div>
            <div className="p-4">
              {sessions.length > 0 ? (
                <DataTable columns={sessionColumns} data={sessions} searchPlaceholder="Поиск сессий..." searchKey="id" pageSize={10} />
              ) : <div className="text-sm text-muted-foreground p-4 text-center">{t("noSessions")}</div>}
            </div>
          </div>

          {/* Logs Section — v1 style with trace details */}
          <div className="rounded-xl border bg-background shadow-sm">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-[hsl(var(--ai-from))]" /> Логи взаимодействий <InfoHint text={t("hintTabLogs")} size={12} />
                <span className="text-xs text-muted-foreground font-normal">({logsTotal} записей)</span>
              </h3>
            </div>
            <div className="divide-y max-h-[700px] overflow-y-auto">
              {logs.length > 0 ? logs.map((log, idx) => {
                const totalTokens = (log.promptTokens ?? 0) + (log.completionTokens ?? 0)
                const latencySec = log.latencyMs ? (log.latencyMs / 1000).toFixed(1) : null
                const isSelected = selectedLog?.id === log.id
                const kbCount = log.kbArticlesUsed?.length ?? 0
                const toolsCount = log.toolsCalled?.length ?? 0
                // Simulate cascade timing
                const kbTime = kbCount > 0 ? Math.round(log.latencyMs! * 0.02) : 0
                const llmTime = log.latencyMs ? log.latencyMs - kbTime : 0

                return (
                  <div key={log.id} className="hover:bg-muted/50 transition-colors">
                    {/* Compact row */}
                    <div className="p-4 cursor-pointer flex items-center gap-4" onClick={() => setSelectedLog(isSelected ? null : log)}>
                      <span className="text-xs text-muted-foreground font-mono w-8 shrink-0">#{logsTotal - idx}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{log.userMessage.slice(0, 100)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {log.model && <Badge variant="outline" className="text-[10px] font-mono">{log.model}</Badge>}
                        {latencySec && (
                          <span className={cn(
                            "text-xs font-mono font-bold",
                            log.latencyMs! > 10000 ? "text-red-500" : log.latencyMs! > 5000 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            {latencySec}s
                          </span>
                        )}
                        {log.costUsd != null && <span className="text-xs font-mono text-muted-foreground">${log.costUsd.toFixed(4)}</span>}
                        {totalTokens > 0 && <span className="text-xs font-mono text-muted-foreground">{totalTokens} tok</span>}
                        <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString(undefined)}</span>
                        <Eye className={cn("h-4 w-4 transition-transform", isSelected ? "text-[hsl(var(--ai-from))] rotate-180" : "text-muted-foreground")} />
                      </div>
                    </div>

                  </div>
                )
              }) : (
                <div className="p-8 text-center text-muted-foreground text-sm">Нет логов</div>
              )}
            </div>
          </div>

          {/* Trace Detail Modal */}
          {selectedLog && (() => {
            const totalTokens = (selectedLog.promptTokens ?? 0) + (selectedLog.completionTokens ?? 0)
            const latencySec = selectedLog.latencyMs ? (selectedLog.latencyMs / 1000).toFixed(1) : null
            const kbCount = selectedLog.kbArticlesUsed?.length ?? 0
            const toolsCount = selectedLog.toolsCalled?.length ?? 0
            const kbTime = kbCount > 0 ? Math.round(selectedLog.latencyMs! * 0.02) : 0
            const llmTime = selectedLog.latencyMs ? selectedLog.latencyMs - kbTime : 0
            const logIndex = logs.findIndex(l => l.id === selectedLog.id)

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
                <div className="bg-background rounded-xl shadow-2xl border max-w-3xl w-full max-h-[85vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-background z-10 rounded-t-xl">
                    <div>
                      <h2 className="text-lg font-bold">Sessiya izləmə / Трассировка #{logIndex >= 0 ? logsTotal - logIndex : '?'}</h2>
                      <p className="text-xs text-muted-foreground">{new Date(selectedLog.createdAt).toISOString()} · Model: {selectedLog.model}</p>
                    </div>
                    <button onClick={() => setSelectedLog(null)} className="p-2 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-5">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="rounded-lg border bg-background p-3 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Задержка</div>
                        <div className={cn("text-xl font-bold font-mono", selectedLog.latencyMs! > 10000 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400")}>{latencySec}s</div>
                        <div className="text-[10px] text-muted-foreground">{selectedLog.latencyMs} ms</div>
                      </div>
                      <div className="rounded-lg border bg-background p-3 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Токены</div>
                        <div className="text-xl font-bold font-mono text-primary">{totalTokens}</div>
                        <div className="text-[10px] text-muted-foreground">{selectedLog.promptTokens ?? 0} вход / {selectedLog.completionTokens ?? 0} выход</div>
                      </div>
                      <div className="rounded-lg border bg-background p-3 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Стоимость</div>
                        <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">${(selectedLog.costUsd ?? 0).toFixed(4)}</div>
                        <div className="text-[10px] text-muted-foreground">{selectedLog.model || "—"}</div>
                      </div>
                      <div className="rounded-lg border bg-background p-3 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Качество</div>
                        <div className="text-xl font-bold font-mono">{selectedLog.qualityScore != null ? `${selectedLog.qualityScore}/10` : "—"}</div>
                        <div className="text-[10px] text-muted-foreground">{selectedLog.qualityScore != null ? "Оценено" : "Не оценено"}</div>
                      </div>
                    </div>

                    {/* User query */}
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase">Запрос пользователя</span>
                      </div>
                      <p className="text-sm">{selectedLog.userMessage}</p>
                    </div>

                    {/* Processing cascade (timeline) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Каскад обработки</span>
                        <span className="text-[10px] text-muted-foreground">{(kbCount > 0 ? 2 : 1) + toolsCount} шагов · {latencySec}s</span>
                      </div>
                      <div className="h-6 rounded-full overflow-hidden flex bg-muted">
                        {kbCount > 0 && selectedLog.latencyMs && (
                          <div className="bg-emerald-500 flex items-center justify-center text-[9px] text-white font-mono" style={{ width: `${Math.max(5, (kbTime / selectedLog.latencyMs) * 100)}%` }}>
                            {kbTime}мс
                          </div>
                        )}
                        {toolsCount > 0 && (
                          <div className="bg-amber-500 flex items-center justify-center text-[9px] text-white font-mono" style={{ width: "8%" }}>
                            tools
                          </div>
                        )}
                        {selectedLog.latencyMs && (
                          <div className="bg-primary flex-1 flex items-center justify-center text-[9px] text-white font-mono">
                            {llmTime}мс
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-2">
                      {/* KB Search step */}
                      <div className="rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><ScrollText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Поиск по БЗ</span>
                            <span className="text-[10px] text-muted-foreground">(Поиск релевантных статей)</span>
                          </div>
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{kbTime} мс</span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Найдено: <strong>{kbCount}</strong></span>
                          <span>Выбрано: <strong>{kbCount}</strong></span>
                        </div>
                        {kbCount > 0 && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {selectedLog.kbArticlesUsed.map((a, i) => <Badge key={i} variant="outline" className="text-[9px] mr-1">{a}</Badge>)}
                          </div>
                        )}
                        {kbCount === 0 && <div className="mt-1 text-[10px] text-muted-foreground italic">Нет подходящих статей</div>}
                      </div>

                      {/* LLM Call step */}
                      <div className="rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-[hsl(var(--ai-from))]/10 flex items-center justify-center"><BrainCircuit className="h-4 w-4 text-[hsl(var(--ai-from))]" /></div>
                            <span className="text-sm font-semibold text-[hsl(var(--ai-from))]">Вызов LLM</span>
                            <span className="text-[10px] text-muted-foreground">(Запрос к Claude API)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-[hsl(var(--ai-from))] rounded-full" style={{ width: `${selectedLog.latencyMs ? Math.min(100, (llmTime / selectedLog.latencyMs) * 100) : 0}%` }} />
                            </div>
                            <span className="text-xs font-mono text-[hsl(var(--ai-from))]">{llmTime} мс</span>
                            <span className="text-[10px] text-muted-foreground">{selectedLog.latencyMs ? Math.round((llmTime / selectedLog.latencyMs) * 100) : 0}%</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Итерация: <strong>1</strong></span>
                          <span>Вход: <strong className="text-primary dark:text-primary">{selectedLog.promptTokens ?? 0} token</strong></span>
                          <span>Выход: <strong className="text-amber-600 dark:text-amber-400">{selectedLog.completionTokens ?? 0} token</strong></span>
                        </div>
                      </div>

                      {/* Tools step (if any) */}
                      {toolsCount > 0 && (
                        <div className="rounded-lg border bg-background p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
                              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Вызов инструментов</span>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {selectedLog.toolsCalled.map((tool, i) => <Badge key={i} variant="outline" className="text-[10px]">{tool}</Badge>)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Da Vinci Response */}
                    <div className="rounded-lg bg-muted border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="h-4 w-4 text-[hsl(var(--ai-from))]" />
                        <span className="text-xs font-semibold text-[hsl(var(--ai-from))] uppercase">Ответ Da Vinci</span>
                        {selectedLog.isCopilot && <Badge className="text-[9px] bg-[hsl(var(--ai-to))]/10 text-[hsl(var(--ai-to))]">Copilot</Badge>}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{selectedLog.aiResponse}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ═══ CONSTRUCTOR TAB ═══ */}
      {activeTab === "constructor" && (
        <>
          {/* Agent Config Cards — v1 style */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-[hsl(var(--ai-from))]" /> Конфигурации агента
                </h3>
                <p className="text-sm text-muted-foreground">Настройте модель, инструменты и поведение Da Vinci агента</p>
              </div>
              <Button onClick={() => { setEditData(undefined); setShowForm(true) }} className="bg-gradient-to-r from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))] hover:opacity-90 shadow-md">
                <Sparkles className="h-4 w-4 mr-2" /> Новая конфигурация
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {agents.map(agent => {
                const ml = getModelLabel(agent.model)
                const tools = agent.toolsEnabled || []
                return (
                  <div key={agent.id} className="rounded-xl p-6 shadow-sm space-y-4 ai-card">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center",
                          agent.isActive ? "bg-gradient-to-br from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))]" : "bg-muted"
                        )}>
                          {agent.isActive
                            ? <BrainCircuit className="h-6 w-6 text-white" />
                            : <Zap className="h-6 w-6 text-muted-foreground" />
                          }
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{agent.configName}</h4>
                          <p className="text-sm">
                            <span className="text-muted-foreground">{ml.name}</span>
                            <span className="mx-1.5">·</span>
                            <span className={ml.color}>{ml.speed}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">v{agent.version}</Badge>
                        {agent.isActive && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-xs font-medium text-green-700">{t("active").toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metrics chips */}
                    <div className="flex flex-wrap gap-2">
                      {agent.agentType && agent.agentType !== "general" && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-sm">
                          <Bot className="h-3.5 w-3.5 text-violet-500" />
                          <span className="text-foreground/70 capitalize">{agent.agentType}</span>
                        </div>
                      )}
                      {agent.intents && agent.intents.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-sm">
                          <span>🎯</span>
                          <span className="text-foreground/70">{agent.intents.length} intents</span>
                        </div>
                      )}
                      {(agent.priority ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-sm">
                          <span>⚡</span>
                          <span className="text-foreground/70">Priority: {agent.priority}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-sm">
                        <span className="text-orange-500">🔥</span>
                        <span className="text-foreground/70">Max {agent.maxTokens || 2048} токенов</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-sm">
                        <Settings2 className="h-3.5 w-3.5 text-primary" />
                        <span className="text-foreground/70">{tools.length} инструментов</span>
                      </div>
                      <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm",
                        agent.escalationEnabled !== false ? "bg-red-50 border-red-200" : "bg-muted border-border"
                      )}>
                        <span>{agent.escalationEnabled !== false ? "🔴" : "⚪"}</span>
                        <span className="text-foreground/70">Эскалация: {agent.escalationEnabled !== false ? "вкл" : "выкл"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-sm">
                        <span>📚</span>
                        <span className="text-foreground/70">KB: {agent.kbEnabled ? "вкл" : "выкл"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--ai-to))]/5 border border-[hsl(var(--ai-to))]/20 text-sm">
                        <span>🌡️</span>
                        <span className="text-foreground/70">{agent.temperature ?? 0.7}</span>
                      </div>
                    </div>

                    {/* Tools as colored chips */}
                    {tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tools.map(tool => (
                          <span key={tool} className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium", getToolColor(tool))}>
                            📄 {tool.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Per-agent metrics */}
                    {agentMetrics[agent.id] && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {agentMetrics[agent.id].totalInteractions} msgs
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${agentMetrics[agent.id].totalCost?.toFixed(4)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {agentMetrics[agent.id].avgLatencyMs}ms avg
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => { setEditData(agent); setShowForm(true) }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> {t("editAgent")}
                      </Button>
                      {!agent.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleActivate(agent.id)}
                        >
                          <Power className="h-3.5 w-3.5 mr-1.5" /> Активировать
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => { setDeleteId(agent.id); setDeleteName(agent.configName) }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {tc("delete")}
                      </Button>
                    </div>
                  </div>
                )
              })}
              {agents.length === 0 && (
                <div className="col-span-2 text-center py-12 text-muted-foreground rounded-xl border bg-card">
                  <BrainCircuit className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{t("noAgents")}</p>
                  <p className="text-sm mt-1">Создайте первого агента для начала работы</p>
                </div>
              )}
            </div>
          </div>

          {/* Handoff Log */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Activity className="h-4 w-4" /> Agent Handoffs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {handoffs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No handoffs recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {handoffs.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                      <div>
                        <span className="font-medium">{h.fromAgentName}</span>
                        <span className="text-muted-foreground mx-2">&rarr;</span>
                        <span className="font-medium">{h.toAgentName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{h.reason}</span>
                        <span>{new Date(h.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Intent Distribution */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" /> Intent Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {intentDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No intent data yet</p>
              ) : (
                <div className="space-y-2">
                  {intentDistribution.map((item: any, i: number) => {
                    const total = intentDistribution.reduce((s: number, x: any) => s + x.count, 0)
                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-24 capitalize">{item.agentType}</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm text-muted-foreground w-16 text-right">{item.count} ({pct}%)</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guardrails — Rules & Restrictions */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="text-red-500">🛡️</span> Правила и ограничения <InfoHint text={t("hintTabGuardrails")} size={12} />
                </h3>
                <p className="text-sm text-muted-foreground">Что агенту запрещено делать</p>
              </div>
              <Button size="sm" className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-sm" onClick={() => document.getElementById("guardrail-form")?.scrollIntoView({ behavior: "smooth" })}>
                <Plus className="h-4 w-4 mr-1" /> Новое правило
              </Button>
            </div>
            <div className="divide-y">
              {guardrails.length > 0 ? guardrails.map(g => (
                <div key={g.id} className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{g.ruleName}</p>
                    {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteGuardrail(g.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )) : (
                <div className="p-6 text-center text-muted-foreground text-sm">Нет правил</div>
              )}
            </div>
            {/* Add guardrail form */}
            <div id="guardrail-form" className="p-5 border-t bg-muted/50 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Добавить правило</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Название правила" value={newGuardrailName} onChange={e => setNewGuardrailName(e.target.value)} className="bg-card" />
                <Input placeholder="Описание (необязательно)" value={newGuardrailDesc} onChange={e => setNewGuardrailDesc(e.target.value)} className="bg-card" />
              </div>
              <Input placeholder="Промпт-инъекция для системного промпта" value={newGuardrailPrompt} onChange={e => setNewGuardrailPrompt(e.target.value)} className="bg-card" />
              <Button size="sm" onClick={handleAddGuardrail} disabled={!newGuardrailName.trim()} className="bg-gradient-to-r from-primary to-primary/80">
                <PlusCircle className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
          </div>

          {/* Da Vinci Config Generator */}
          <div className="rounded-xl bg-gradient-to-br from-[hsl(var(--ai-from))]/5 to-[hsl(var(--ai-to))]/5 border border-[hsl(var(--ai-to))]/20 p-8 text-center space-y-4 ai-glow">
            <Sparkles className="h-8 w-8 mx-auto text-[hsl(var(--ai-to))]" />
            <h3 className="font-bold text-lg">Создать конфигурацию по описанию</h3>
            <p className="text-sm text-muted-foreground">Опишите роль агента обычным текстом, и Da Vinci создаст конфигурацию автоматически</p>
            <div className="flex gap-3 max-w-xl mx-auto">
              <Input placeholder="Например: агент техподдержки, быстрые ответы, без сложных вопросов..." className="bg-card" />
              <Button className="bg-gradient-to-r from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))] hover:opacity-90 shadow-md flex-shrink-0">
                <Sparkles className="h-4 w-4 mr-1" /> Создать
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ═══ SESSION DETAIL MODAL ═══ */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSession(null)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-lg">Сессия {selectedSession.slice(0, 12)}...</h3>
                <p className="text-xs text-muted-foreground">{sessionMessages.length} сообщений</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {sessionLoading ? (
                <div className="text-center py-10 text-muted-foreground text-sm">Загрузка...</div>
              ) : sessionMessages.length > 0 ? (
                sessionMessages.map(msg => (
                  <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "")}>
                    {msg.role !== "user" && (
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--ai-from))]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="h-4 w-4 text-[hsl(var(--ai-from))]" />
                      </div>
                    )}
                    <div className={msg.role === "user" ? "max-w-[75%]" : "max-w-[80%]"}>
                      <div className={cn(
                        "rounded-2xl p-3.5 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-md"
                          : "bg-muted rounded-tl-md"
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className={cn("text-[10px] text-muted-foreground mt-1 block", msg.role === "user" && "text-right")}>
                        {new Date(msg.createdAt).toLocaleTimeString(undefined)}
                      </span>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">Нет сообщений</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AiConfigForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchData}
        initialData={editData as any}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Удалить Da Vinci агента"
        itemName={deleteName}
      />
    </div>
  )
}
