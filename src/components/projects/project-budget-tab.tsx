"use client"

import { useTranslations } from "next-intl"
import { ColorStatCard } from "@/components/color-stat-card"
import { cn } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/constants"
import { DollarSign, BarChart3, Target } from "lucide-react"
import { type ProjectDetail, type ProjectMember } from "./project-types"

interface ProjectBudgetTabProps {
  project: ProjectDetail
  members: ProjectMember[]
  getUserName: (id?: string) => string
}

export function ProjectBudgetTab({ project, members, getUserName }: ProjectBudgetTabProps) {
  const t = useTranslations("projects")
  const sym = getCurrencySymbol(project.currency)
  const budgetUsedPct = project.budget > 0 ? Math.min(100, Math.round((project.actualCost / project.budget) * 100)) : 0
  const budgetRemaining = project.budget - project.actualCost

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ColorStatCard label={t("budget")} value={`${sym}${project.budget.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} color="blue" />
        <ColorStatCard label={t("actualCost")} value={`${sym}${project.actualCost.toLocaleString()}`} icon={<BarChart3 className="h-4 w-4" />}
          color={project.actualCost > project.budget ? "red" : "green"} />
        <ColorStatCard label={t("hintBudgetRemaining")} value={`${sym}${budgetRemaining.toLocaleString()}`} icon={<Target className="h-4 w-4" />}
          color={budgetRemaining < 0 ? "red" : "green"} />
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h3 className="font-semibold text-sm mb-3">{t("budget")} Progress</h3>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", budgetUsedPct > 90 ? "bg-red-500" : budgetUsedPct > 70 ? "bg-amber-500" : "bg-green-500")}
            style={{ width: `${budgetUsedPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span>{budgetUsedPct}% used</span>
          <span>{sym}{project.actualCost.toLocaleString()} / {sym}{project.budget.toLocaleString()}</span>
        </div>
      </div>

      {members.length > 0 && members.some(m => m.hourlyRate && m.hoursLogged > 0) && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">{t("members")} Cost</h3>
          <div className="space-y-2">
            {members.filter(m => m.hourlyRate).map(m => {
              const cost = (m.hourlyRate || 0) * m.hoursLogged
              return (
                <div key={m.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {getUserName(m.userId).charAt(0).toUpperCase()}
                    </div>
                    <span>{getUserName(m.userId)}</span>
                  </div>
                  <div className="text-right text-muted-foreground">
                    <span>{m.hoursLogged}h × {sym}{m.hourlyRate} = </span>
                    <span className="font-medium text-foreground">{sym}{cost.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
