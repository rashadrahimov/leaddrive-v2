"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { MotionList, MotionItem } from "@/components/ui/motion"
import { cn } from "@/lib/utils"
import { Plus, Pencil, Trash2, X, Milestone } from "lucide-react"
import { type ProjectTask, type ProjectMilestone, formatDate } from "./project-types"

interface ProjectMilestonesTabProps {
  projectId: string
  milestones: ProjectMilestone[]
  allTasks: ProjectTask[]
  headers: Record<string, string>
  onRefresh: () => void
}

export function ProjectMilestonesTab({ projectId, milestones, allTasks, headers, onRefresh }: ProjectMilestonesTabProps) {
  const t = useTranslations("projects")

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [color, setColor] = useState("#6366f1")
  const [editingId, setEditingId] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    const payload: Record<string, unknown> = { name: name.trim(), dueDate: dueDate || null, color }
    if (editingId) {
      payload.milestoneId = editingId
      await fetch(`/api/v1/projects/${projectId}/milestones`, { method: "PUT", headers, body: JSON.stringify(payload) })
    } else {
      await fetch(`/api/v1/projects/${projectId}/milestones`, { method: "POST", headers, body: JSON.stringify(payload) })
    }
    setShowForm(false); setName(""); setDueDate(""); setColor("#6366f1"); setEditingId(null); onRefresh()
  }

  async function deleteMilestone(milestoneId: string) {
    await fetch(`/api/v1/projects/${projectId}/milestones?milestoneId=${milestoneId}`, { method: "DELETE", headers })
    onRefresh()
  }

  function openEdit(m: ProjectMilestone) {
    setEditingId(m.id); setName(m.name); setDueDate(m.dueDate ? m.dueDate.split("T")[0] : ""); setColor(m.color); setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setName(""); setDueDate(""); setColor("#6366f1") }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addMilestone")}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editingId ? t("edit") : t("addMilestone")}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t("name")} className="col-span-2 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-10 rounded border cursor-pointer" />
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{t("cancel")}</Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim()}>{editingId ? t("save") : t("create")}</Button>
          </div>
        </div>
      )}

      {milestones.length > 0 ? (
        <MotionList className="space-y-3">
          {milestones.map(m => {
            const mTasks = allTasks.filter(t2 => t2.milestoneId === m.id)
            const mDone = mTasks.filter(t2 => t2.status === "done").length
            const mPct = mTasks.length > 0 ? Math.round((mDone / mTasks.length) * 100) : 0
            const isOverdue = m.dueDate && new Date(m.dueDate) < new Date() && m.status !== "completed"
            return (
              <MotionItem key={m.id}>
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className={cn(isOverdue && "text-red-500 font-medium")}>{formatDate(m.dueDate)}</span>
                          <span>·</span>
                          <span>{mDone}/{mTasks.length} {t("tasks").toLowerCase()}</span>
                          <span>·</span>
                          <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium",
                            m.status === "completed" ? "bg-green-100 text-green-700" :
                            m.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                            "bg-muted text-muted-foreground"
                          )}>{m.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(m)} className="p-1 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => deleteMilestone(m.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /></button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${mPct}%`, backgroundColor: m.color }} />
                    </div>
                    <div className="text-xs text-muted-foreground text-right mt-0.5">{mPct}%</div>
                  </div>
                </div>
              </MotionItem>
            )
          })}
        </MotionList>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Milestone className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No milestones yet</p>
        </div>
      )}
    </div>
  )
}
