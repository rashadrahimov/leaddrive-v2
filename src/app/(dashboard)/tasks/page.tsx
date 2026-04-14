"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { ColorStatCard } from "@/components/color-stat-card"
import { InfoHint } from "@/components/info-hint"
import { PageDescription } from "@/components/page-description"
import { TaskForm } from "@/components/task-form"
import { Select } from "@/components/ui/select"
import { CheckSquare, Plus, Clock, AlertTriangle, Pencil, Trash2, CalendarDays, ListChecks, ChevronLeft, ChevronRight, Link2, Copy, Check, ExternalLink, Columns3, User2, CheckCircle2, X } from "lucide-react"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { cn } from "@/lib/utils"
import { MotionList, MotionItem } from "@/components/ui/motion"

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string
  assignedTo: string
  assignee?: { id: string; name: string; avatar?: string | null } | null
  creator?: { id: string; name: string } | null
  relatedType: string | null
  relatedName?: string | null
  completedAt: string | null
  createdAt: string
  _count?: { checklist: number; comments: number }
}

type ViewMode = "list" | "kanban" | "calendar"

const priorityColors: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  urgent: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
}

const categoryIcons: Record<string, string> = {
  call: "📞",
  email: "📧",
  meeting: "🤝",
  deal: "💰",
  contact: "👤",
  company: "🏢",
  lead: "🎯",
  ticket: "🎫",
}

function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isTodayDate(year: number, month: number, day: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
}

function isThisWeek(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  return d >= startOfWeek && d < endOfWeek
}

