"use client"

import { ColorStatCard } from "@/components/color-stat-card"
import { FolderKanban, Clock, CheckCircle2, CalendarDays } from "lucide-react"

interface ProjectStatsProps {
  total: number
  activeCount: number
  completedCount: number
  overdueCount: number
  onFilter: (filter: string) => void
  labels: { total: string; active: string; completed: string; overdue: string }
  hints?: { total?: string; active?: string }
}

export function ProjectStats({ total, activeCount, completedCount, overdueCount, onFilter, labels, hints }: ProjectStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="cursor-pointer" onClick={() => onFilter("all")}>
        <ColorStatCard label={labels.total} value={total} icon={<FolderKanban className="h-4 w-4" />} color="indigo" hint={hints?.total} />
      </div>
      <div className="cursor-pointer" onClick={() => onFilter("active")}>
        <ColorStatCard label={labels.active} value={activeCount} icon={<Clock className="h-4 w-4" />} color="green" hint={hints?.active} />
      </div>
      <div className="cursor-pointer" onClick={() => onFilter("completed")}>
        <ColorStatCard label={labels.completed} value={completedCount} icon={<CheckCircle2 className="h-4 w-4" />} color="blue" />
      </div>
      <div className="cursor-pointer" onClick={() => onFilter("all")}>
        <ColorStatCard label={labels.overdue} value={overdueCount} icon={<CalendarDays className="h-4 w-4" />} color="red" />
      </div>
    </div>
  )
}
