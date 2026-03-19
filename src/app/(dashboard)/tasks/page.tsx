"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { TaskForm } from "@/components/task-form"
import { Select } from "@/components/ui/select"
import { CheckSquare, Plus, Clock, AlertTriangle, Pencil, Trash2, CalendarDays, ListChecks } from "lucide-react"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string
  assignedTo: string
  relatedType: string | null
  completedAt: string | null
}

type ViewMode = "list" | "kanban"

const statusLabels: Record<string, string> = {
  pending: "К выполнению",
  in_progress: "В работе",
  completed: "Выполнено",
  cancelled: "Отменено",
}

const priorityLabels: Record<string, string> = {
  urgent: "Срочный",
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
}

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
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
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

export default function TasksPage() {
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
  const orgId = session?.user?.organizationId

  async function fetchTasks() {
    try {
      const res = await fetch("/api/v1/tasks?limit=200", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setTasks(json.data.tasks)
      }
    } catch {
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
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchTasks()
    } catch {}
  }

  function handleEdit(item: Task) {
    setEditData(item)
    setFormOpen(true)
  }

  function handleAdd() {
    setEditData(undefined)
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
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchTasks()
  }

  // Filter
  const filtered = tasks.filter(t => {
    if (activeFilter === "all") return true
    return t.status === activeFilter
  }).sort((a, b) => {
    switch (sortBy) {
      case "date_asc": return new Date(a.dueDate || "9999").getTime() - new Date(b.dueDate || "9999").getTime()
      case "date_desc": return new Date(b.dueDate || "0").getTime() - new Date(a.dueDate || "0").getTime()
      case "priority": {
        const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
      }
      case "name": return a.title.localeCompare(b.title)
      default: return 0
    }
  })

  const overdue = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed").length
  const completed = tasks.filter(t => t.status === "completed").length
  const todayCount = tasks.filter(t => isToday(t.dueDate) && t.status !== "completed").length
  const weekCount = tasks.filter(t => isThisWeek(t.dueDate) && t.status !== "completed").length
  const completionPercentage = tasks.length > 0 ? Math.round(completed / tasks.length * 100) : 0

  const statusCounts: Record<string, number> = {}
  for (const t of tasks) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
  }

  const columns = [
    {
      key: "title",
      label: "Задача",
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
      label: "Категория",
      render: (item: any) => (
        <span className="text-base" title={item.relatedType || "general"}>
          {categoryIcons[item.relatedType || ""] || "📋"} <span className="text-xs text-muted-foreground">{item.relatedType || "общее"}</span>
        </span>
      ),
    },
    {
      key: "priority",
      label: "Приоритет",
      sortable: true,
      render: (item: any) => (
        <Badge variant={priorityColors[item.priority] || "secondary"}>
          {priorityLabels[item.priority] || item.priority}
        </Badge>
      ),
    },
    {
      key: "dueDate",
      label: "Срок",
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
    { key: "assignedTo", label: "Исполнитель", sortable: true },
    {
      key: "status",
      label: "Статус",
      sortable: true,
      render: (item: any) => (
        <Badge variant={item.status === "completed" ? "secondary" : item.status === "in_progress" ? "default" : item.status === "cancelled" ? "destructive" : "outline"}>
          {statusLabels[item.status] || item.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (item: any) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-muted" title="Редактировать">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Удалить">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
          </button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Задачи</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">Задачи</h1>
          <p className="text-sm text-muted-foreground">Управление задачами команды</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            <button
              onClick={() => setView("list")}
              className={cn("px-3 py-1.5 text-sm flex items-center gap-1", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              <ListChecks className="h-3.5 w-3.5" /> Список
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("px-3 py-1.5 text-sm flex items-center gap-1", view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Канбан
            </button>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Новая задача
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <StatCard title="Все" value={tasks.length} icon={<CheckSquare className="h-4 w-4" />} />
        <StatCard title="Выполнено" value={completed} trend="up" description={`${completionPercentage}%`} />
        <StatCard title="Просрочено" value={overdue} icon={<AlertTriangle className="h-4 w-4" />} trend={overdue > 0 ? "down" : "neutral"} />
        <StatCard title="В работе" value={tasks.filter(t => t.status === "in_progress").length} icon={<Clock className="h-4 w-4" />} />
        <StatCard title="Сегодня" value={todayCount} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard title="На неделе" value={weekCount} icon={<CalendarDays className="h-4 w-4" />} />
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          Все ({tasks.length})
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

      {/* Sort */}
      <div className="flex justify-end">
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[200px]">
          <option value="date_asc">Срок ↑</option>
          <option value="date_desc">Срок ↓</option>
          <option value="priority">Приоритет</option>
          <option value="name">Имя А → Я</option>
        </Select>
      </div>

      {view === "list" && (
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Поиск задач..."
          searchKey="title"
        />
      )}

      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {(["pending", "in_progress", "completed"] as const).map((status) => (
            <div key={status} className="min-w-[280px] flex-shrink-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold">{statusLabels[status]}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{filtered.filter(t => t.status === status).length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] rounded-lg border-2 border-dashed border-transparent p-2 hover:border-muted-foreground/20">
                {filtered.filter(t => t.status === status).map(task => (
                  <div key={task.id} className="rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => toggleComplete(task)}
                        className={cn(
                          "h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                          task.status === "completed" ? "border-green-500 bg-green-500" : "border-muted-foreground/30 hover:border-primary"
                        )}
                      >
                        {task.status === "completed" && <CheckSquare className="h-3 w-3 text-white" />}
                      </button>
                      <span className={cn("text-sm font-medium", task.status === "completed" && "line-through text-muted-foreground")}>{task.title}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Badge variant={priorityColors[task.priority] || "secondary"} className="text-[10px]">
                          {priorityLabels[task.priority] || task.priority}
                        </Badge>
                        <span>{categoryIcons[task.relatedType || ""] || "📋"}</span>
                      </div>
                      <span className={cn(isOverdue(task.dueDate) && task.status !== "completed" && "text-red-500 font-medium")}>
                        {formatDate(task.dueDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchTasks} initialData={editData} orgId={orgId} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title="Удалить задачу" itemName={deleteItem?.title} />
    </div>
  )
}
