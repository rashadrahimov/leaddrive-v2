"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TaskForm } from "@/components/task-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import {
  ArrowLeft, Clock, CalendarDays, AlertTriangle, User, Calendar,
  Pencil, Trash2, Loader2, CheckCircle2, FileText, ExternalLink,
  Plus, Send, CheckSquare, Square, GripVertical, MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { InfoHint } from "@/components/info-hint"

interface ChecklistItem {
  id: string
  title: string
  completed: boolean
  sortOrder: number
}

interface TaskComment {
  id: string
  content: string
  isSystem: boolean
  createdAt: string
  user?: { id: string; name: string; avatar?: string | null } | null
}

interface TaskData {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  assignedTo: string | null
  assignee?: { id: string; name: string; avatar?: string | null } | null
  creator?: { id: string; name: string } | null
  relatedType: string | null
  relatedId: string | null
  relatedName?: string | null
  completedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  checklist?: ChecklistItem[]
  comments?: TaskComment[]
}

const STATUS_PIPELINE = ["pending", "in_progress", "completed", "cancelled"]
const STATUS_PIPELINE_COLORS: Record<string, string> = {
  pending: "bg-blue-500",
  in_progress: "bg-yellow-500",
  completed: "bg-green-500",
  cancelled: "bg-muted-foreground",
}

const STATUS_STYLES: Record<string, { className: string }> = {
  pending: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  todo: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  in_progress: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  completed: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  cancelled: { className: "bg-muted text-foreground" },
}

const PRIORITY_STYLES: Record<string, { className: string }> = {
  urgent: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  high: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  medium: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  low: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
}

const RELATED_TYPE_ROUTES: Record<string, string> = {
  deal: "/deals",
  contact: "/contacts",
  company: "/companies",
  lead: "/leads",
  ticket: "/tickets",
}

function formatDate(d: string | null) {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

function formatDateShort(d: string | null) {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
}

function formatTimeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDateShort(d)
}

function getDaysOpen(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

function getDueDateCountdown(dueDate: string | null): { text: string; overdue: boolean; urgent: boolean } {
  if (!dueDate) return { text: "\u2014", overdue: false, urgent: false }
  const diff = new Date(dueDate).getTime() - Date.now()
  if (diff <= 0) {
    const days = Math.abs(Math.floor(diff / 86400000))
    return { text: `${days}d overdue`, overdue: true, urgent: false }
  }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days === 0) return { text: `${hours}h left`, overdue: false, urgent: true }
  if (days <= 2) return { text: `${days}d ${hours}h left`, overdue: false, urgent: true }
  return { text: `${days}d left`, overdue: false, urgent: false }
}

// ─── Checklist Component ────────────────────────────────────────
function TaskChecklistSection({ taskId, orgId, items, onRefresh }: {
  taskId: string; orgId?: string; items: ChecklistItem[]; onRefresh: () => void
}) {
  const t = useTranslations("tasks")
  const [newItem, setNewItem] = useState("")
  const [adding, setAdding] = useState(false)

  async function addItem() {
    if (!newItem.trim()) return
    setAdding(true)
    try {
      await fetch(`/api/v1/tasks/${taskId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
        body: JSON.stringify({ title: newItem.trim() }),
      })
      setNewItem("")
      onRefresh()
    } catch (err) { console.error(err) }
    finally { setAdding(false) }
  }

  async function toggleItem(item: ChecklistItem) {
    await fetch(`/api/v1/tasks/${taskId}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
      body: JSON.stringify({ id: item.id, completed: !item.completed }),
    })
    onRefresh()
  }

  async function deleteItem(itemId: string) {
    await fetch(`/api/v1/tasks/${taskId}/checklist?itemId=${itemId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    onRefresh()
  }

  const completedCount = items.filter(i => i.completed).length
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            {t("checklist")}
            {items.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">
                {completedCount}/{items.length}
              </span>
            )}
          </div>
        </CardTitle>
        {items.length > 0 && (
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-muted/50">
            <button onClick={() => toggleItem(item)} className="flex-shrink-0">
              {item.completed ? (
                <CheckSquare className="h-4 w-4 text-green-500" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground/50 hover:text-primary" />
              )}
            </button>
            <span className={cn("text-sm flex-1", item.completed && "line-through text-muted-foreground")}>{item.title}</span>
            <button
              onClick={() => deleteItem(item.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-opacity"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
            </button>
          </div>
        ))}

        {/* Add new item */}
        <div className="flex items-center gap-2 pt-1">
          <Plus className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addItem() }}
            placeholder={t("addChecklistItem")}
            className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
            disabled={adding}
          />
          {newItem.trim() && (
            <Button size="sm" variant="ghost" onClick={addItem} disabled={adding} className="h-6 px-2">
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Comments Component ─────────────────────────────────────────
function TaskCommentsSection({ taskId, orgId, comments, onRefresh }: {
  taskId: string; orgId?: string; comments: TaskComment[]; onRefresh: () => void
}) {
  const t = useTranslations("tasks")
  const [newComment, setNewComment] = useState("")
  const [posting, setPosting] = useState(false)

  async function postComment() {
    if (!newComment.trim()) return
    setPosting(true)
    try {
      await fetch(`/api/v1/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      setNewComment("")
      onRefresh()
    } catch (err) { console.error(err) }
    finally { setPosting(false) }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4" />
          {t("comments")}
          {comments.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">{comments.length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Comment input */}
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment() }}
            placeholder={t("addComment")}
            rows={2}
            className="flex-1 text-sm rounded-md border px-3 py-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={posting}
          />
          <Button size="sm" onClick={postComment} disabled={!newComment.trim() || posting} className="self-end">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Comments list */}
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">{t("noComments")}</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className={cn("flex gap-2.5", comment.isSystem && "opacity-60")}>
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0 mt-0.5">
                  {comment.user?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comment.user?.name || "System"}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-0.5">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Page ──────────────────────────────────────────────────
export default function TaskDetailPage() {
  const t = useTranslations("tasks")
  const tc = useTranslations("common")
  const tab = useTranslations("abTest")
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const taskId = params.id as string
  const orgId = session?.user?.organizationId

  const [task, setTask] = useState<TaskData | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)

  // Load users for inline assignee edit
  useEffect(() => {
    fetch("/api/v1/users", { headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
      .then(r => r.json())
      .then(j => { if (j.success) setUsers((j.data?.users || j.data || []).map((u: any) => ({ id: u.id, name: u.name || u.email }))) })
      .catch(() => {})
  }, [orgId])

  const handleInlineUpdate = async (field: string, value: string) => {
    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>) },
        body: JSON.stringify({ [field]: value }),
      })
      fetchTask()
    } catch (err) { console.error(err) }
  }

  const STATUS_LABELS: Record<string, string> = {
    pending: t("statusTodo"),
    todo: t("statusTodo"),
    in_progress: t("statusInProgress"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
  }

  const PRIORITY_LABELS: Record<string, string> = {
    urgent: t("priorityUrgent"),
    high: t("priorityHigh"),
    medium: t("priorityMedium"),
    low: t("priorityLow"),
  }

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const json = await res.json()
      if (json.success) {
        setTask(json.data)
      } else {
        setError(json.error || t("failedToLoad"))
      }
    } catch {
      setError(t("failedToLoad"))
    } finally {
      setLoading(false)
    }
  }, [taskId, orgId, t])

  useEffect(() => { fetchTask() }, [fetchTask])

  const handleStatusChange = async (newStatus: string) => {
    if (!task || newStatus === task.status) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchTask()
    } catch (err) { console.error(err) } finally { setUpdatingStatus(false) }
  }

  const handleDelete = async () => {
    const res = await fetch(`/api/v1/tasks/${taskId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    router.push("/tasks")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <Link href="/tasks">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> {tc("back")}</Button>
        </Link>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {error || t("taskNotFound")}
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[task.status] || STATUS_STYLES.pending
  const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
  const daysOpen = getDaysOpen(task.createdAt)
  const dueDateInfo = getDueDateCountdown(task.dueDate)

  return (
    <div className="space-y-6">
      {/* Breadcrumbs + Header */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
        <Link href="/tasks" className="hover:text-foreground transition-colors">{t("title")}</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[400px]">{task.title}</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{task.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={statusStyle.className}>{STATUS_LABELS[task.status] || task.status}</Badge>
            <Badge className={priorityStyle.className}>{PRIORITY_LABELS[task.priority] || task.priority}</Badge>
            {task.relatedType && <Badge variant="outline" className="text-xs">{tc(task.relatedType)}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setFormOpen(true) }}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> {tc("edit")}
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {tc("delete")}
          </Button>
          {task?.dueDate && (
            <Button
              size="sm"
              variant="outline"
              disabled={syncing}
              onClick={async () => {
                setSyncing(true)
                try {
                  const res = await fetch("/api/v1/integrations/google-calendar", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
                    },
                    body: JSON.stringify({
                      summary: task.title,
                      description: task.description || "",
                      startTime: task.dueDate,
                    }),
                  })
                  const json = await res.json()
                  if (json.success) alert("Synced to Google Calendar!")
                  else if (res.status === 403 || json.error?.includes("not connected")) {
                    if (confirm("Google Calendar not connected. Go to Settings?")) {
                      window.location.href = "/settings/integrations"
                    }
                  } else alert(json.error || "Failed to sync")
                } catch { alert("Failed to sync to Google Calendar") }
                finally { setSyncing(false) }
              }}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" /> {syncing ? tab("syncing") : tab("syncToCalendar")}
            </Button>
          )}
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="flex gap-0 rounded-xl overflow-hidden border">
        {STATUS_PIPELINE.map((s, i) => {
          const isCurrent = task.status === s || (task.status === "todo" && s === "pending")
          const currentIdx = STATUS_PIPELINE.indexOf(task.status === "todo" ? "pending" : task.status)
          const isPast = i < currentIdx
          const color = STATUS_PIPELINE_COLORS[s]

          return (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`flex-1 py-2.5 px-2 text-xs font-medium text-center transition-all relative ${
                isCurrent
                  ? `${color} text-white shadow-inner`
                  : isPast
                  ? `${color}/20 text-foreground/70`
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
              disabled={updatingStatus}
            >
              {STATUS_LABELS[s] || s}
            </button>
          )
        })}
      </div>

      {/* Two-column layout: main + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {task.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> {t("description")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Checklist */}
          <TaskChecklistSection
            taskId={task.id}
            orgId={orgId ? String(orgId) : undefined}
            items={task.checklist || []}
            onRefresh={fetchTask}
          />

          {/* Comments */}
          <TaskCommentsSection
            taskId={task.id}
            orgId={orgId ? String(orgId) : undefined}
            comments={task.comments || []}
            onRefresh={fetchTask}
          />
        </div>

        {/* Right: Sidebar metadata */}
        <div className="space-y-4">
          {/* KPI cards - stacked */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500 text-white rounded-xl p-3 flex flex-col gap-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium opacity-80">{t("daysOpen")}</span>
                <Clock className="h-3.5 w-3.5 opacity-80" />
              </div>
              <span className="text-xl font-bold">{daysOpen}</span>
            </div>
            <div className={cn(
              "text-white rounded-xl p-3 flex flex-col gap-1 shadow-sm",
              dueDateInfo.overdue ? "bg-red-500" : dueDateInfo.urgent ? "bg-amber-500" : "bg-green-500"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium opacity-80">{t("colDueDate")}</span>
                <CalendarDays className="h-3.5 w-3.5 opacity-80" />
              </div>
              <span className="text-sm font-bold leading-tight">{dueDateInfo.text}</span>
            </div>
          </div>

          {/* Info card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("taskInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <label className="text-[10px] uppercase text-muted-foreground font-medium">{t("colAssignee")}</label>
                <button
                  onClick={() => setAssigneeOpen(!assigneeOpen)}
                  className="flex items-center gap-2 mt-1 w-full p-1.5 -ml-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {task.assignee ? (
                    <>
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {task.assignee.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <span className="text-sm font-medium">{task.assignee.name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">{tc("unassigned") || "Unassigned"}</span>
                  )}
                  <Pencil className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100" />
                </button>
                {assigneeOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                    <button
                      onClick={() => { handleInlineUpdate("assignedTo", ""); setAssigneeOpen(false) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors text-muted-foreground"
                    >
                      {tc("unassigned") || "Unassigned"}
                    </button>
                    {users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { handleInlineUpdate("assignedTo", u.id); setAssigneeOpen(false) }}
                        className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2", task.assignedTo === u.id && "bg-primary/5 font-medium")}
                      >
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="text-[10px] uppercase text-muted-foreground font-medium">{t("colPriority")}</label>
                <button
                  onClick={() => setPriorityOpen(!priorityOpen)}
                  className="mt-1 block cursor-pointer"
                >
                  <Badge className={cn(priorityStyle.className, "hover:opacity-80 transition-opacity")}>{PRIORITY_LABELS[task.priority] || task.priority}</Badge>
                </button>
                {priorityOpen && (
                  <div className="absolute z-50 mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                    {(["urgent", "high", "medium", "low"] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => { handleInlineUpdate("priority", p); setPriorityOpen(false) }}
                        className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2", task.priority === p && "bg-primary/5 font-medium")}
                      >
                        <Badge className={PRIORITY_STYLES[p]?.className}>{PRIORITY_LABELS[p]}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase text-muted-foreground font-medium">{t("colDueDate")}</label>
                <p className="text-sm mt-0.5">{formatDateShort(task.dueDate)}</p>
              </div>

              {task.completedAt && (
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground font-medium">{t("completedAt")}</label>
                  <p className="text-sm mt-0.5 flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {formatDate(task.completedAt)}
                  </p>
                </div>
              )}

              {task.relatedType && task.relatedId && (
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground font-medium">{t("relatedEntity")}</label>
                  <div className="mt-0.5">
                    <Link
                      href={`${RELATED_TYPE_ROUTES[task.relatedType] || "/"}/${task.relatedId}`}
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {task.relatedName ? `${tc(task.relatedType || "")} — ${task.relatedName}` : `${tc(task.relatedType || "")} — ${task.relatedId.slice(0, 8)}...`}
                    </Link>
                  </div>
                </div>
              )}

              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("createdAt")}</span>
                  <span>{formatDateShort(task.createdAt)}</span>
                </div>
                {task.creator && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Created by</span>
                    <span>{task.creator.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("updatedAt")}</span>
                  <span>{formatDateShort(task.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Form */}
      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={fetchTask}
        initialData={task}
        orgId={orgId}
      />

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t("deleteTask")}
        itemName={task.title}
      />
    </div>
  )
}
