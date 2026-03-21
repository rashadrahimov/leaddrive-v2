"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/data-table"
import { AiConfigForm } from "@/components/ai-config-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { cn } from "@/lib/utils"
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
  isActive: boolean
  version: number
  notes: string | null
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
  get_tickets: "bg-blue-50 text-blue-700 border-blue-200",
  create_ticket: "bg-green-50 text-green-700 border-green-200",
  escalate: "bg-red-50 text-red-700 border-red-200",
  escalate_to_human: "bg-red-50 text-red-700 border-red-200",
  contracts: "bg-purple-50 text-purple-700 border-purple-200",
  documents: "bg-amber-50 text-amber-700 border-amber-200",
}

function getToolColor(tool: string): string {
  const key = Object.keys(TOOL_COLORS).find(k => tool.toLowerCase().includes(k))
  return key ? TOOL_COLORS[key] : "bg-gray-50 text-gray-700 border-gray-200"
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
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [stats, setStats] = useState<AiStats | null>(null)
  const [alerts, setAlerts] = useState<AiAlert[]>([])
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [logs, setLogs] = useState<InteractionLog[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
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

  // Constructor state
  const [newGuardrailName, setNewGuardrailName] = useState("")
  const [newGuardrailDesc, setNewGuardrailDesc] = useState("")
  const [newGuardrailPrompt, setNewGuardrailPrompt] = useState("")

  const orgId = session?.user?.organizationId

  const hdrs = (): Record<string, string> =>
    orgId ? { "x-organization-id": String(orgId) } : {}

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
    } catch {} finally { setLoading(false) }
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
    } catch {} finally { setSessionLoading(false) }
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
    { key: "id", label: "Сессия", render: (item: any) => <span className="font-mono text-xs">{item.id?.slice(0, 8)}...</span> },
    { key: "messagesCount", label: "Сообщений", sortable: true },
    {
      key: "status", label: "Статус", sortable: true,
      render: (item: any) => (
        <Badge variant={item.status === "active" ? "default" : item.status === "escalated" ? "destructive" : "secondary"}>
          {item.status === "active" ? "Активна" : item.status === "resolved" ? "Решена" : item.status === "escalated" ? "Эскалация" : item.status}
        </Badge>
      ),
    },
    {
      key: "createdAt", label: "Дата", sortable: true,
      render: (item: any) => <span>{new Date(item.createdAt).toLocaleDateString("ru-RU")}</span>,
    },
    {
      key: "actions", label: "",
      render: (item: any) => (
        <Button variant="ghost" size="sm" onClick={() => handleViewSession(item.id)}>
          <Eye className="h-3.5 w-3.5 mr-1" /> Детали
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">AI Command Center</h1>
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
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <BrainCircuit className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Command Center</h1>
            <p className="text-sm text-muted-foreground">AI Агент: производительность и аналитика</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-700">Агент онлайн</span>
          </div>
        </div>
      </div>

      {/* Tabs — large, v1-style */}
      <div className="grid grid-cols-2 gap-0 rounded-xl overflow-hidden border">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={cn(
            "py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "dashboard"
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-inner"
              : "bg-white hover:bg-gray-50 text-gray-600"
          )}
        >
          <Activity className="h-4 w-4" /> Дашборд
        </button>
        <button
          onClick={() => setActiveTab("constructor")}
          className={cn(
            "py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "constructor"
              ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-inner"
              : "bg-white hover:bg-gray-50 text-gray-600"
          )}
        >
          <Settings2 className="h-4 w-4" /> Конструктор агента
        </button>
      </div>

      {/* ═══ DASHBOARD TAB ═══ */}
      {activeTab === "dashboard" && (
        <>
          {/* KPI Row 1 — 4 cards with colorful icons */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Sessions */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Всего сессий</p>
                  <p className="text-3xl font-bold mt-1">{stats?.totalSessions || 0}</p>
                  <p className="text-xs text-blue-600 mt-1">Сегодня: {stats?.activeSessions || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Deflection */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Дефлекция</p>
                  <p className={cn("text-3xl font-bold mt-1", deflectionRate > 50 ? "text-green-600" : deflectionRate > 20 ? "text-amber-500" : "text-gray-900")}>
                    {deflectionRate.toFixed(1)}%
                  </p>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
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
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CSAT</p>
                  <p className="text-3xl font-bold mt-1">
                    {stats?.csat ? <>{stats.csat}<span className="text-lg text-gray-400">/5</span></> : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Ср. удовлетворенность</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* FCR */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">FCR</p>
                  <p className={cn("text-3xl font-bold mt-1", (stats?.fcrRate || 0) > 0 ? "text-green-600" : "")}>
                    {stats?.fcrRate || 0}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Решено с первого раза</p>
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
            <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Timer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ср. время решения</p>
                <p className="text-2xl font-bold">{stats?.avgResolutionTime || 0} <span className="text-sm font-normal text-gray-400">мин</span></p>
              </div>
            </div>

            {/* Total messages */}
            <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Всего сообщений</p>
                <p className="text-2xl font-bold">{stats?.totalMessages || 0} <span className="text-sm font-normal text-gray-400">ср. {stats?.avgMessagesPerSession || 0}/сессия</span></p>
              </div>
            </div>

            {/* Escalations */}
            <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Эскалации</p>
                <p className="text-2xl font-bold">{stats?.escalations || 0} <span className="text-sm font-normal text-gray-400">к агентам</span></p>
              </div>
            </div>

            {/* Avg latency */}
            <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ср. задержка</p>
                <p className="text-2xl font-bold">{stats?.avgLatency || 0}<span className="text-sm font-normal text-gray-400">s</span></p>
              </div>
            </div>

            {/* Total cost */}
            <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Общая стоимость</p>
                <p className="text-2xl font-bold text-green-600">${stats?.totalCost?.toFixed(3) || "0.000"}</p>
              </div>
            </div>

            {/* Quality */}
            <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Gauge className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Оценка качества</p>
                <p className="text-2xl font-bold">{stats?.qualityScore || 0}<span className="text-sm font-normal text-gray-400">/10</span></p>
              </div>
            </div>
          </div>

          {/* Alerts Section */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold">Алерты</h3>
                {unreadAlerts > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">{unreadAlerts}</span>
                )}
              </div>
              {unreadAlerts > 0 && (
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleMarkAllRead}>
                  Прочитать все
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
                    <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{timeAgo(alert.createdAt)}</p>
                    {alert.sessionId && (
                      <button onClick={() => handleViewSession(alert.sessionId!)} className="text-xs text-blue-500 hover:underline mt-0.5 flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Trace
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-gray-400 text-sm">Нет алертов</div>
              )}
            </div>
          </div>

          {/* Sessions Table */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="p-5 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-blue-500" /> Сессии за 7 дней
              </h3>
            </div>
            <div className="p-4">
              {sessions.length > 0 ? (
                <DataTable columns={sessionColumns} data={sessions} searchPlaceholder="Поиск сессий..." searchKey="id" pageSize={10} />
              ) : <div className="text-sm text-gray-400 p-4 text-center">Нет сессий</div>}
            </div>
          </div>

          {/* Logs Section */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="p-5 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-indigo-500" /> Логи взаимодействий
                <span className="text-xs text-gray-400 font-normal">({logsTotal} записей)</span>
              </h3>
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {logs.length > 0 ? logs.map(log => (
                <div key={log.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {log.model && <Badge variant="outline" className="text-[10px] font-mono">{log.model}</Badge>}
                      {log.latencyMs != null && (
                        <span className={cn(
                          "text-xs font-mono font-medium",
                          log.latencyMs > 10000 ? "text-red-500" : log.latencyMs > 5000 ? "text-amber-500" : "text-green-600"
                        )}>
                          {(log.latencyMs / 1000).toFixed(1)}s
                        </span>
                      )}
                      {log.costUsd != null && <span className="text-xs text-gray-500">${log.costUsd.toFixed(4)}</span>}
                      {log.promptTokens != null && <span className="text-xs text-gray-500">{log.promptTokens}+{log.completionTokens} tok</span>}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString("ru-RU")}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">Запрос</span>
                      <p className="text-xs bg-blue-50 p-2.5 rounded-lg">{log.userMessage.slice(0, 200)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">Ответ</span>
                      <p className="text-xs bg-gray-50 p-2.5 rounded-lg">{log.aiResponse.slice(0, 200)}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-gray-400 text-sm">Нет логов</div>
              )}
            </div>
          </div>
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
                  <Settings2 className="h-5 w-5 text-indigo-500" /> Конфигурации агента
                </h3>
                <p className="text-sm text-gray-500">Настройте модель, инструменты и поведение AI-агента</p>
              </div>
              <Button onClick={() => { setEditData(undefined); setShowForm(true) }} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-md">
                <Sparkles className="h-4 w-4 mr-2" /> Новая конфигурация
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {agents.map(agent => {
                const ml = getModelLabel(agent.model)
                const tools = agent.toolsEnabled || []
                return (
                  <div key={agent.id} className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center",
                          agent.isActive ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gray-200"
                        )}>
                          {agent.isActive
                            ? <BrainCircuit className="h-6 w-6 text-white" />
                            : <Zap className="h-6 w-6 text-gray-400" />
                          }
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{agent.configName}</h4>
                          <p className="text-sm">
                            <span className="text-gray-500">{ml.name}</span>
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
                            <span className="text-xs font-medium text-green-700">АКТИВЕН</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metrics chips */}
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-sm">
                        <span className="text-orange-500">🔥</span>
                        <span className="text-gray-700">Max {agent.maxTokens || 2048} токенов</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-sm">
                        <Settings2 className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-gray-700">{tools.length} инструментов</span>
                      </div>
                      <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm",
                        agent.escalationEnabled !== false ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
                      )}>
                        <span>{agent.escalationEnabled !== false ? "🔴" : "⚪"}</span>
                        <span className="text-gray-700">Эскалация: {agent.escalationEnabled !== false ? "вкл" : "выкл"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-sm">
                        <span>📚</span>
                        <span className="text-gray-700">KB: {agent.kbEnabled ? "вкл" : "выкл"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-sm">
                        <span>🌡️</span>
                        <span className="text-gray-700">{agent.temperature ?? 0.7}</span>
                      </div>
                    </div>

                    {/* Tools as colored chips */}
                    {tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tools.map(t => (
                          <span key={t} className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium", getToolColor(t))}>
                            📄 {t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        ))}
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
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Редактировать
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
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Удалить
                      </Button>
                    </div>
                  </div>
                )
              })}
              {agents.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-400 rounded-xl border bg-white">
                  <BrainCircuit className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Нет агентов</p>
                  <p className="text-sm mt-1">Создайте первого агента для начала работы</p>
                </div>
              )}
            </div>
          </div>

          {/* Guardrails — Rules & Restrictions */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="text-red-500">🛡️</span> Правила и ограничения
                </h3>
                <p className="text-sm text-gray-500">Что агенту запрещено делать</p>
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
                    {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteGuardrail(g.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )) : (
                <div className="p-6 text-center text-gray-400 text-sm">Нет правил</div>
              )}
            </div>
            {/* Add guardrail form */}
            <div id="guardrail-form" className="p-5 border-t bg-gray-50/50 space-y-3">
              <h4 className="text-sm font-medium text-gray-600">Добавить правило</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Название правила" value={newGuardrailName} onChange={e => setNewGuardrailName(e.target.value)} className="bg-white" />
                <Input placeholder="Описание (необязательно)" value={newGuardrailDesc} onChange={e => setNewGuardrailDesc(e.target.value)} className="bg-white" />
              </div>
              <Input placeholder="Промпт-инъекция для системного промпта" value={newGuardrailPrompt} onChange={e => setNewGuardrailPrompt(e.target.value)} className="bg-white" />
              <Button size="sm" onClick={handleAddGuardrail} disabled={!newGuardrailName.trim()} className="bg-gradient-to-r from-blue-500 to-blue-600">
                <PlusCircle className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
          </div>

          {/* AI Config Generator */}
          <div className="rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-purple-200 p-8 text-center space-y-4">
            <Sparkles className="h-8 w-8 mx-auto text-purple-400" />
            <h3 className="font-bold text-lg">Создать конфигурацию по описанию</h3>
            <p className="text-sm text-gray-500">Опишите роль агента обычным текстом, и AI создаст конфигурацию автоматически</p>
            <div className="flex gap-3 max-w-xl mx-auto">
              <Input placeholder="Например: агент техподдержки, быстрые ответы, без сложных вопросов..." className="bg-white" />
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md flex-shrink-0">
                <Sparkles className="h-4 w-4 mr-1" /> Создать
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ═══ SESSION DETAIL MODAL ═══ */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSession(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-lg">Сессия {selectedSession.slice(0, 12)}...</h3>
                <p className="text-xs text-gray-500">{sessionMessages.length} сообщений</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {sessionLoading ? (
                <div className="text-center py-10 text-gray-400 text-sm">Загрузка...</div>
              ) : sessionMessages.length > 0 ? (
                sessionMessages.map(msg => (
                  <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "")}>
                    {msg.role !== "user" && (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="h-4 w-4 text-indigo-600" />
                      </div>
                    )}
                    <div className={msg.role === "user" ? "max-w-[75%]" : "max-w-[80%]"}>
                      <div className={cn(
                        "rounded-2xl p-3.5 text-sm",
                        msg.role === "user"
                          ? "bg-blue-500 text-white rounded-tr-md"
                          : "bg-gray-100 rounded-tl-md"
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className={cn("text-[10px] text-gray-400 mt-1 block", msg.role === "user" && "text-right")}>
                        {new Date(msg.createdAt).toLocaleTimeString("ru-RU")}
                      </span>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400 text-sm">Нет сообщений</div>
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
        initialData={editData}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Удалить AI агента"
        itemName={deleteName}
      />
    </div>
  )
}
