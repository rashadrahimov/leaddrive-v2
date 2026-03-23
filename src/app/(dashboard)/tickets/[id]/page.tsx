"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { ArrowLeft, Clock, Send, Lock, Star, Loader2, Bot, FileText, Zap, UserCheck, RefreshCw, AlertTriangle, UserPlus, BookOpen } from "lucide-react"

interface TicketData {
  id: string
  ticketNumber: string
  subject: string
  description: string | null
  status: string
  priority: string
  category: string
  contactId: string | null
  companyId: string | null
  assignedTo: string | null
  createdBy: string | null
  slaDueAt: string | null
  firstResponseAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  satisfactionRating: number | null
  satisfactionComment: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  comments: CommentData[]
}

interface CommentData {
  id: string
  userId: string | null
  comment: string
  isInternal: boolean
  createdAt: string
}

interface UserOption {
  id: string
  name: string | null
  email: string
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  new: { label: "Новый", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  open: { label: "Открыт", className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300" },
  in_progress: { label: "В работе", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  waiting: { label: "Ожидание", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  resolved: { label: "Решён", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  closed: { label: "Закрыт", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
}

const STATUS_PIPELINE = ["new", "open", "in_progress", "waiting", "resolved", "closed"]
const STATUS_PIPELINE_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  open: "bg-cyan-500",
  in_progress: "bg-yellow-500",
  waiting: "bg-purple-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
}

const PRIORITY_STYLES: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  high: { label: "High", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  low: { label: "Low", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function getSlaTimeLeft(slaDueAt: string | null, status: string): { text: string; breached: boolean; urgent: boolean } {
  if (!slaDueAt) return { text: "—", breached: false, urgent: false }
  if (status === "resolved" || status === "closed") return { text: "Решён", breached: false, urgent: false }
  const diff = new Date(slaDueAt).getTime() - Date.now()
  if (diff <= 0) return { text: "Просрочен", breached: true, urgent: false }
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  const urgent = diff < 2 * 3600000 // less than 2 hours
  const text = urgent
    ? `${hours}ч ${minutes.toString().padStart(2, "0")}м ${seconds.toString().padStart(2, "0")}с`
    : `${hours}ч ${minutes}м`
  return { text, breached: false, urgent }
}

function getInitials(str: string | null): string {
  if (!str) return "?"
  return str.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

export default function TicketDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const ticketId = params.id as string
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tick, setTick] = useState(0) // live countdown tick
  const [newComment, setNewComment] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [showInternal, setShowInternal] = useState(true)
  const [sending, setSending] = useState(false)

  // Related KB articles
  const [kbArticles, setKbArticles] = useState<any[]>([])

  // Inline status change
  const [newStatus, setNewStatus] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Inline reassign
  const [users, setUsers] = useState<UserOption[]>([])
  const [newAssignee, setNewAssignee] = useState("")
  const [updatingAssignee, setUpdatingAssignee] = useState(false)

  // AI features
  const [aiLoading, setAiLoading] = useState<string | null>(null) // "reply" | "summary" | "steps"
  const [aiResult, setAiResult] = useState<{ type: string; text: string } | null>(null)
  const [aiLang, setAiLang] = useState("ru") // "ru" | "az" | "en"

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}`)
      const json = await res.json()
      if (json.success) {
        setTicket(json.data)
        setNewStatus(json.data.status)
        setNewAssignee(json.data.assignedTo || "")
        // Fetch related KB articles by category/tags
        try {
          const kbRes = await fetch(`/api/v1/kb?limit=5&search=${encodeURIComponent(json.data.category || "")}`)
          const kbJson = await kbRes.json()
          if (kbJson.success) setKbArticles(kbJson.data?.articles || kbJson.data || [])
        } catch {}
      } else {
        setError(json.error || "Failed to load ticket")
      }
    } catch {
      setError("Failed to load ticket")
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/users")
      const json = await res.json()
      if (json.success) setUsers(json.data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchTicket(); fetchUsers() }, [fetchTicket, fetchUsers])

  // Poll for updates every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => { fetchTicket() }, 15000)
    return () => clearInterval(interval)
  }, [fetchTicket])

  // Live SLA countdown — tick every second
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const handleSendComment = async () => {
    if (!newComment.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment, isInternal }),
      })
      const json = await res.json()
      if (json.success) {
        setNewComment("")
        fetchTicket()
      }
    } catch { /* ignore */ } finally { setSending(false) }
  }

  const handleUpdateStatus = async () => {
    if (!ticket || newStatus === ticket.status) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchTicket()
    } catch { /* ignore */ } finally { setUpdatingStatus(false) }
  }

  const handleReassign = async () => {
    if (!ticket) return
    setUpdatingAssignee(true)
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: newAssignee || "" }),
      })
      if (res.ok) fetchTicket()
    } catch { /* ignore */ } finally { setUpdatingAssignee(false) }
  }

  const handleAiAction = async (action: string) => {
    setAiLoading(action)
    setAiResult(null)
    try {
      const res = await fetch("/api/v1/tickets/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ticketId, lang: aiLang }),
      })
      const json = await res.json()
      if (json.success) {
        const text = json.data.text
        if (action === "reply") {
          setNewComment(text)
        } else {
          setAiResult({ type: action, text })
        }
      }
    } catch { /* ignore */ } finally { setAiLoading(null) }
  }

  const handleAutoAssign = async () => {
    setUpdatingAssignee(true)
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      })
      const json = await res.json()
      if (json.success) fetchTicket()
    } catch { /* ignore */ } finally { setUpdatingAssignee(false) }
  }

  const handleAssignToMe = async () => {
    const userId = session?.user?.id
    if (!userId) return
    setUpdatingAssignee(true)
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: userId }),
      })
      if (res.ok) fetchTicket()
    } catch { /* ignore */ } finally { setUpdatingAssignee(false) }
  }

  const handleEscalate = async () => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: "critical" }),
      })
      if (res.ok) fetchTicket()
    } catch { /* ignore */ } finally { setUpdatingStatus(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Link href="/tickets">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Назад</Button>
        </Link>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {error || "Тикет не найден"}
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[ticket.status] || STATUS_STYLES.new
  const priorityStyle = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.medium
  const comments = ticket.comments || []
  const sortedComments = [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const filteredComments = showInternal ? sortedComments : sortedComments.filter(c => !c.isInternal)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sla = getSlaTimeLeft(ticket.slaDueAt, ticket.status) // recalculates every `tick`
  void tick // ensure re-render on tick
  const daysOpen = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 86400000)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/tickets">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold truncate">{ticket.subject}</h1>
            <span className="text-xs text-muted-foreground font-mono">{ticket.ticketNumber}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={statusStyle.className}>{statusStyle.label}</Badge>
            <Badge className={priorityStyle.className}>{priorityStyle.label}</Badge>
            {ticket.category && <Badge variant="outline" className="text-xs">{ticket.category}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ticket.status !== "resolved" && ticket.status !== "closed" && (
            <>
              <Button
                size="sm" variant="outline"
                className="border-amber-300 text-amber-600 hover:bg-amber-50"
                onClick={handleEscalate}
                disabled={ticket.priority === "critical" || updatingStatus}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Escalate
              </Button>
              <Button
                size="sm" variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={handleAssignToMe}
                disabled={updatingAssignee}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Assign to me
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="flex gap-0 rounded-xl overflow-hidden border">
        {STATUS_PIPELINE.map((s, i) => {
          const style = STATUS_STYLES[s] || STATUS_STYLES.new
          const isCurrent = ticket.status === s
          const currentIdx = STATUS_PIPELINE.indexOf(ticket.status)
          const isPast = i < currentIdx
          const color = STATUS_PIPELINE_COLORS[s]

          return (
            <button
              key={s}
              onClick={async () => {
                if (s === ticket.status) return
                setUpdatingStatus(true)
                try {
                  const res = await fetch(`/api/v1/tickets/${ticketId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: s }),
                  })
                  if (res.ok) fetchTicket()
                } catch {} finally { setUpdatingStatus(false) }
              }}
              className={`flex-1 py-2.5 px-2 text-xs font-medium text-center transition-all relative ${
                isCurrent
                  ? `${color} text-white shadow-inner`
                  : isPast
                  ? `${color}/20 text-foreground/70`
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
              disabled={updatingStatus}
            >
              {style.label}
            </button>
          )
        })}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-500 text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">Days open</span>
            <Clock className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{daysOpen}</span>
        </div>
        <div className={`${sla.breached ? "bg-red-500" : sla.urgent ? "bg-amber-500" : "bg-green-500"} text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">SLA time left</span>
            <Clock className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-lg font-bold leading-tight font-mono">{sla.text}</span>
        </div>
        <div className="bg-violet-500 text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">Comments</span>
            <Send className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{comments.length}</span>
        </div>
        <div className={`${ticket.priority === "critical" ? "bg-red-500" : ticket.priority === "high" ? "bg-orange-500" : "bg-slate-500"} text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">Priority</span>
            <AlertTriangle className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-xl font-bold capitalize">{ticket.priority}</span>
        </div>
      </div>

      {/* SLA & Priority Warnings */}
      {sla.breached && ticket.status !== "resolved" && ticket.status !== "closed" && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">⚠️ SLA нарушен! Срочно требуется действие.</p>
            <p className="text-xs text-red-600 dark:text-red-400">Дедлайн: {formatDate(ticket.slaDueAt)} · Приоритет: {priorityStyle.label}</p>
          </div>
          {!ticket.assignedTo && (
            <Button size="sm" variant="destructive" onClick={handleAutoAssign} disabled={updatingAssignee}>
              <Zap className="h-3.5 w-3.5 mr-1" /> Назначить
            </Button>
          )}
        </div>
      )}
      {!sla.breached && ticket.slaDueAt && ticket.status !== "resolved" && ticket.status !== "closed" && (() => {
        const hoursLeft = (new Date(ticket.slaDueAt).getTime() - Date.now()) / 3600000
        if (hoursLeft > 0 && hoursLeft < 2) return (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">⏰ SLA истекает менее чем через 2 часа!</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">Осталось: {sla.text} · Приоритет: {priorityStyle.label}</p>
            </div>
          </div>
        )
        return null
      })()}
      {(ticket.priority === "critical" || ticket.priority === "high") && !ticket.assignedTo && ticket.status !== "resolved" && ticket.status !== "closed" && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">🔥 Тикет с высоким приоритетом не назначен!</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Приоритет: {priorityStyle.label} · Требуется назначение агента</p>
          </div>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleAutoAssign} disabled={updatingAssignee}>
            <Zap className="h-3.5 w-3.5 mr-1" /> Авто-назначить
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ticket info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{ticket.subject}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>Компания: <strong>{(ticket as any).companyName || "—"}</strong></span>
                <span>Назначен: <strong>{(ticket as any).assigneeName || "Не назначен"}</strong></span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Приоритет: <strong>{ticket.priority}</strong></span>
                <span>Категория: <strong>{ticket.category}</strong></span>
              </div>
              {ticket.description && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Комментарии ({filteredComments.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowInternal(!showInternal)}>
                <Lock className="h-3.5 w-3.5 mr-1" />
                {showInternal ? "Скрыть внутренние" : "Показать внутренние"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredComments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Нет комментариев</p>
              )}
              {filteredComments.map(comment => (
                <div key={comment.id} className={`flex gap-3 ${comment.isInternal ? "bg-amber-50/50 dark:bg-amber-950/20 -mx-3 px-3 py-2 rounded border-l-2 border-amber-400" : ""}`}>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {getInitials((comment as any).userName || "System")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${comment.isInternal ? "text-amber-700 dark:text-amber-400" : ""}`}>
                        {(comment as any).userName || "System"}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                      {comment.isInternal && (
                        <Badge variant="outline" className="text-[10px] h-4 border-amber-400 text-amber-600">
                          <Lock className="h-2.5 w-2.5 mr-0.5" /> Внутренняя
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                </div>
              ))}

              {/* Comment input area */}
              <div className="border-t pt-4 space-y-3">
                <Textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={isInternal ? "Добавить внутреннюю заметку..." : "Ответить клиенту..."}
                  rows={3}
                  disabled={sending}
                />

                {/* Reply buttons row */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSendComment}
                    disabled={sending || !newComment.trim()}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                    Ответить
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setIsInternal(!isInternal) }}
                    className={isInternal ? "border-amber-400 text-amber-600" : ""}
                  >
                    <Lock className="h-3.5 w-3.5 mr-1" />
                    Внутр. заметка
                  </Button>

                  <div className="border-l h-6 mx-1" />

                  {/* AI language selector */}
                  <select
                    value={aiLang}
                    onChange={e => setAiLang(e.target.value)}
                    className="h-8 px-2 text-xs border rounded-md bg-background"
                  >
                    <option value="ru">RU</option>
                    <option value="az">AZ</option>
                    <option value="en">EN</option>
                  </select>

                  {/* AI buttons */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAiAction("reply")}
                    disabled={aiLoading !== null}
                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
                  >
                    {aiLoading === "reply" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Bot className="h-3.5 w-3.5 mr-1" />}
                    AI Ответ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAiAction("summary")}
                    disabled={aiLoading !== null}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    {aiLoading === "summary" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
                    Резюме
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAiAction("steps")}
                    disabled={aiLoading !== null}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-950"
                  >
                    {aiLoading === "steps" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                    Шаги
                  </Button>
                </div>

                {isInternal && (
                  <p className="text-xs text-amber-600">Внутренняя заметка — не видна клиенту</p>
                )}

                {/* AI Result display */}
                {aiResult && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-600">
                        AI {aiResult.type === "summary" ? "Резюме" : "Шаги"}
                      </span>
                      <button onClick={() => setAiResult(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">✕</button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{aiResult.text}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inline actions: Status + Reassign */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Status change */}
              <div className="flex items-center gap-3">
                <Select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-48">
                  <option value="new">Новый</option>
                  <option value="in_progress">В работе</option>
                  <option value="waiting">Ожидание</option>
                  <option value="resolved">Решён</option>
                  <option value="closed">Закрыт</option>
                </Select>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus || newStatus === ticket.status}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                  Обновить статус
                </Button>
              </div>

              {/* Reassign */}
              <div className="flex items-center gap-3">
                <Select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="w-48">
                  <option value="">— Не назначен —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </Select>
                <Button
                  variant="outline"
                  onClick={handleReassign}
                  disabled={updatingAssignee || newAssignee === (ticket.assignedTo || "")}
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  {updatingAssignee ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
                  Переназначить
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAutoAssign}
                  disabled={updatingAssignee}
                  className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                >
                  {updatingAssignee ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                  Авто
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Детали</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Статус</span>
                <Badge className={statusStyle.className}>{statusStyle.label}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Приоритет</span>
                <Badge className={priorityStyle.className}>{priorityStyle.label}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Категория</span>
                <span>{ticket.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Создан</span>
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Обновлён</span>
                <span>{formatDate(ticket.updatedAt)}</span>
              </div>
              {ticket.tags.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Теги</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ticket.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Люди</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Назначен</span>
                <p className="font-medium">{(ticket as any).assigneeName || "Не назначен"}</p>
              </div>
              {ticket.companyId && (
                <div>
                  <span className="text-muted-foreground">Компания</span>
                  <p className="font-medium">{(ticket as any).companyName || ticket.companyId}</p>
                </div>
              )}
              {ticket.contactId && (
                <div>
                  <span className="text-muted-foreground">Контакт</span>
                  <p className="font-medium font-mono text-xs">{ticket.contactId}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> SLA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Дедлайн</span>
                <span>{ticket.slaDueAt ? formatDate(ticket.slaDueAt) : "Не задан"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Осталось</span>
                <span className={`font-mono font-medium ${sla.breached ? "text-red-600" : "text-green-600"}`}>
                  {sla.text}
                </span>
              </div>
              {ticket.firstResponseAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Первый ответ</span>
                  <span className="text-green-600">{formatDate(ticket.firstResponseAt)}</span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Решён</span>
                  <span>{formatDate(ticket.resolvedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-3.5 w-3.5" /> CSAT
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.satisfactionRating ? (
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-4 w-4 ${i <= ticket.satisfactionRating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  {ticket.satisfactionComment && (
                    <p className="text-sm text-muted-foreground mt-1">{ticket.satisfactionComment}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ещё не оценен</p>
              )}
            </CardContent>
          </Card>

          {/* Related KB Articles */}
          {kbArticles.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" /> Статьи из базы знаний
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {kbArticles.slice(0, 3).map((article: any) => (
                    <Link
                      key={article.id}
                      href={`/knowledge-base`}
                      className="block p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium line-clamp-1">{article.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{article.category || "General"}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
