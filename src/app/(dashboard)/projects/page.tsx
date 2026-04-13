"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { ColorStatCard } from "@/components/color-stat-card"
import { PageDescription } from "@/components/page-description"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import {
  FolderKanban, Plus, Pencil, Trash2, Building2,
  CalendarDays, Users, CheckCircle2, Clock, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/constants"

interface Project {
  id: string
  name: string
  code?: string
  description?: string
  status: string
  priority: string
  startDate?: string
  endDate?: string
  budget: number
  actualCost: number
  currency: string
  completionPercentage: number
  managerId?: string
  companyId?: string
  company?: { id: string; name: string } | null
  color: string
  tags: string[]
  createdAt: string
  updatedAt: string
  _count?: { tasks: number; members: number; milestones: number }
}

const statusColors: Record<string, string> = {
  planning: "bg-muted text-foreground/70",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
}

export default function ProjectsPage() {
  const { data: session } = useSession()
  const t = useTranslations("projects")
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Project | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [detailProject, setDetailProject] = useState<Project | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formStatus, setFormStatus] = useState("planning")
  const [formPriority, setFormPriority] = useState("medium")
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")
  const [formBudget, setFormBudget] = useState("")
  const [formColor, setFormColor] = useState("#6366f1")
  const [saving, setSaving] = useState(false)

  const orgId = session?.user?.organizationId

  const statusLabels: Record<string, string> = {
    planning: t("statusPlanning"),
    active: t("statusActive"),
    on_hold: t("statusOnHold"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
  }

  const priorityLabels: Record<string, string> = {
    low: t("priorityLow"),
    medium: t("priorityMedium"),
    high: t("priorityHigh"),
    critical: t("priorityCritical"),
  }

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/projects?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const json = await res.json()
      if (json.success) {
        setProjects(json.data.projects)
        setTotal(json.data.total)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  function resetForm() {
    setFormName("")
    setFormDesc("")
    setFormStatus("planning")
    setFormPriority("medium")
    setFormStartDate("")
    setFormEndDate("")
    setFormBudget("")
    setFormColor("#6366f1")
  }

  function openCreate() {
    resetForm()
    setEditData(undefined)
    setShowForm(true)
  }

  function openEdit(project: Project) {
    setEditData(project)
    setFormName(project.name)
    setFormDesc(project.description || "")
    setFormStatus(project.status)
    setFormPriority(project.priority)
    setFormStartDate(project.startDate ? project.startDate.split("T")[0] : "")
    setFormEndDate(project.endDate ? project.endDate.split("T")[0] : "")
    setFormBudget(project.budget ? String(project.budget) : "")
    setFormColor(project.color || "#6366f1")
    setShowForm(true)
  }

  async function handleSave() {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        status: formStatus,
        priority: formPriority,
        startDate: formStartDate || undefined,
        endDate: formEndDate || undefined,
        budget: formBudget ? parseFloat(formBudget) : undefined,
        color: formColor,
      }

      const url = editData ? `/api/v1/projects/${editData.id}` : "/api/v1/projects"
      const method = editData ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowForm(false)
        resetForm()
        fetchProjects()
      }
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/projects/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchProjects()
  }

  // Filter
  const filtered = projects.filter(p => {
    if (activeFilter === "all") return true
    return p.status === activeFilter
  })

  // Stats
  const activeCount = projects.filter(p => p.status === "active").length
  const completedCount = projects.filter(p => p.status === "completed").length
  const overdueCount = projects.filter(p => {
    if (!p.endDate || p.status === "completed" || p.status === "cancelled") return false
    return new Date(p.endDate) < new Date()
  }).length

  const statusCounts: Record<string, number> = {}
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  }

  const columns = [
    {
      key: "name",
      label: t("name"),
      sortable: true,
      render: (item: Project) => (
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <div>
            <div className="font-medium">{item.name}</div>
            {item.code && <div className="text-xs text-muted-foreground font-mono">{item.code}</div>}
          </div>
        </div>
      ),
    },
    {
      key: "company",
      label: t("company"),
      sortable: true,
      render: (item: Project) => (
        <div className="flex items-center gap-1.5">
          {item.company ? (
            <>
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{item.company.name}</span>
            </>
          ) : <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      key: "status",
      label: t("status"),
      hint: t("hintColStatus"),
      sortable: true,
      render: (item: Project) => (
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[item.status])}>
          {statusLabels[item.status] || item.status}
        </span>
      ),
    },
    {
      key: "priority",
      label: t("priority"),
      hint: t("hintColPriority"),
      sortable: true,
      render: (item: Project) => (
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColors[item.priority])}>
          {priorityLabels[item.priority] || item.priority}
        </span>
      ),
    },
    {
      key: "completion",
      label: t("completion"),
      hint: t("hintColCompletion"),
      sortable: true,
      render: (item: Project) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${item.completionPercentage}%`,
                backgroundColor: item.completionPercentage === 100 ? "#22c55e" : item.color,
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{item.completionPercentage}%</span>
        </div>
      ),
    },
    {
      key: "tasks",
      label: t("tasks"),
      render: (item: Project) => (
        <span className="text-sm text-muted-foreground">{item._count?.tasks || 0}</span>
      ),
    },
    {
      key: "endDate",
      label: t("endDate"),
      sortable: true,
      render: (item: Project) => {
        const isOverdue = item.endDate && new Date(item.endDate) < new Date() && item.status !== "completed" && item.status !== "cancelled"
        return (
          <span className={cn("text-sm", isOverdue && "text-red-500 font-medium")}>
            {formatDate(item.endDate)}
          </span>
        )
      },
    },
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (item: Project) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => { setDeleteId(item.id); setDeleteName(item.name) }}
            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          >
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
          <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
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
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> {t("newProject")}
        </Button>
      </div>

      <PageDescription text={t("pageDescription")} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ColorStatCard label={t("kpiTotal")} value={total} icon={<FolderKanban className="h-4 w-4" />} color="indigo" hint={t("hintTotalProjects")} />
        <ColorStatCard label={t("kpiActive")} value={activeCount} icon={<Clock className="h-4 w-4" />} color="green" hint={t("hintActiveProjects")} />
        <ColorStatCard label={t("kpiCompleted")} value={completedCount} icon={<CheckCircle2 className="h-4 w-4" />} color="blue" />
        <ColorStatCard label={t("kpiOverdue")} value={overdueCount} icon={<CalendarDays className="h-4 w-4" />} color="red" />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>
          {t("allProjects")} ({total})
        </Button>
        {(["planning", "active", "on_hold", "completed", "cancelled"] as const).map(key => (
          statusCounts[key] ? (
            <Button key={key} variant={activeFilter === key ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(key)}>
              {statusLabels[key]} ({statusCounts[key]})
            </Button>
          ) : null
        ))}
      </div>

      {filtered.length > 0 ? (
        <DataTable
          columns={columns as any}
          data={filtered as any}
          searchPlaceholder={t("searchPlaceholder")}
          searchKey="name"
          onRowClick={(item: any) => setDetailProject(item)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">{t("noProjects")}</h3>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">{t("noProjectsHint")}</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> {t("newProject")}
          </Button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{editData ? t("save") : t("newProject")}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("name")} *</label>
                  <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={t("name")}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">{t("description")}</label>
                  <textarea
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("status")}</label>
                    <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("priority")}</label>
                    <select value={formPriority} onChange={e => setFormPriority(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("startDate")}</label>
                    <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("endDate")}</label>
                    <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("budget")} ({getCurrencySymbol()})</label>
                    <input type="number" value={formBudget} onChange={e => setFormBudget(e.target.value)} placeholder="0" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("color")}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={formColor} onChange={e => setFormColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                      <span className="text-xs text-muted-foreground font-mono">{formColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>{t("cancel")}</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving || !formName.trim()}>
                  {saving ? "..." : editData ? t("save") : t("create")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={t("delete")}
        itemName={deleteName}
      />

      {/* Detail Panel */}
      {detailProject && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setDetailProject(null)}>
          <div className="w-full max-w-lg bg-background shadow-xl h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: detailProject.color }} />
                  <h2 className="text-lg font-bold">{detailProject.name}</h2>
                </div>
                <button onClick={() => setDetailProject(null)} className="p-1 hover:bg-muted rounded"><X className="h-5 w-5" /></button>
              </div>

              {detailProject.code && (
                <div className="text-xs font-mono text-muted-foreground mb-3">{detailProject.code}</div>
              )}

              <div className="space-y-4">
                {detailProject.description && (
                  <p className="text-sm text-muted-foreground">{detailProject.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground text-xs">{t("status")}</div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block", statusColors[detailProject.status])}>
                      {statusLabels[detailProject.status]}
                    </span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground text-xs">{t("priority")}</div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block", priorityColors[detailProject.priority])}>
                      {priorityLabels[detailProject.priority]}
                    </span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground text-xs">{t("completion")}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${detailProject.completionPercentage}%`, backgroundColor: detailProject.color }} />
                      </div>
                      <span className="font-bold text-sm">{detailProject.completionPercentage}%</span>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground text-xs">{t("budget")}</div>
                    <div className="font-bold mt-1">{detailProject.budget ? `${detailProject.budget.toLocaleString()} ${detailProject.currency}` : "—"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground text-xs">{t("startDate")}</div>
                    <div className="font-medium mt-1">{formatDate(detailProject.startDate)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground text-xs">{t("endDate")}</div>
                    <div className="font-medium mt-1">{formatDate(detailProject.endDate)}</div>
                  </div>
                </div>

                {detailProject.company && (
                  <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{detailProject.company.name}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-lg font-bold">{detailProject._count?.tasks || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("tasks")}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-lg font-bold">{detailProject._count?.members || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("members")}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-lg font-bold">{detailProject._count?.milestones || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("milestones")}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { openEdit(detailProject); setDetailProject(null) }}>
                    <Pencil className="h-4 w-4 mr-1" /> {t("save")}
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => { setDeleteId(detailProject.id); setDeleteName(detailProject.name); setDetailProject(null) }}>
                    <Trash2 className="h-4 w-4 mr-1" /> {t("delete")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
