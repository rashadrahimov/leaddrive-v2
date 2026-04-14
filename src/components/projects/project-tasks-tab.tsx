"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Plus, Pencil, Trash2, X, CheckCircle2, User, Calendar } from "lucide-react"
import { type ProjectTask, type ProjectMilestone, taskStatusColors, priorityColors, formatDate } from "./project-types"

interface ProjectTasksTabProps {
  projectId: string
  tasks: ProjectTask[]
  allTasks: ProjectTask[]
  milestones: ProjectMilestone[]
  users: { id: string; name: string }[]
  headers: Record<string, string>
  onRefresh: () => void
  getUserName: (id?: string) => string
}

export function ProjectTasksTab({ projectId, tasks, allTasks, milestones, users, headers, onRefresh, getUserName }: ProjectTasksTabProps) {
  const t = useTranslations("projects")

  const [taskViewMode, setTaskViewMode] = useState<"list" | "kanban">("list")
  const [dragTask, setDragTask] = useState<string | null>(null)
  const [taskFilterStatus, setTaskFilterStatus] = useState("all")
  const [taskFilterMilestone, setTaskFilterMilestone] = useState("all")
  const [taskFilterAssignee, setTaskFilterAssignee] = useState("all")

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskStatus, setTaskStatus] = useState("todo")
  const [taskPriority, setTaskPriority] = useState("medium")
  const [taskAssignedTo, setTaskAssignedTo] = useState("")
  const [taskMilestoneId, setTaskMilestoneId] = useState("")
  const [taskDueDate, setTaskDueDate] = useState("")
  const [taskEstHours, setTaskEstHours] = useState("")
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  const taskStatusLabels: Record<string, string> = {
    todo: t("taskTodo"), in_progress: t("taskInProgress"), review: t("taskReview"),
    done: t("taskDone"), cancelled: t("taskCancelled"),
  }
  const priorityLabels: Record<string, string> = {
    low: t("priorityLow"), medium: t("priorityMedium"), high: t("priorityHigh"), critical: t("priorityCritical"),
  }

  // Filter tasks
  const filteredTasks = allTasks.filter(task => {
    if (taskFilterStatus !== "all" && task.status !== taskFilterStatus) return false
    if (taskFilterMilestone !== "all" && (task.milestoneId || "") !== taskFilterMilestone) return false
    if (taskFilterAssignee !== "all" && (task.assignedTo || "") !== taskFilterAssignee) return false
    return true
  })

  const tasksByStatus = {
    todo: filteredTasks.filter(t2 => t2.status === "todo"),
    in_progress: filteredTasks.filter(t2 => t2.status === "in_progress"),
    review: filteredTasks.filter(t2 => t2.status === "review"),
    done: filteredTasks.filter(t2 => t2.status === "done"),
  }

  function resetTaskForm() {
    setShowTaskForm(false); setTaskTitle(""); setTaskStatus("todo"); setTaskPriority("medium")
    setTaskAssignedTo(""); setTaskMilestoneId(""); setTaskDueDate(""); setTaskEstHours(""); setEditingTaskId(null)
  }

  function openEditTask(task: ProjectTask) {
    setEditingTaskId(task.id); setTaskTitle(task.title); setTaskStatus(task.status); setTaskPriority(task.priority)
    setTaskAssignedTo(task.assignedTo || ""); setTaskMilestoneId(task.milestoneId || "")
    setTaskDueDate(task.dueDate ? task.dueDate.split("T")[0] : ""); setTaskEstHours(task.estimatedHours ? String(task.estimatedHours) : "")
    setShowTaskForm(true)
  }

  async function handleSaveTask() {
    if (!taskTitle.trim()) return
    const payload: Record<string, unknown> = {
      title: taskTitle.trim(), status: taskStatus, priority: taskPriority,
      assignedTo: taskAssignedTo || null, milestoneId: taskMilestoneId || null,
      dueDate: taskDueDate || null, estimatedHours: taskEstHours ? parseFloat(taskEstHours) : undefined,
    }
    if (editingTaskId) {
      payload.taskId = editingTaskId
      await fetch(`/api/v1/projects/${projectId}/tasks`, { method: "PUT", headers, body: JSON.stringify(payload) })
    } else {
      await fetch(`/api/v1/projects/${projectId}/tasks`, { method: "POST", headers, body: JSON.stringify(payload) })
    }
    resetTaskForm(); onRefresh()
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/v1/projects/${projectId}/tasks?taskId=${taskId}`, { method: "DELETE", headers })
    onRefresh()
  }

  async function handleKanbanDrop(taskId: string, newStatus: string) {
    await fetch(`/api/v1/projects/${projectId}/tasks`, {
      method: "PUT", headers, body: JSON.stringify({ taskId, status: newStatus }),
    })
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border p-0.5">
            <button onClick={() => setTaskViewMode("list")} className={cn("px-3 py-1.5 text-sm rounded-md transition-colors", taskViewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>List</button>
            <button onClick={() => setTaskViewMode("kanban")} className={cn("px-3 py-1.5 text-sm rounded-md transition-colors", taskViewMode === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{t("kanban")}</button>
          </div>
          <select value={taskFilterStatus} onChange={e => setTaskFilterStatus(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs">
            <option value="all">{t("status")}: All</option>
            {Object.entries(taskStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {milestones.length > 0 && (
            <select value={taskFilterMilestone} onChange={e => setTaskFilterMilestone(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs">
              <option value="all">{t("milestones")}: All</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <select value={taskFilterAssignee} onChange={e => setTaskFilterAssignee(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs">
            <option value="all">{t("assignedTo")}: All</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={() => { resetTaskForm(); setShowTaskForm(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addTask")}
        </Button>
      </div>

      {/* Task form */}
      {showTaskForm && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editingTaskId ? t("edit") : t("addTask")}</h3>
            <button onClick={resetTaskForm} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
          </div>
          <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder={t("name")} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm">
              {Object.entries(taskStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm">
              {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={taskAssignedTo} onChange={e => setTaskAssignedTo(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm">
              <option value="">— {t("assignedTo")} —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={taskMilestoneId} onChange={e => setTaskMilestoneId(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm">
              <option value="">— {t("milestones")} —</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm" />
            <input type="number" value={taskEstHours} onChange={e => setTaskEstHours(e.target.value)} placeholder={t("estimatedHours")} className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetTaskForm}>{t("cancel")}</Button>
            <Button size="sm" onClick={handleSaveTask} disabled={!taskTitle.trim()}>{editingTaskId ? t("save") : t("create")}</Button>
          </div>
        </div>
      )}

      {/* List view */}
      {taskViewMode === "list" && (
        filteredTasks.length > 0 ? (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-primary/[0.03]">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("name")}</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("status")}</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("priority")}</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("assignedTo")}</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("dueDate")}</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("milestones")}</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{task.title}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", taskStatusColors[task.status])}>{taskStatusLabels[task.status]}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColors[task.priority])}>{priorityLabels[task.priority]}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{getUserName(task.assignedTo)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(task.dueDate)}</td>
                    <td className="px-4 py-2.5">
                      {task.milestone ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.milestone.color }} />
                          <span className="text-xs">{task.milestone.name}</span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => openEditTask(task)} className="p-1 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => deleteTask(task.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tasks match filters</p>
          </div>
        )
      )}

      {/* Kanban view */}
      {taskViewMode === "kanban" && (
        <div className="grid grid-cols-4 gap-3">
          {(["todo", "in_progress", "review", "done"] as const).map(status => (
            <div key={status}
              className={cn("min-h-[200px] rounded-xl p-3 border-2 border-dashed transition-colors", dragTask ? "border-primary/30 bg-primary/5" : "border-transparent bg-muted/20")}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) handleKanbanDrop(id, status); setDragTask(null) }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", taskStatusColors[status])}>{taskStatusLabels[status]}</span>
                <span className="text-xs text-muted-foreground">{tasksByStatus[status].length}</span>
              </div>
              <div className="space-y-2">
                {tasksByStatus[status].map(task => (
                  <div key={task.id} draggable
                    onDragStart={e => { e.dataTransfer.setData("text/plain", task.id); setDragTask(task.id) }}
                    onDragEnd={() => setDragTask(null)}
                    className="rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 transition-[shadow,transform]">
                    <div className="font-medium text-sm mb-1">{task.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("px-1.5 py-0.5 rounded font-medium", priorityColors[task.priority])}>{priorityLabels[task.priority]}</span>
                      {task.assignedTo && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {getUserName(task.assignedTo)}</span>}
                    </div>
                    {task.dueDate && <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(task.dueDate)}</div>}
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
