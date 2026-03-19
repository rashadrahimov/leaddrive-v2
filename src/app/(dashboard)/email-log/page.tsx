"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { StatCard } from "@/components/stat-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, Send, Inbox, CheckCircle, AlertTriangle, RotateCcw, Search, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft, Filter, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmailLogEntry {
  id: string
  direction: string
  fromEmail: string
  toEmail: string
  subject: string | null
  body: string | null
  status: string
  errorMessage: string | null
  campaignId: string | null
  templateId: string | null
  contactId: string | null
  sentBy: string | null
  messageId: string | null
  createdAt: string
}

interface Stats {
  total: number
  outbound: number
  inbound: number
  sent: number
  failed: number
  bounced: number
}

const statusLabels: Record<string, string> = {
  pending: "Ожидает",
  sent: "Отправлено",
  delivered: "Доставлено",
  failed: "Ошибка",
  bounced: "Отскочено",
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  delivered: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  bounced: "bg-orange-100 text-orange-700",
}

export default function EmailLogPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId

  const [logs, setLogs] = useState<EmailLogEntry[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, outbound: 0, inbound: 0, sent: 0, failed: 0, bounced: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterDirection, setFilterDirection] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 30

  const fetchLogs = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set("search", search)
      if (filterStatus) params.set("status", filterStatus)
      if (filterDirection) params.set("direction", filterDirection)

      const res = await fetch(`/api/v1/email-log?${params}`, {
        headers: { "x-organization-id": String(orgId) },
      })
      const json = await res.json()
      if (json.success) {
        setLogs(json.data.logs)
        setTotal(json.data.total)
        setStats(json.data.stats)
      }
    } catch {}
    setLoading(false)
  }, [orgId, page, search, filterStatus, filterDirection])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Журнал Email</h1>
          <p className="text-sm text-muted-foreground">
            Все отправленные и полученные письма — статус доставки, ошибки и история
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1">
          <RefreshCw className="h-4 w-4" /> Обновить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Всего" value={stats.total} icon={<Mail className="h-4 w-4" />} />
        <StatCard title="Исходящие" value={stats.outbound} icon={<Send className="h-4 w-4" />} />
        <StatCard title="Входящие" value={stats.inbound} icon={<Inbox className="h-4 w-4" />} />
        <StatCard title="Отправлено" value={stats.sent} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard title="Ошибок" value={stats.failed} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard title="Отскочено" value={stats.bounced} icon={<RotateCcw className="h-4 w-4" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по теме, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterDirection}
            onChange={e => { setFilterDirection(e.target.value); setPage(1) }}
            className="text-sm border rounded-md px-2 py-1.5 bg-background"
          >
            <option value="">Все направления</option>
            <option value="outbound">Исходящие</option>
            <option value="inbound">Входящие</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            className="text-sm border rounded-md px-2 py-1.5 bg-background"
          >
            <option value="">Все статусы</option>
            <option value="sent">Отправлено</option>
            <option value="delivered">Доставлено</option>
            <option value="failed">Ошибка</option>
            <option value="bounced">Отскочено</option>
            <option value="pending">Ожидает</option>
          </select>
        </div>
      </div>

      {/* Email list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Mail className="mx-auto h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">Нет записей</p>
          <p className="text-sm mt-1">
            {stats.total === 0
              ? "Журнал пуст. При отправке писем через кампании они будут записаны здесь."
              : "Ничего не найдено по вашему запросу"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, index) => {
            const isExpanded = expandedId === log.id
            const isOutbound = log.direction === "outbound"
            const logNumber = total - ((page - 1) * limit + index)

            return (
              <div
                key={log.id}
                className={cn(
                  "border rounded-lg transition-all",
                  log.status === "failed" ? "bg-red-50/50 dark:bg-red-900/10 border-red-200" :
                  log.status === "bounced" ? "bg-orange-50/50 dark:bg-orange-900/10 border-orange-200" :
                  isOutbound ? "bg-green-50/30 dark:bg-green-900/5" : "bg-blue-50/30 dark:bg-blue-900/5"
                )}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {isOutbound ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                            <ArrowUpRight className="h-3 w-3" /> Исходящее
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            <ArrowDownLeft className="h-3 w-3" /> Входящее
                          </span>
                        )}
                        <span className="font-semibold text-sm truncate">{log.subject || "(без темы)"}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[log.status] || "bg-gray-100 text-gray-600")}>
                          {statusLabels[log.status] || log.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <span>От: <span className="text-foreground">{log.fromEmail}</span></span>
                        <span>Кому: <span className="text-foreground">{log.toEmail}</span></span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span>Дата: {new Date(log.createdAt).toLocaleString("ru-RU")}</span>
                        {log.sentBy && <span>Отправитель: {log.sentBy}</span>}
                        {log.campaignId && <span className="text-blue-500">Кампания</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-lg font-bold text-muted-foreground/50">#{logNumber}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t">
                    {log.errorMessage && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-sm text-red-700 dark:text-red-400">
                        <span className="font-medium">Ошибка:</span> {log.errorMessage}
                      </div>
                    )}
                    {log.messageId && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Message-ID: <span className="font-mono">{log.messageId}</span>
                      </div>
                    )}
                    {log.body ? (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-2 font-medium">Превью сообщения:</div>
                        <div className="border rounded-md bg-white dark:bg-gray-950 p-4 max-h-72 overflow-y-auto">
                          <div dangerouslySetInnerHTML={{ __html: log.body }} className="text-sm prose prose-sm max-w-none" />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-muted-foreground italic">Содержимое не сохранено</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Показано {(page - 1) * limit + 1}–{Math.min(page * limit, total)} из {total}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Назад
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
