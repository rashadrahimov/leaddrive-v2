"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Plus, Loader2 } from "lucide-react"

interface DealCardProps {
  deal: {
    id: string
    name: string
    company?: string
    valueAmount: number
    currency: string
    assignedTo?: string
    probability: number
    stageChangedAt?: string | null
    nextTask?: { id: string; title: string; dueDate: string | null; status: string } | null
  }
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
  rottingDays?: number
  onQuickAddTask?: (dealId: string, title: string) => Promise<void>
}

type TrafficLight = "green" | "red" | "yellow"

function getTrafficLight(deal: DealCardProps["deal"]): TrafficLight {
  if (!deal.nextTask) return "yellow"
  if (deal.nextTask.status === "completed") return "yellow"
  if (deal.nextTask.dueDate) {
    const due = new Date(deal.nextTask.dueDate)
    if (due < new Date()) return "red"
  }
  return "green"
}

function isRotting(stageChangedAt: string | null | undefined, days: number): boolean {
  if (!stageChangedAt) return false
  const changed = new Date(stageChangedAt).getTime()
  const now = Date.now()
  return (now - changed) / 86400000 > days
}

const TRAFFIC_COLORS: Record<TrafficLight, { dot: string; title: string }> = {
  green: { dot: "bg-green-500", title: "Task scheduled" },
  red: { dot: "bg-red-500 animate-pulse", title: "Overdue task!" },
  yellow: { dot: "bg-amber-400", title: "No upcoming task" },
}

export function DealCard({ deal, onClick, onDragStart, onDragEnd, isDragging, rottingDays = 14, onQuickAddTask }: DealCardProps) {
  const [hovered, setHovered] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [saving, setSaving] = useState(false)

  const light = getTrafficLight(deal)
  const rotting = isRotting(deal.stageChangedAt, rottingDays)
  const lightConfig = TRAFFIC_COLORS[light]

  const handleQuickAdd = async () => {
    if (!taskTitle.trim() || !onQuickAddTask) return
    setSaving(true)
    try {
      await onQuickAddTask(deal.id, taskTitle.trim())
      setTaskTitle("")
      setQuickAdd(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.2 }}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setQuickAdd(false) }}
    >
      <div
        className={cn(
          "rounded-lg border bg-card p-2.5 transition-all",
          onClick && "cursor-pointer",
          isDragging && "opacity-50 ring-2 ring-primary",
          rotting && "bg-red-50/40 dark:bg-red-950/10 border-red-200/50 dark:border-red-800/30",
          !rotting && "hover:shadow-sm",
        )}
        onClick={onClick}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Traffic light dot */}
        <div className="flex items-start gap-2">
          <div
            className={cn("h-2 w-2 rounded-full flex-shrink-0 mt-1", lightConfig.dot)}
            title={lightConfig.title}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs leading-tight truncate">{deal.name}</p>
            {deal.company && (
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{deal.company}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-1.5 pl-4">
          <span className="text-xs font-semibold text-primary">
            {deal.valueAmount ? `${deal.valueAmount.toLocaleString()} ${deal.currency}` : `0 ${deal.currency}`}
          </span>
          {deal.assignedTo && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium flex-shrink-0">
              {deal.assignedTo.charAt(0)}
            </div>
          )}
        </div>

        {/* Rotting indicator */}
        {rotting && (
          <div className="mt-1.5 pl-4">
            <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">
              {Math.floor((Date.now() - new Date(deal.stageChangedAt!).getTime()) / 86400000)}d stale
            </span>
          </div>
        )}
      </div>

      {/* Quick-add task button on hover */}
      {hovered && onQuickAddTask && !quickAdd && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium shadow-md hover:shadow-lg transition-shadow"
          onClick={e => { e.stopPropagation(); setQuickAdd(true) }}
        >
          <Plus className="h-3 w-3" /> Task
        </motion.button>
      )}

      {/* Quick-add task popover */}
      {quickAdd && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 z-20 mt-1 p-2 rounded-lg border bg-card shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex gap-1.5">
            <input
              autoFocus
              className="flex-1 h-7 border rounded-md px-2 text-[11px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Task title..."
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleQuickAdd(); if (e.key === "Escape") setQuickAdd(false) }}
            />
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={!taskTitle.trim() || saving}
              onClick={handleQuickAdd}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
