"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { CheckSquare, Plus, Clock, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const MOCK_TASKS = [
  { id: "1", title: "Очистить историю коммуникаций", status: "pending", priority: "high", dueDate: "2026-03-16", assignedTo: "Admin" },
  { id: "2", title: "Провести телефонный звонок", status: "pending", priority: "medium", dueDate: "2026-03-20", assignedTo: "Admin" },
  { id: "3", title: "CRM prezentasiya", status: "completed", priority: "medium", dueDate: "2026-03-25", assignedTo: "Afsana" },
  { id: "4", title: "Встреча в офисе GT LLC", status: "in_progress", priority: "high", dueDate: "2026-03-18", assignedTo: "Rashad" },
  { id: "5", title: "Подготовить контракт Zeytun", status: "pending", priority: "high", dueDate: "2026-03-22", assignedTo: "Admin" },
]

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
  const [view, setView] = useState<ViewMode>("list")

  const columns = [
    {
      key: "title",
      label: "Task",
      sortable: true,
      render: (item: typeof MOCK_TASKS[0]) => (
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
      render: (item: typeof MOCK_TASKS[0]) => (
        <Badge variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "default" : "secondary"}>
          {item.priority}
        </Badge>
      ),
    },
    {
      key: "dueDate",
      label: "Due Date",
      sortable: true,
      render: (item: typeof MOCK_TASKS[0]) => (
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
      render: (item: typeof MOCK_TASKS[0]) => (
        <Badge variant={statusColors[item.status]}>{statusLabels[item.status]}</Badge>
      ),
    },
  ]

  const overdue = MOCK_TASKS.filter(t => isOverdue(t.dueDate) && t.status !== "completed").length
  const completed = MOCK_TASKS.filter(t => t.status === "completed").length

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
          <Button>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total" value={MOCK_TASKS.length} icon={<CheckSquare className="h-4 w-4" />} />
        <StatCard title="Completed" value={completed} trend="up" description={`${Math.round(completed / MOCK_TASKS.length * 100)}%`} />
        <StatCard title="Overdue" value={overdue} icon={<AlertTriangle className="h-4 w-4" />} trend={overdue > 0 ? "down" : "neutral"} />
        <StatCard title="In Progress" value={MOCK_TASKS.filter(t => t.status === "in_progress").length} icon={<Clock className="h-4 w-4" />} />
      </div>

      {view === "list" && (
        <DataTable
          columns={columns}
          data={MOCK_TASKS}
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
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{MOCK_TASKS.filter(t => t.status === status).length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] rounded-lg border-2 border-dashed border-transparent p-2 hover:border-muted-foreground/20">
                {MOCK_TASKS.filter(t => t.status === status).map(task => (
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
    </div>
  )
}
