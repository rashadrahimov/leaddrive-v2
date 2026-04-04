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
  ArrowLeft, Clock, CalendarDays, AlertTriangle, User,
  Pencil, Trash2, Loader2, CheckCircle2, FileText, ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { InfoHint } from "@/components/info-hint"

interface TaskData {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  assignedTo: string | null
  relatedType: string | null
  relatedId: string | null
  completedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_PIPELINE = ["pending", "in_progress", "completed", "cancelled"]
const STATUS_PIPELINE_COLORS: Record<string, string> = {
  pending: "bg-blue-500",
  in_progress: "bg-yellow-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-500",
}

const STATUS_STYLES: Record<string, { className: string }> = {
  pending: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  todo: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  in_progress: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  completed: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  cancelled: { className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
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
  return new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatDateShort(d: string | null) {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })
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

export default function TaskDetailPage() {
  const t = useTranslations("tasks")
  const tc = useTranslations("common")
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const taskId = params.id as string
  const orgId = session?.user?.organizationId

  const [task, setTask] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

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
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
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
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchTask()
    } catch (err) { console.error(err) } finally { setUpdatingStatus(false) }
  }

  const handleDelete = async () => {
    const res = await fetch(`/api/v1/tasks/${taskId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
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
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/tasks">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{task.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={statusStyle.className}>{STATUS_LABELS[task.status] || task.status}</Badge>
            <Badge className={priorityStyle.className}>{PRIORITY_LABELS[task.priority] || task.priority}</Badge>
            {task.relatedType && <Badge variant="outline" className="text-xs">{task.relatedType}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setFormOpen(true) }}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> {tc("edit")}
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {tc("delete")}
          </Button>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-500 text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">{t("daysOpen")}</span>
            <Clock className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{daysOpen}</span>
        </div>
        <div className={`${dueDateInfo.overdue ? "bg-red-500" : dueDateInfo.urgent ? "bg-amber-500" : "bg-green-500"} text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">{t("colDueDate")}</span>
            <CalendarDays className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-lg font-bold leading-tight">{dueDateInfo.text}</span>
          {task.dueDate && <span className="text-[10px] opacity-70">{formatDateShort(task.dueDate)}</span>}
        </div>
        <div className={`${task.priority === "urgent" ? "bg-red-500" : task.priority === "high" ? "bg-orange-500" : "bg-muted-foreground/50"} text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">{t("colPriority")}</span>
            <AlertTriangle className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-xl font-bold capitalize">{PRIORITY_LABELS[task.priority] || task.priority}</span>
        </div>
        <div className="bg-indigo-500 text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">{t("colAssignee")}</span>
            <User className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-lg font-bold leading-tight truncate">{task.assignedTo || "\u2014"}</span>
        </div>
      </div>

      {/* Task Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> {t("taskDetails")} <InfoHint text={t("hintColTitle")} size={12} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("colTask")}</label>
              <p className="text-sm font-medium mt-0.5">{task.title}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">{t("colStatus")} <InfoHint text={t("hintColStatus")} size={12} /></label>
              <div className="mt-0.5">
                <Badge className={statusStyle.className}>{STATUS_LABELS[task.status] || task.status}</Badge>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">{t("description")}</label>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{task.description || "\u2014"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">{t("colAssignee")} <InfoHint text={t("hintColAssigned")} size={12} /></label>
              <p className="text-sm mt-0.5">{task.assignedTo || "\u2014"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">{t("colPriority")} <InfoHint text={t("hintColPriority")} size={12} /></label>
              <div className="mt-0.5">
                <Badge className={priorityStyle.className}>{PRIORITY_LABELS[task.priority] || task.priority}</Badge>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">{t("colDueDate")} <InfoHint text={t("hintColDueDate")} size={12} /></label>
              <p className="text-sm mt-0.5">{formatDate(task.dueDate)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("completedAt")}</label>
              <p className="text-sm mt-0.5">
                {task.completedAt ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {formatDate(task.completedAt)}
                  </span>
                ) : "\u2014"}
              </p>
            </div>
            {task.relatedType && task.relatedId && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("relatedEntity")}</label>
                <div className="mt-0.5">
                  <Link
                    href={`${RELATED_TYPE_ROUTES[task.relatedType] || "/"}/${task.relatedId}`}
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {task.relatedType} / {task.relatedId.slice(0, 8)}...
                  </Link>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("createdAt")}</label>
              <p className="text-sm mt-0.5">{formatDate(task.createdAt)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("updatedAt")}</label>
              <p className="text-sm mt-0.5">{formatDate(task.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
