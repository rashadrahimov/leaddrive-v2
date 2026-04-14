"use client"

import { useTranslations } from "next-intl"
import { MotionCard } from "@/components/ui/motion"
import { cn } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/constants"
import { type ProjectDetail, statusColors, priorityColors, formatDate } from "./project-types"

interface ProjectSidebarProps {
  project: ProjectDetail
  getUserName: (id?: string) => string
}

export function ProjectSidebar({ project, getUserName }: ProjectSidebarProps) {
  const t = useTranslations("projects")
  const sym = getCurrencySymbol(project.currency)

  const statusLabels: Record<string, string> = {
    planning: t("statusPlanning"), active: t("statusActive"), on_hold: t("statusOnHold"),
    completed: t("statusCompleted"), cancelled: t("statusCancelled"),
  }
  const priorityLabels: Record<string, string> = {
    low: t("priorityLow"), medium: t("priorityMedium"), high: t("priorityHigh"), critical: t("priorityCritical"),
  }

  return (
    <MotionCard>
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        {/* Completion */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">{t("completion")}</span>
            <span className="font-bold">{project.completionPercentage}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${project.completionPercentage}%`, backgroundColor: project.completionPercentage === 100 ? "#22c55e" : project.color }} />
          </div>
        </div>

        {/* Metadata rows */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("status")}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[project.status])}>{statusLabels[project.status]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("priority")}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColors[project.priority])}>{priorityLabels[project.priority]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("manager")}</span>
            <span className="font-medium">{getUserName(project.managerId)}</span>
          </div>
          {project.company && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("company")}</span>
              <span className="font-medium">{project.company.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("startDate")}</span>
            <span>{formatDate(project.startDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("endDate")}</span>
            <span>{formatDate(project.endDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("budget")}</span>
            <span className="font-medium">{sym}{project.budget.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("actualCost")}</span>
            <span className="font-medium">{sym}{project.actualCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("created")}</span>
            <span className="text-xs">{formatDate(project.createdAt)}</span>
          </div>
        </div>
      </div>
    </MotionCard>
  )
}