// ─── Calendar Integration Modal ─────────────────────────────────
function CalendarIntegrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("tasks")
  const [token, setToken] = useState<string | null>(null)
  const [feedUrl, setFeedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      fetch("/api/v1/calendar/token").then(r => r.json()).then(j => {
        if (j.success) {
          setToken(j.data.token)
          setFeedUrl(j.data.feedUrl)
        }
      }).catch(() => {})
    }
  }, [open])

  async function generateToken() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/calendar/generate-token", { method: "POST" })
      const json = await res.json()
      if (json.success) {
        setToken(json.data.token)
        setFeedUrl(json.data.feedUrl)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  async function copyUrl() {
    if (!feedUrl) return
    try {
      await navigator.clipboard.writeText(feedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) { console.error(err) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Link2 className="h-5 w-5" /> {t("connectCalendar")}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t("calendarSubscribeDesc")}
        </p>

        {feedUrl ? (
          <>
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">{t("calendarLinkLabel")}</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={feedUrl}
                  className="flex-1 text-xs bg-muted px-3 py-2 rounded-md border font-mono truncate"
                />
                <Button size="sm" variant="outline" onClick={copyUrl}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <h3 className="text-sm font-semibold">{t("calendarInstructions")}:</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <span className="font-medium text-foreground min-w-[120px]">{t("appleCalendar")}</span>
                  <span>{t("appleCalendarInstr")}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium text-foreground min-w-[120px]">{t("googleCalendar")}</span>
                  <span>{t("googleCalendarInstr")}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium text-foreground min-w-[120px]">{t("outlookCalendar")}</span>
                  <span>{t("outlookCalendarInstr")}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={feedUrl.replace("https://", "webcal://").replace("http://", "webcal://")}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {t("calendarOpenInApp")}
              </a>
              <span className="text-muted-foreground">·</span>
              <button onClick={generateToken} disabled={loading} className="text-sm text-muted-foreground hover:text-foreground">
                {t("calendarGenerateNew")}
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-xs text-yellow-700 dark:text-yellow-300">
              {t("calendarWarning")}
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">{t("calendarNoLink")}</p>
            <Button onClick={generateToken} disabled={loading}>
              {loading ? t("calendarGenerating") : t("calendarGenerateBtn")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Calendar Grid Component ────────────────────────────────────
function TaskCalendar({ tasks, orgId, onTaskClick }: { tasks: Task[]; orgId?: string; onTaskClick?: (id: string) => void }) {
  const t = useTranslations("tasks")
  const tc = useTranslations("common")
  const now = new Date()
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calTasks, setCalTasks] = useState<Task[]>([])

  const monthNames = [
    t("monthJan"), t("monthFeb"), t("monthMar"), t("monthApr"), t("monthMay"), t("monthJun"),
    t("monthJul"), t("monthAug"), t("monthSep"), t("monthOct"), t("monthNov"), t("monthDec")
  ]

  const dayNames = [t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat"), t("daySun")]

  const priorityLabels: Record<string, string> = {
    urgent: t("priorityUrgent"),
    high: t("priorityHigh"),
    medium: t("priorityMedium"),
    low: t("priorityLow"),
  }

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/tasks/calendar?month=${calMonth + 1}&year=${calYear}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const json = await res.json()
      if (json.success) setCalTasks(json.data.tasks)
    } catch (err) { console.error(err) }
  }, [calMonth, calYear, orgId])

  useEffect(() => { fetchCalendar() }, [fetchCalendar])

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const tasksByDay: Record<number, Task[]> = {}
  for (const task of calTasks) {
    if (!task.dueDate) continue
    const d = new Date(task.dueDate)
    const day = d.getDate()
    if (!tasksByDay[day]) tasksByDay[day] = []
    tasksByDay[day].push(task)
  }

  const firstDay = new Date(calYear, calMonth, 1)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-lg">
            {monthNames[calMonth]} {calYear}
          </h3>
          <Button variant="outline" size="sm" onClick={() => { setCalMonth(now.getMonth()); setCalYear(now.getFullYear()) }}>
            {tc("today") || "Today"}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden border">
        {dayNames.map(d => (
          <div key={d} className="bg-muted py-2 text-center text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={cn(
              "bg-background min-h-[100px] p-1.5",
              day === null && "bg-muted/30",
              day && isTodayDate(calYear, calMonth, day) && "ring-2 ring-inset ring-primary/50 bg-primary/5"
            )}
          >
            {day && (
              <>
                <div className={cn(
                  "text-xs font-medium mb-1",
                  isTodayDate(calYear, calMonth, day) && "text-primary font-bold"
                )}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {(tasksByDay[day] || []).slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick?.(task.id)}
                      className={cn(
                        "text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity",
                        task.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : task.priority === "high" || task.priority === "urgent"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-muted text-foreground/70"
                      )}
                      title={`${task.title} — ${priorityLabels[task.priority] || task.priority}`}
                    >
                      {categoryIcons[task.relatedType || ""] || ""} {task.title}
                    </div>
                  ))}
                  {(tasksByDay[day] || []).length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{(tasksByDay[day] || []).length - 3}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bulk Actions Bar ───────────────────────────────────────────
function BulkActionsBar({ selectedIds, onAction, onClear }: {
  selectedIds: Set<string>
  onAction: (action: string, value?: string) => void
  onClear: () => void
}) {
  const t = useTranslations("tasks")
  const tc = useTranslations("common")
  if (selectedIds.size === 0) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-lg">
      <span className="text-sm font-medium">{selectedIds.size} {t("selected")}</span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={() => onAction("complete")}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t("markComplete")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction("delete")} className="text-red-600 hover:text-red-700">
          <Trash2 className="h-3.5 w-3.5 mr-1" /> {tc("delete")}
        </Button>
      </div>
      <button onClick={onClear} className="ml-auto p-1 rounded hover:bg-muted">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────
export default function TasksPage() {
  const t = useTranslations("tasks")
  const tc = useTranslations("common")
  const router = useRouter()
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<ViewMode>("list")
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, any> | undefined>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Task | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState("date_asc")
  const [calModalOpen, setCalModalOpen] = useState(false)
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dragTask, setDragTask] = useState<string | null>(null)
  const orgId = session?.user?.organizationId
  const currentUserId = session?.user?.id

  const statusLabels: Record<string, string> = {
    pending: t("statusTodo"),
    todo: t("statusTodo"),
    in_progress: t("statusInProgress"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
  }

  const priorityLabels: Record<string, string> = {
    urgent: t("priorityUrgent"),
    high: t("priorityHigh"),
    medium: t("priorityMedium"),
    low: t("priorityLow"),
  }

  async function fetchTasks() {
    try {
      const res = await fetch("/api/v1/tasks?limit=200", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const json = await res.json()
      if (json.success) {
        setTasks(json.data.tasks)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [session])

  async function toggleComplete(task: Task) {
    const newStatus = task.status === "completed" ? "pending" : "completed"
    try {
      await fetch(`/api/v1/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchTasks()
    } catch (err) { console.error(err) }
  }

  function handleEdit(item: Task) {
    setEditData(item)
    setFormOpen(true)
  }

  function handleAdd(presetStatus?: string) {
    setEditData(presetStatus ? { status: presetStatus } : undefined)
    setFormOpen(true)
  }

  function handleDelete(item: Task) {
    setDeleteItem(item)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/tasks/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchTasks()
  }

  // Selection helpers
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)))
    }
  }

  async function handleBulkAction(action: string, value?: string) {
    if (selectedIds.size === 0) return
    try {
      const res = await fetch("/api/v1/tasks/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify({ ids: Array.from(selectedIds), action, value }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        fetchTasks()
      }
    } catch (err) { console.error(err) }
  }

  // Kanban drag handlers
  async function handleKanbanDrop(taskId: string, newStatus: string) {
    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify({ status: newStatus }),
      })
      // Optimistic update
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus, completedAt: newStatus === "completed" ? new Date().toISOString() : t.completedAt } : t
      ))
    } catch (err) { console.error(err) }
    setDragTask(null)
  }

  // Filter + sort
  let filtered = tasks.filter(t => {
    if (activeFilter === "all") return true
    if (activeFilter === "pending") return t.status === "pending" || t.status === "todo"
    return t.status === activeFilter
  })

  // My Tasks filter
  if (myTasksOnly && currentUserId) {
    filtered = filtered.filter(t => t.assignedTo === currentUserId)
  }

  filtered = filtered.sort((a, b) => {
    switch (sortBy) {
      case "date_asc": return new Date(a.dueDate || "9999").getTime() - new Date(b.dueDate || "9999").getTime()
      case "date_desc": return new Date(b.dueDate || "0").getTime() - new Date(a.dueDate || "0").getTime()
      case "priority": {
        const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
      }
      case "created_desc": return new Date(b.createdAt || "0").getTime() - new Date(a.createdAt || "0").getTime()
      case "name": return a.title.localeCompare(b.title)
      default: return 0
    }
  })

  const overdue = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed").length
  const completed = tasks.filter(t => t.status === "completed").length
  const todayCount = tasks.filter(t => isToday(t.dueDate) && t.status !== "completed").length
  const weekCount = tasks.filter(t => isThisWeek(t.dueDate) && t.status !== "completed").length

  const statusCounts: Record<string, number> = {}
  for (const t of tasks) {
    const key = t.status === "todo" ? "pending" : t.status
    statusCounts[key] = (statusCounts[key] || 0) + 1
  }

  const columns = [
    {
      key: "_select",
      label: (
        <input
          type="checkbox"
          checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
          onChange={toggleSelectAll}
          className="h-4 w-4 rounded border-muted-foreground/30"
        />
      ),
      className: "w-10",
      render: (item: any) => (
        <input
          type="checkbox"
          checked={selectedIds.has(item.id)}
          onChange={(e) => { e.stopPropagation(); toggleSelect(item.id) }}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-muted-foreground/30"
        />
      ),
    },
    {
      key: "title",
      label: t("colTask"),
      hint: t("hintColTitle"),
      sortable: true,
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleComplete(item) }}
            className={cn(
              "h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
              item.status === "completed" ? "border-green-500 bg-green-500" : "border-muted-foreground/30 hover:border-primary"
            )}
          >
            {item.status === "completed" && <CheckSquare className="h-3.5 w-3.5 text-white" />}
          </button>
          <span className={cn(item.status === "completed" && "line-through text-muted-foreground")}>{item.title}</span>
        </div>
      ),
    },
    {
      key: "relatedType",
      label: t("colCategory"),
      hint: t("hintColRelated"),
      render: (item: any) => (
        <span className="text-base" title={item.relatedName ? `${tc(item.relatedType || "")}: ${item.relatedName}` : (item.relatedType ? tc(item.relatedType) : t("generalCategory"))}>
          {categoryIcons[item.relatedType || ""] || "📋"} <span className="text-xs text-muted-foreground">{item.relatedName ? `${tc(item.relatedType || "")}: ${item.relatedName}` : (item.relatedType ? tc(item.relatedType) : t("generalCategory"))}</span>
        </span>
      ),
    },
    {
      key: "priority",
      label: t("colPriority"),
      hint: t("hintColPriority"),
      sortable: true,
      render: (item: any) => (
        <Badge variant={priorityColors[item.priority] || "secondary"}>
          {priorityLabels[item.priority] || item.priority}
        </Badge>
      ),
    },
    {
      key: "dueDate",
      label: t("colDueDate"),
      hint: t("hintColDueDate"),
      sortable: true,
      render: (item: any) => (
        <div className={cn(
          "flex items-center gap-1 text-sm",
          isOverdue(item.dueDate) && item.status !== "completed" && "text-red-500 font-medium",
          isToday(item.dueDate) && item.status !== "completed" && !isOverdue(item.dueDate) && "text-orange-500 font-medium"
        )}>
          {isOverdue(item.dueDate) && item.status !== "completed" && <AlertTriangle className="h-3 w-3" />}
          {formatDate(item.dueDate)}
        </div>
      ),
    },
    {
      key: "assignedTo",
      label: t("colAssignee"),
      hint: t("hintColAssigned"),
      sortable: true,
      render: (item: any) => (
        <div className="flex items-center gap-1.5">
          {item.assignee ? (
            <>
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                {item.assignee.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <span className="text-sm truncate max-w-[120px]">{item.assignee.name}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: t("colStatus"),
      hint: t("hintColStatus"),
      sortable: true,
      render: (item: any) => (
        <Badge variant={item.status === "completed" ? "secondary" : item.status === "in_progress" ? "default" : item.status === "cancelled" ? "destructive" : "outline"}>
          {statusLabels[item.status] || t("statusTodo")}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (item: any) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-muted" title={tc("edit")}>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title={tc("delete")}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
          </button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          <PageDescription text={t("pageDescription")} />
        </div>
        <div className="flex items-center gap-2">
          {/* My Tasks toggle */}
          <Button
            variant={myTasksOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setMyTasksOnly(!myTasksOnly)}
          >
            <User2 className="h-3.5 w-3.5 mr-1" /> {t("myTasks") || "My Tasks"}
          </Button>

          <div className="flex rounded-lg border">
            <button
              onClick={() => setView("list")}
              className={cn("px-3 py-1.5 text-sm flex items-center gap-1", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              <ListChecks className="h-3.5 w-3.5" /> {t("list")}
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("px-3 py-1.5 text-sm flex items-center gap-1", view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              <Columns3 className="h-3.5 w-3.5" /> {t("kanban")}
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn("px-3 py-1.5 text-sm flex items-center gap-1", view === "calendar" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              <CalendarDays className="h-3.5 w-3.5" /> {t("calendar")}
            </button>
          </div>
          <Button variant="outline" onClick={() => setCalModalOpen(true)}>
            <Link2 className="h-4 w-4 mr-1" /> {t("connectCalendar")}
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> {t("newTask")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
        <ColorStatCard label={t("statAll")} value={tasks.length} icon={<CheckSquare className="h-4 w-4" />} color="blue" hint={t("hintTotalTasks")} />
        <ColorStatCard label={t("statCompleted")} value={completed} icon={<CheckSquare className="h-4 w-4" />} color="green" hint={t("hintCompletedWeek")} />
        <ColorStatCard label={t("statOverdue")} value={overdue} icon={<AlertTriangle className="h-4 w-4" />} color="red" hint={t("hintOverdueTasks")} />
        <ColorStatCard label={t("statInProgress")} value={tasks.filter(t => t.status === "in_progress").length} icon={<Clock className="h-4 w-4" />} color="amber" hint={t("hintCompletionRate")} />
        <ColorStatCard label={t("statToday")} value={todayCount} icon={<CalendarDays className="h-4 w-4" />} color="violet" />
        <ColorStatCard label={t("statThisWeek")} value={weekCount} icon={<CalendarDays className="h-4 w-4" />} color="indigo" />
      </div>

      {/* Bulk actions bar */}
      <BulkActionsBar selectedIds={selectedIds} onAction={handleBulkAction} onClear={() => setSelectedIds(new Set())} />

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          {t("statAll")} ({tasks.length})
        </Button>
        {(["pending", "in_progress", "completed", "cancelled"] as const).map(key => (
          <Button
            key={key}
            variant={activeFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(key)}
          >
            {statusLabels[key]} ({statusCounts[key] || 0})
          </Button>
        ))}
      </div>

      {/* Sort (not shown in calendar view) */}
      {view !== "calendar" && (
        <div className="flex justify-end">
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[200px]">
            <option value="date_asc">{t("sortDueDateAsc")}</option>
            <option value="date_desc">{t("sortDueDateDesc")}</option>
            <option value="created_desc">{t("sortCreatedDesc")}</option>
            <option value="priority">{t("sortPriority")}</option>
            <option value="name">{t("sortNameAsc")}</option>
          </Select>
        </div>
      )}

      {view === "list" && (
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder={t("searchPlaceholder")}
          searchKey="title"
          onRowClick={(item: any) => router.push(`/tasks/${item.id}`)}
          rowClassName={(item: any) =>
            isOverdue(item.dueDate) && item.status !== "completed" && item.status !== "cancelled"
              ? "!bg-red-100/70 dark:!bg-red-950/40"
              : ""
          }
        />
      )}

      {view === "kanban" && (
        <KanbanView
          filtered={filtered}
          statusLabels={statusLabels}
          priorityLabels={priorityLabels}
          priorityColors={priorityColors}
          dragTask={dragTask}
          setDragTask={setDragTask}
          handleKanbanDrop={handleKanbanDrop}
          toggleComplete={toggleComplete}
          handleAdd={handleAdd}
          router={router}
          formatDate={formatDate}
          isOverdue={isOverdue}
        />
      )}

      {view === "calendar" && (
        <TaskCalendar tasks={tasks} orgId={orgId ? String(orgId) : undefined} onTaskClick={(id) => router.push(`/tasks/${id}`)} />
      )}

      <TaskForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchTasks} initialData={editData} orgId={orgId} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("deleteTask")} itemName={deleteItem?.title} />
      <CalendarIntegrationModal open={calModalOpen} onClose={() => setCalModalOpen(false)} />
    </div>
  )
}

// ─── Kanban View with collapse ─────────────────────────────────
function KanbanView({ filtered, statusLabels, priorityLabels, priorityColors, dragTask, setDragTask, handleKanbanDrop, toggleComplete, handleAdd, router, formatDate, isOverdue }: any) {
  const t = useTranslations("tasks")
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({})
  const COLLAPSE_LIMIT = 10

  return (
        <MotionList className="flex gap-4 overflow-x-auto pb-4" staggerDelay={0.08}>
          {(["pending", "in_progress", "completed"] as const).map((status) => {
            const columnTasks = filtered.filter((t: any) => status === "pending" ? (t.status === "pending" || t.status === "todo") : t.status === status)
            const isExpanded = expandedCols[status] || false
            const visibleTasks = columnTasks.length > COLLAPSE_LIMIT && !isExpanded ? columnTasks.slice(0, COLLAPSE_LIMIT) : columnTasks
            const hiddenCount = columnTasks.length - COLLAPSE_LIMIT
            return (
              <MotionItem key={status} className="min-w-[300px] flex-shrink-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">{statusLabels[status]}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{columnTasks.length}</span>
                  <button
                    onClick={() => handleAdd(status)}
                    className="ml-auto p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={t("newTask")}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div
                  className={cn(
                    "space-y-2 min-h-[200px] rounded-lg border-2 border-dashed p-2 transition-colors",
                    dragTask ? "border-primary/30 bg-primary/5" : "border-transparent hover:border-muted-foreground/20"
                  )}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move" }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const taskId = e.dataTransfer.getData("text/plain")
                    if (taskId) handleKanbanDrop(taskId, status)
                  }}
                >
                  {visibleTasks.map((task: any) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e: any) => { e.dataTransfer.setData("text/plain", task.id); setDragTask(task.id) }}
                      onDragEnd={() => setDragTask(null)}
                      className={cn(
                        "rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 transition-[shadow,transform] duration-200",
                        dragTask === task.id && "opacity-50"
                      )}
                      onClick={() => router.push(`/tasks/${task.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={(e: any) => { e.stopPropagation(); toggleComplete(task) }}
                          className={cn(
                            "h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                            task.status === "completed" ? "border-green-500 bg-green-500" : "border-muted-foreground/30 hover:border-primary"
                          )}
                        >
                          {task.status === "completed" && <CheckSquare className="h-3 w-3 text-white" />}
                        </button>
                        <span className={cn("text-sm font-medium truncate", task.status === "completed" && "line-through text-muted-foreground")}>{task.title}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={priorityColors[task.priority] || "secondary"} className="text-[10px]">
                            {priorityLabels[task.priority] || task.priority}
                          </Badge>
                          <span>{categoryIcons[task.relatedType || ""] || "📋"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {task.assignee && (
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary" title={task.assignee.name}>
                              {task.assignee.name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <span className={cn(isOverdue(task.dueDate) && task.status !== "completed" && "text-red-500 font-medium")}>
                            {formatDate(task.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {columnTasks.length > COLLAPSE_LIMIT && !isExpanded && (
                    <button
                      onClick={() => setExpandedCols(prev => ({ ...prev, [status]: true }))}
                      className="w-full text-center py-2 text-xs text-primary hover:underline"
                    >
                      {t("showMore", { count: hiddenCount }) || `Show ${hiddenCount} more...`}
                    </button>
                  )}
                  {isExpanded && columnTasks.length > COLLAPSE_LIMIT && (
                    <button
                      onClick={() => setExpandedCols(prev => ({ ...prev, [status]: false }))}
                      className="w-full text-center py-2 text-xs text-muted-foreground hover:underline"
                    >
                      {t("showLess") || "Show less"}
                    </button>
                  )}
                </div>
              </MotionItem>
            )
          })}
        </MotionList>
  )
}
