"use client"

import { useTranslations } from "next-intl"
import { ColorStatCard } from "@/components/color-stat-card"
import { cn } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/constants"
import { CheckCircle2, Users, Target, Milestone } from "lucide-react"
import { type ProjectDetail, type ProjectTask, type ProjectMilestone, formatDate } from "./project-types"

interface ProjectOverviewTabProps {
  project: ProjectDetail
  allTasks: ProjectTask[]
  milestones: ProjectMilestone[]
  membersCount: number
}

export function ProjectOverviewTab({ project, allTasks, milestones, membersCount }: ProjectOverviewTabProps) {
  const t = useTranslations("projects")
  const sym = getCurrencySymbol(project.currency)
  const budgetUsedPct = project.budget > 0 ? Math.min(100, Math.round((project.actualCost / project.budget) * 100)) : 0
  const budgetRemaining = project.budget - project.actualCost

  const taskStatusLabels: Record<string, string> = {
    todo: t("taskTodo"), in_progress: t("taskInProgress"), review: t("taskReview"), done: t("taskDone"),
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ColorStatCard label={t("tasks")} value={allTasks.length} icon={<CheckCircle2 className="h-4 w-4" />} color="indigo" />
        <ColorStatCard label={t("members")} value={membersCount} icon={<Users className="h-4 w-4" />} color="green" />
        <ColorStatCard label={t("milestones")} value={milestones.length} icon={<Milestone className="h-4 w-4" />} color="violet" />
        <ColorStatCard label={t("completion")} value={`${project.completionPercentage}%`} icon={<Target className="h-4 w-4" />} color="blue" />
      </div>

      {/* Task breakdown */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h3 className="font-semibold text-sm mb-3">{t("tasks")} {t("overview")}</h3>
        <div className="grid grid-cols-4 gap-3">
          {(["todo", "in_progress", "review", "done"] as const).map(st => (
            <div key={st} className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-lg font-bold">{allTasks.filter(t2 => t2.status === st).length}</div>
              <div className="text-xs text-muted-foreground">{taskStatusLabels[st]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget summary */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h3 className="font-semibold text-sm mb-3">{t("budget")} {t("overview")}</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">{t("budget")}</div>
            <div className="font-bold text-lg">{sym}{project.budget.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("actualCost")}</div>
            <div className="font-bold text-lg">{sym}{project.actualCost.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("hintBudgetRemaining")}</div>
            <div className={cn("font-bold text-lg", budgetRemaining < 0 ? "text-red-500" : "text-green-600")}>
              {sym}{budgetRemaining.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", budgetUsedPct > 90 ? "bg-red-500" : budgetUsedPct > 70 ? "bg-amber-500" : "bg-green-500")}
            style={{ width: `${budgetUsedPct}%` }} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">{budgetUsedPct}% used</div>
      </div>

      {/* Milestones timeline */}
      {milestones.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">{t("milestones")}</h3>
          <div className="space-y-2">
            {milestones.map(m => {
              const mTasks = allTasks.filter(t2 => t2.milestoneId === m.id)
              const mDone = mTasks.filter(t2 => t2.status === "done").length
              const mPct = mTasks.length > 0 ? Math.round((mDone / mTasks.length) * 100) : 0
              return (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(m.dueDate)} · {mDone}/{mTasks.length} {t("tasks").toLowerCase()}</div>
                  </div>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${mPct}%`, backgroundColor: m.color }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{mPct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
