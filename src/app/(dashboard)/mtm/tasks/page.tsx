"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { MtmTaskForm } from "@/components/mtm/task-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { ClipboardList, Plus, Pencil, Trash2, Search, Clock, CheckCircle2, LayoutGrid, List, User, Calendar } from "lucide-react"

const priorityColors: Record<string, string> = { LOW: "bg-muted text-muted-foreground", MEDIUM: "bg-blue-100 text-blue-700", HIGH: "bg-orange-100 text-orange-700", URGENT: "bg-red-100 text-red-600" }
const statusColors: Record<string, string> = { PENDING: "bg-muted text-muted-foreground", IN_PROGRESS: "bg-blue-100 text-blue-700", COMPLETED: "bg-green-100 text-green-700", CANCELLED: "bg-red-100 text-red-600", OVERDUE: "bg-amber-100 text-amber-700" }
const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const kanbanColumns = [
  { key: "PENDING", label: "To Do", dotClass: "bg-amber-500", countKey: "PENDING" },
  { key: "IN_PROGRESS", label: "In Progress", dotClass: "bg-blue-500", countKey: "IN_PROGRESS" },
  { key: "COMPLETED", label: "Completed", dotClass: "bg-green-500", countKey: "COMPLETED" },
]

export default function MtmTasksPage() {
  const { data: session } = useSession()
  const t = useTranslations("mtmTasksPage")
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("due_desc")
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban")
  const orgId = session?.user?.organizationId

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/v1/mtm/tasks?limit=200", { headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
      const r = await res.json()
      if (r.success) setTasks(r.data.tasks || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchTasks() }, [session])

  const filtered = tasks.filter(t2 => {
    if (activeFilter !== "all" && t2.status !== activeFilter) return false
    if (search) { const s = search.toLowerCase(); if (!t2.title?.toLowerCase().includes(s) && !t2.agent?.name?.toLowerCase().includes(s)) return false }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "due_desc": return (b.dueDate ? new Date(b.dueDate).getTime() : 0) - (a.dueDate ? new Date(a.dueDate).getTime() : 0)
      case "due_asc": return (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity)
      case "priority": return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
      case "title": return (a.title || "").localeCompare(b.title || "")
      default: return 0
    }
  })

  const statusCounts: Record<string, number> = {}
  for (const tk of tasks) statusCounts[tk.status] = (statusCounts[tk.status] || 0) + 1

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await fetch(`/api/v1/mtm/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>) },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchTasks()
    } catch {}
  }

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/tasks/${deleteItem.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchTasks()
  }

  if (loading) return (
    <div className="space-y-6">
      <PageDescription icon={ClipboardList} title={t("title")} description={t("subtitle")} />
      <div className="animate-pulse space-y-4"><div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div><div className="h-64 bg-muted rounded-lg" /></div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={ClipboardList} title={`${t("title")} (${filtered.length})`} description={t("subtitle")} />
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode === "kanban" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("kanban")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}><Plus className="h-4 w-4 mr-1" /> {t("add")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label={t("statTotal")} value={tasks.length} icon={<ClipboardList className="h-4 w-4" />} color="blue" hint={t("hintTotal")} />
        <ColorStatCard label={t("statPending")} value={statusCounts["PENDING"] || 0} icon={<Clock className="h-4 w-4" />} color="orange" hint={t("hintPending")} />
        <ColorStatCard label={t("statInProgress")} value={statusCounts["IN_PROGRESS"] || 0} icon={<ClipboardList className="h-4 w-4" />} color="teal" hint={t("hintInProgress")} />
        <ColorStatCard label={t("statCompleted")} value={statusCounts["COMPLETED"] || 0} icon={<CheckCircle2 className="h-4 w-4" />} color="green" hint={t("hintCompleted")} />
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {viewMode === "list" && (
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[160px]">
            <option value="due_desc">{t("sortDueDateDesc")}</option>
            <option value="due_asc">{t("sortDueDateAsc")}</option>
            <option value="priority">{t("sortPriority")}</option>
            <option value="title">{t("sortTitle")}</option>
          </Select>
        )}
      </div>

      {viewMode === "kanban" ? (
        /* ─── KANBAN VIEW ─── */
        <div className="grid grid-cols-3 gap-3" style={{ minHeight: 400 }}>
          {kanbanColumns.map(col => {
            const colTasks = filtered.filter(t2 => t2.status === col.key)
              .sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2))
            return (
              <div key={col.key} className="space-y-2">
                <div className="flex items-center gap-2 px-1 mb-1">
                  <span className={`w-2 h-2 rounded-full ${col.dotClass}`} />
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {colTasks.map(task => (
                    <div key={task.id} className="rounded-lg border bg-card p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium leading-tight flex-1">{task.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${priorityColors[task.priority] || ""}`}>{task.priority}</span>
                      </div>
                      {task.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{task.description}</p>}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                        {task.agent?.name && <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" /> {task.agent.name}</span>}
                        {task.dueDate && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> {new Date(task.dueDate).toLocaleDateString()}</span>}
                      </div>
                      {task.customer?.name && <div className="text-[10px] text-muted-foreground mb-2">{task.customer.name}</div>}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {col.key !== "PENDING" && (
                            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => updateTaskStatus(task.id, "PENDING")}>← To Do</Button>
                          )}
                          {col.key === "PENDING" && (
                            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 text-blue-600" onClick={() => updateTaskStatus(task.id, "IN_PROGRESS")}>Start →</Button>
                          )}
                          {col.key === "IN_PROGRESS" && (
                            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 text-green-600" onClick={() => updateTaskStatus(task.id, "COMPLETED")}>Done ✓</Button>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditData(task); setFormOpen(true) }}><Pencil className="h-2.5 w-2.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => { setDeleteItem(task); setDeleteOpen(true) }}><Trash2 className="h-2.5 w-2.5" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="h-24 flex items-center justify-center text-[10px] text-muted-foreground border border-dashed rounded-lg">No tasks</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ─── LIST VIEW ─── */
        <>
          <div className="flex flex-wrap gap-2">
            <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>{t("all")} ({tasks.length})</Button>
            {(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map(s => (
              <Button key={s} variant={activeFilter === s ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(s)}>
                {t(`filter${s === "IN_PROGRESS" ? "InProgress" : s.charAt(0) + s.slice(1).toLowerCase()}` as any)} ({statusCounts[s] || 0})
              </Button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">{tasks.length === 0 ? t("empty") : t("noResults")}</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-2 font-medium">{t("colTitle")}</th>
                  <th className="px-4 py-2 font-medium">{t("colAgent")}</th>
                  <th className="px-4 py-2 font-medium">{t("colCustomer")}</th>
                  <th className="px-4 py-2 font-medium">{t("colPriority")}</th>
                  <th className="px-4 py-2 font-medium">{t("colStatus")}</th>
                  <th className="px-4 py-2 font-medium">{t("colDueDate")}</th>
                  <th className="px-4 py-2 font-medium w-20"></th>
                </tr></thead>
                <tbody>
                  {filtered.map(task => (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{task.title}</td>
                      <td className="px-4 py-2">{task.agent?.name}</td>
                      <td className="px-4 py-2">{task.customer?.name || "—"}</td>
                      <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority] || ""}`}>{task.priority}</span></td>
                      <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status] || ""}`}>{task.status}</span></td>
                      <td className="px-4 py-2 text-muted-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2"><div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditData(task); setFormOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteItem(task); setDeleteOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <MtmTaskForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchTasks} initialData={editData} orgId={orgId ? String(orgId) : undefined} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("delete")} itemName={deleteItem?.title} />
    </div>
  )
}
