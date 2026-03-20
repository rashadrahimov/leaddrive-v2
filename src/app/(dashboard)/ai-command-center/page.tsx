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
  Settings2, PlusCircle,
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

type TabId = "dashboard" | "constructor"

export default function AICommandCenterPage() {
  const { data: session } = useSession()
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [stats, setStats] = useState<AiStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<AgentConfig | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")
  const [newRule, setNewRule] = useState("")
  const [rules, setRules] = useState<string[]>([
    "Всегда отвечать на русском языке",
    "При неуверенности — эскалировать оператору",
    "Не раскрывать внутреннюю информацию компании",
  ])
  const [kbTopics, setKbTopics] = useState<string[]>([
    "Услуги компании",
    "Ценообразование",
    "Техническая поддержка",
  ])
  const [newTopic, setNewTopic] = useState("")
  const orgId = session?.user?.organizationId

  const fetchData = async () => {
    try {
      const hdrs: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}
      const [agentsRes, sessionsRes, statsRes] = await Promise.all([
        fetch("/api/v1/ai-configs", { headers: hdrs }).then(r => r.json()).catch(() => ({ success: false })),
        fetch("/api/v1/ai-sessions", { headers: hdrs }).then(r => r.json()).catch(() => ({ success: false })),
        fetch("/api/v1/ai-sessions/stats", { headers: hdrs }).then(r => r.json()).catch(() => ({ success: false })),
      ])
      if (agentsRes.success) setAgents(agentsRes.data?.configs || [])
      if (sessionsRes.success) setSessions(sessionsRes.data?.sessions || [])
      if (statsRes.success) setStats(statsRes.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/ai-configs/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    fetchData()
  }

  const activeAgents = agents.filter(a => a.isActive).length

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
        <button
          onClick={() => setActiveTab("dashboard")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "dashboard"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Дашборд
        </button>
        <button
          onClick={() => setActiveTab("constructor")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "constructor"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Конструктор агента
        </button>
      </div>

      {activeTab === "dashboard" && (
        <>
          {/* 10 Metrics Grid */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Всего сессий"
              value={stats?.totalSessions || 0}
              icon={<MessageSquare className="h-4 w-4" />}
              description={`${stats?.activeSessions || 0} активных`}
            />
            <StatCard
              title="Дефлекция"
              value={`${stats?.deflectionRate || 0}%`}
              icon={<ShieldCheck className="h-4 w-4" />}
              description="Решено без оператора"
              trend={stats && stats.deflectionRate > 50 ? "up" : "neutral"}
            />
            <StatCard
              title="CSAT"
              value={stats?.csat ? `${stats.csat}/5` : "—"}
              icon={<Star className="h-4 w-4" />}
              description="Удовлетворённость"
            />
            <StatCard
              title="FCR"
              value={`${stats?.fcrRate || 0}%`}
              icon={<Zap className="h-4 w-4" />}
              description="Решено с 1 контакта"
            />
            <StatCard
              title="Ср. время решения"
              value={stats?.avgResolutionTime ? `${stats.avgResolutionTime} мин` : "—"}
              icon={<Timer className="h-4 w-4" />}
            />
            <StatCard
              title="Всего сообщений"
              value={stats?.totalMessages || 0}
              icon={<Activity className="h-4 w-4" />}
              description={`ср. ${stats?.avgMessagesPerSession || 0}/сессию`}
            />
            <StatCard
              title="Эскалации"
              value={stats?.escalations || 0}
              icon={<AlertTriangle className="h-4 w-4" />}
              trend={stats && stats.escalations > 5 ? "down" : "neutral"}
            />
            <StatCard
              title="Ср. задержка"
              value={stats?.avgLatency ? `${stats.avgLatency}с` : "—"}
              icon={<Clock className="h-4 w-4" />}
            />
            <StatCard
              title="Общая стоимость"
              value={`$${stats?.totalCost?.toFixed(3) || "0.000"}`}
              icon={<DollarSign className="h-4 w-4" />}
              description={`${stats?.totalTokens?.toLocaleString() || 0} токенов`}
            />
            <StatCard
              title="Оценка качества"
              value={stats?.qualityScore ? `${stats.qualityScore}/10` : "—"}
              icon={<Gauge className="h-4 w-4" />}
            />
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
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Нет настроенных AI агентов
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sessions */}
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

      {activeTab === "constructor" && (
        <>
          {/* Agent configs with constructor view */}
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
                      <button
                        onClick={() => setRules(rules.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
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
                    onKeyDown={e => {
                      if (e.key === "Enter" && newRule.trim()) {
                        setRules([...rules, newRule.trim()])
                        setNewRule("")
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newRule.trim()) {
                        setRules([...rules, newRule.trim()])
                        setNewRule("")
                      }
                    }}
                  >
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
                      <button
                        onClick={() => setKbTopics(kbTopics.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
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
                    onKeyDown={e => {
                      if (e.key === "Enter" && newTopic.trim()) {
                        setKbTopics([...kbTopics, newTopic.trim()])
                        setNewTopic("")
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newTopic.trim()) {
                        setKbTopics([...kbTopics, newTopic.trim()])
                        setNewTopic("")
                      }
                    }}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

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
