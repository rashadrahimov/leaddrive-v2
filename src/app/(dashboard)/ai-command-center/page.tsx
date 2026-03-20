"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
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
  X, Bot, User, ChevronRight, Eye, EyeOff, CheckCircle,
} from "lucide-react"

interface AgentConfig {
  id: string
  configName: string
  model: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  toolsEnabled?: string
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

type TabId = "dashboard" | "constructor" | "alerts" | "logs"

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
  const [newRule, setNewRule] = useState("")
  const [rules, setRules] = useState<string[]>([
    "Всегда отвечать на языке клиента",
    "При неуверенности — эскалировать оператору",
    "Не раскрывать внутреннюю информацию компании",
  ])
  const [kbTopics, setKbTopics] = useState<string[]>([
    "Услуги компании",
    "Ценообразование",
    "Техническая поддержка",
  ])
  const [newTopic, setNewTopic] = useState("")

  // Guardrail form
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
    await fetch(`/api/v1/ai-configs/${deleteId}`, {
      method: "DELETE",
      headers: hdrs(),
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
      if (json.success) {
        setSessionMessages(json.data.session.messages || [])
      }
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
    await fetch(`/api/v1/ai-guardrails?id=${id}`, {
      method: "DELETE",
      headers: hdrs(),
    })
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Command Center</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">Агент онлайн</span>
          </div>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Новый агент
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { id: "dashboard" as TabId, label: "Дашборд", icon: <Activity className="h-3.5 w-3.5" /> },
          { id: "constructor" as TabId, label: "Конструктор", icon: <Settings2 className="h-3.5 w-3.5" /> },
          { id: "alerts" as TabId, label: "Алерты", icon: <Bell className="h-3.5 w-3.5" />, badge: unreadAlerts },
          { id: "logs" as TabId, label: "Логи", icon: <ScrollText className="h-3.5 w-3.5" /> },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge ? (
              <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ═══ DASHBOARD TAB ═══ */}
      {activeTab === "dashboard" && (
        <>
          {/* 10 Metrics Grid */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Всего сессий" value={stats?.totalSessions || 0} icon={<MessageSquare className="h-4 w-4" />} description={`${stats?.activeSessions || 0} активных`} />
            <StatCard title="Дефлекция" value={`${stats?.deflectionRate || 0}%`} icon={<ShieldCheck className="h-4 w-4" />} description="Решено без оператора" trend={stats && stats.deflectionRate > 50 ? "up" : "neutral"} />
            <StatCard title="CSAT" value={stats?.csat ? `${stats.csat}/5` : "—"} icon={<Star className="h-4 w-4" />} description="Удовлетворённость" />
            <StatCard title="FCR" value={`${stats?.fcrRate || 0}%`} icon={<Zap className="h-4 w-4" />} description="Решено с 1 контакта" />
            <StatCard title="Ср. время решения" value={stats?.avgResolutionTime ? `${stats.avgResolutionTime} мин` : "—"} icon={<Timer className="h-4 w-4" />} />
            <StatCard title="Всего сообщений" value={stats?.totalMessages || 0} icon={<Activity className="h-4 w-4" />} description={`ср. ${stats?.avgMessagesPerSession || 0}/сессию`} />
            <StatCard title="Эскалации" value={stats?.escalations || 0} icon={<AlertTriangle className="h-4 w-4" />} trend={stats && stats.escalations > 5 ? "down" : "neutral"} />
            <StatCard title="Ср. задержка" value={stats?.avgLatency ? `${stats.avgLatency}с` : "—"} icon={<Clock className="h-4 w-4" />} />
            <StatCard title="Общая стоимость" value={`$${stats?.totalCost?.toFixed(3) || "0.000"}`} icon={<DollarSign className="h-4 w-4" />} description={`${stats?.totalTokens?.toLocaleString() || 0} токенов`} />
            <StatCard title="Оценка качества" value={stats?.qualityScore ? `${stats.qualityScore}/10` : "—"} icon={<Gauge className="h-4 w-4" />} />
          </div>

          {/* Agent Configs */}
          <Card>
            <CardHeader><CardTitle className="text-base">Конфигурации агентов</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agents.length > 0 ? agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BrainCircuit className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{agent.configName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{agent.model}</span>
                          <span>·</span>
                          <span>v{agent.version}</span>
                          {agent.maxTokens && <><span>·</span><span>{agent.maxTokens} tok</span></>}
                          {agent.temperature != null && <><span>·</span><span>temp {agent.temperature}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {agent.toolsEnabled && (
                        <div className="flex gap-1">
                          {agent.toolsEnabled.split(",").slice(0, 3).map(t => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t.trim()}</Badge>
                          ))}
                        </div>
                      )}
                      <Badge variant={agent.kbEnabled ? "default" : "secondary"} className="text-[10px]">
                        KB {agent.kbEnabled ? "вкл" : "выкл"}
                      </Badge>
                      <Badge variant={agent.isActive ? "default" : "secondary"}>
                        {agent.isActive ? "Активен" : "Неактивен"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => { setEditData(agent); setShowForm(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDeleteId(agent.id); setDeleteName(agent.configName) }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-muted-foreground text-center py-6">Нет настроенных AI агентов</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sessions with detail view */}
          <Card>
            <CardHeader><CardTitle className="text-base">Сессии чата</CardTitle></CardHeader>
            <CardContent>
              {sessions.length > 0 ? (
                <DataTable columns={sessionColumns} data={sessions} searchPlaceholder="Поиск сессий..." searchKey="id" pageSize={10} />
              ) : <div className="text-sm text-muted-foreground p-4 text-center">Нет сессий</div>}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══ CONSTRUCTOR TAB ═══ */}
      {activeTab === "constructor" && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Rules & Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" /> Правила и ограничения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {rules.map((rule, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded border text-sm">
                      <span>{rule}</span>
                      <button onClick={() => setRules(rules.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Новое правило..."
                    value={newRule}
                    onChange={e => setNewRule(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newRule.trim()) { setRules([...rules, newRule.trim()]); setNewRule("") } }}
                  />
                  <Button size="sm" variant="outline" onClick={() => { if (newRule.trim()) { setRules([...rules, newRule.trim()]); setNewRule("") } }}>
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* KB Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4" /> Темы базы знаний
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {kbTopics.map((topic, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded border text-sm">
                      <span>{topic}</span>
                      <button onClick={() => setKbTopics(kbTopics.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Новая тема..."
                    value={newTopic}
                    onChange={e => setNewTopic(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newTopic.trim()) { setKbTopics([...kbTopics, newTopic.trim()]); setNewTopic("") } }}
                  />
                  <Button size="sm" variant="outline" onClick={() => { if (newTopic.trim()) { setKbTopics([...kbTopics, newTopic.trim()]); setNewTopic("") } }}>
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Guardrails */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Гарантии безопасности (Guardrails)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {guardrails.length > 0 ? guardrails.map(g => (
                  <div key={g.id} className="p-3 rounded-lg border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{g.ruleName}</span>
                        <Badge variant="outline" className="text-[10px]">{g.ruleType}</Badge>
                        <Badge variant={g.isActive ? "default" : "secondary"} className="text-[10px]">
                          {g.isActive ? "Активен" : "Выкл"}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteGuardrail(g.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                    {g.promptInjection && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono">{g.promptInjection}</p>
                    )}
                  </div>
                )) : (
                  <div className="text-sm text-muted-foreground text-center py-4">Нет guardrails</div>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-medium">Добавить guardrail</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Название правила" value={newGuardrailName} onChange={e => setNewGuardrailName(e.target.value)} />
                  <Input placeholder="Описание (необязательно)" value={newGuardrailDesc} onChange={e => setNewGuardrailDesc(e.target.value)} />
                </div>
                <Input placeholder="Промпт-инъекция (текст для системного промпта)" value={newGuardrailPrompt} onChange={e => setNewGuardrailPrompt(e.target.value)} />
                <Button size="sm" onClick={handleAddGuardrail} disabled={!newGuardrailName.trim()}>
                  <PlusCircle className="h-4 w-4 mr-1" /> Добавить
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Agent configs list (constructor mode) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Конфигурации агентов</CardTitle>
                <Button size="sm" onClick={() => { setEditData(undefined); setShowForm(true) }}>
                  <Plus className="h-4 w-4 mr-1" /> Создать
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agents.map(agent => (
                  <div key={agent.id} className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-semibold">{agent.configName}</div>
                          <div className="text-xs text-muted-foreground">{agent.model} · v{agent.version}</div>
                        </div>
                      </div>
                      <Badge variant={agent.isActive ? "default" : "secondary"}>
                        {agent.isActive ? "Активен" : "Неактивен"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Макс. токены</span>
                        <div className="font-medium">{agent.maxTokens || "—"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Temperature</span>
                        <div className="font-medium">{agent.temperature ?? "—"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">KB</span>
                        <div className="font-medium">{agent.kbEnabled ? `Вкл (${agent.kbMaxArticles || 5} статей)` : "Выкл"}</div>
                      </div>
                    </div>
                    {agent.toolsEnabled && (
                      <div>
                        <span className="text-muted-foreground text-xs">Инструменты</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {agent.toolsEnabled.split(",").map(t => (
                            <Badge key={t} variant="outline" className="text-xs">{t.trim()}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditData(agent); setShowForm(true) }}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Редактировать
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setDeleteId(agent.id); setDeleteName(agent.configName) }}>
                        <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" /> Удалить
                      </Button>
                    </div>
                  </div>
                ))}
                {agents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Нет агентов. Создайте первого агента для начала работы.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══ ALERTS TAB ═══ */}
      {activeTab === "alerts" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" /> Алерты и уведомления
                {unreadAlerts > 0 && (
                  <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{unreadAlerts}</span>
                )}
              </CardTitle>
              {unreadAlerts > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Отметить все прочитанными
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      !alert.isRead && "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      alert.severity === "critical" ? "bg-red-100 text-red-600" :
                      alert.severity === "warning" ? "bg-amber-100 text-amber-600" :
                      "bg-blue-100 text-blue-600"
                    )}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          alert.type === "token_spike" ? "destructive" :
                          alert.type === "high_latency" ? "default" :
                          "secondary"
                        } className="text-[10px]">
                          {alert.type === "token_spike" ? "Всплеск токенов" :
                           alert.type === "high_latency" ? "Высокая задержка" :
                           alert.type === "error" ? "Ошибка" : alert.type}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{alert.severity}</Badge>
                        {!alert.isRead && <span className="h-2 w-2 bg-blue-500 rounded-full" />}
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{new Date(alert.createdAt).toLocaleString("ru-RU")}</span>
                        {alert.sessionId && <span>Сессия: {alert.sessionId.slice(0, 8)}...</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Нет алертов</p>
                <p className="text-xs mt-1">Алерты появляются при аномалиях: всплески токенов, высокая задержка, ошибки</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ LOGS TAB ═══ */}
      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4" /> Логи взаимодействий
              <span className="text-xs text-muted-foreground font-normal">({logsTotal} записей)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map(log => (
                  <div key={log.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.model && <Badge variant="outline" className="text-[10px]">{log.model}</Badge>}
                        {log.isCopilot && <Badge variant="secondary" className="text-[10px]">Copilot</Badge>}
                        {log.latencyMs != null && (
                          <span className={cn(
                            "text-[10px] font-mono",
                            log.latencyMs > 10000 ? "text-red-500" : log.latencyMs > 5000 ? "text-amber-500" : "text-green-500"
                          )}>
                            {(log.latencyMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        {log.costUsd != null && (
                          <span className="text-[10px] text-muted-foreground">${log.costUsd.toFixed(4)}</span>
                        )}
                        {log.promptTokens != null && log.completionTokens != null && (
                          <span className="text-[10px] text-muted-foreground">
                            {log.promptTokens}+{log.completionTokens} tok
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("ru-RU")}
                      </span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Запрос</span>
                        <p className="text-xs bg-blue-50 p-2 rounded max-h-20 overflow-y-auto">{log.userMessage.slice(0, 200)}{log.userMessage.length > 200 ? "..." : ""}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Ответ</span>
                        <p className="text-xs bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">{log.aiResponse.slice(0, 200)}{log.aiResponse.length > 200 ? "..." : ""}</p>
                      </div>
                    </div>
                    {log.toolsCalled.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Tools:</span>
                        {log.toolsCalled.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Нет логов взаимодействий</p>
                <p className="text-xs mt-1">Логи записываются при каждом вызове AI агента</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ SESSION DETAIL MODAL ═══ */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSession(null)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">Сессия {selectedSession.slice(0, 12)}...</h3>
                <p className="text-xs text-muted-foreground">{sessionMessages.length} сообщений</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sessionLoading ? (
                <div className="text-center py-10 text-muted-foreground text-sm">Загрузка...</div>
              ) : sessionMessages.length > 0 ? (
                sessionMessages.map(msg => (
                  <div key={msg.id} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "")}>
                    {msg.role !== "user" && (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                    )}
                    <div className={msg.role === "user" ? "max-w-[75%]" : "max-w-[80%]"}>
                      <div className={cn(
                        "rounded-lg p-3 text-sm",
                        msg.role === "user"
                          ? "bg-blue-500 text-white rounded-tr-none"
                          : "bg-muted rounded-tl-none"
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[10px] text-muted-foreground", msg.role === "user" && "text-right w-full")}>
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU")}
                        </span>
                        {msg.tokenCount && <span className="text-[10px] text-muted-foreground">{msg.tokenCount} tok</span>}
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-blue-600" />
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
