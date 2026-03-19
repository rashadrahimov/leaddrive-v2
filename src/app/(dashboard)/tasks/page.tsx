"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { TaskForm } from "@/components/task-form"
import { CheckSquare, Plus, Clock, AlertTriangle, Pencil, Trash2 } from "lucide-react"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string
  assignedTo: string
}

type ViewMode = "list" | "kanban"

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date() && dueDate !== ""
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
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [session])

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

  const columns = [
    {
      key: "title",
      label: "Task",
      sortable: true,
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-4 w-4 rounded border-2 flex items-center justify-center",
            item.status === "completed" ? "border-green-500 bg-green-500" : "border-muted-foreground/30"
          )}>
            {item.status === "completed" && <CheckSquare className="h-3 w-3 text-white" />}
          </div>
          <span className={cn(item.status === "completed" && "line-through text-muted-foreground")}>{item.title}</span>
        </div>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (item: any) => (
        <Badge variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "default" : "secondary"}>
          {item.priority}
        </Badge>
      ),
    },
    {
      key: "dueDate",
      label: "Due Date",
      sortable: true,
      render: (item: any) => (
        <div className={cn("flex items-center gap-1 text-sm", isOverdue(item.dueDate) && item.status !== "completed" && "text-red-500 font-medium")}>
          {isOverdue(item.dueDate) && item.status !== "completed" && <AlertTriangle className="h-3 w-3" />}
          {item.dueDate || "—"}
        </div>
      ),
    },
    { key: "assignedTo", label: "Assigned", sortable: true },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: any) => (
        <Badge variant={statusColors[item.status]}>{statusLabels[item.status]}</Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-muted" title="Edit">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
          </button>
        </div>
      ),
    },
  ]

  const overdue = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed").length
  const completed = tasks.filter(t => t.status === "completed").length
  const completionPercentage = tasks.length > 0 ? Math.round(completed / tasks.length * 100) : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
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
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage your team tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            <button
              onClick={() => setView("list")}
              className={cn("px-3 py-1.5 text-sm", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              List
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("px-3 py-1.5 text-sm", view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              Kanban
            </button>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total" value={tasks.length} icon={<CheckSquare className="h-4 w-4" />} />
        <StatCard title="Completed" value={completed} trend="up" description={`${completionPercentage}%`} />
        <StatCard title="Overdue" value={overdue} icon={<AlertTriangle className="h-4 w-4" />} trend={overdue > 0 ? "down" : "neutral"} />
        <StatCard title="In Progress" value={tasks.filter(t => t.status === "in_progress").length} icon={<Clock className="h-4 w-4" />} />
      </div>

      {view === "list" && (
        <DataTable
          columns={columns}
          data={tasks}
          searchPlaceholder="Search tasks..."
          searchKey="title"
        />
      )}

      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {["pending", "in_progress", "completed"].map((status) => (
            <div key={status} className="min-w-[280px] flex-shrink-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold">{statusLabels[status]}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{tasks.filter(t => t.status === status).length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] rounded-lg border-2 border-dashed border-transparent p-2 hover:border-muted-foreground/20">
                {tasks.filter(t => t.status === status).map(task => (
                  <div key={task.id} className="rounded-lg border bg-card p-3 shadow-sm">
                    <div className="text-sm font-medium mb-1">{task.title}</div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <Badge variant={task.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{task.priority}</Badge>
                      <span>{task.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchTasks} initialData={editData} orgId={orgId} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title="Delete Task" itemName={deleteItem?.title} />
    </div>
  )
}
