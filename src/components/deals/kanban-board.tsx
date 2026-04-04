"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { DealCard } from "./deal-card"
import { cn } from "@/lib/utils"
import { InfoHint } from "@/components/info-hint"

interface Stage {
  name: string
  displayName: string
  color: string
  hint?: string
}

interface Deal {
  id: string
  name: string
  company?: string
  valueAmount: number
  currency: string
  stage: string
  assignedTo?: string
  probability: number
  stageChangedAt?: string | null
  nextTask?: { id: string; title: string; dueDate: string | null; status: string } | null
}

interface KanbanBoardProps {
  stages: Stage[]
  deals: Deal[]
  onDealClick?: (deal: Deal) => void
  onDealMove?: (dealId: string, newStage: string) => void
  onQuickAddTask?: (dealId: string, title: string) => Promise<void>
  rottingDays?: number
}

export function KanbanBoard({ stages, deals, onDealClick, onDealMove, onQuickAddTask, rottingDays = 14 }: KanbanBoardProps) {
  const [dragDealId, setDragDealId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, dealId: string) => {
    setDragDealId(dealId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", dealId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, stageName: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTarget(stageName)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropTarget(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, stageName: string) => {
    e.preventDefault()
    const dealId = e.dataTransfer.getData("text/plain") || dragDealId
    if (dealId && onDealMove) {
      const deal = deals.find(d => d.id === dealId)
      if (deal && deal.stage !== stageName) {
        onDealMove(dealId, stageName)
      }
    }
    setDragDealId(null)
    setDropTarget(null)
  }, [dragDealId, deals, onDealMove])

  const handleDragEnd = useCallback(() => {
    setDragDealId(null)
    setDropTarget(null)
  }, [])

  return (
    <div className="grid grid-cols-6 gap-3 w-full">
      {stages.map((stage, stageIdx) => {
        const stageDeals = deals.filter((d) => d.stage === stage.name)
        const total = stageDeals.reduce((s, d) => s + d.valueAmount, 0)
        const isDropping = dropTarget === stage.name

        return (
          <motion.div
            key={stage.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stageIdx * 0.05, duration: 0.25 }}
            className="min-w-0"
          >
            {/* Stage header — Ramp style with dots */}
            <div className="mb-2.5 px-0.5">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-xs font-semibold truncate">{stage.displayName}</span>
                {stage.hint && <InfoHint text={stage.hint} size={12} />}
                <span className="text-xs text-muted-foreground font-medium ml-auto tabular-nums">
                  {stageDeals.length}
                </span>
              </div>
              {total > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5 pl-4 tabular-nums">
                  {total.toLocaleString()} ₼
                </p>
              )}
            </div>

            {/* Stage column — clean, no heavy borders */}
            <div
              className={cn(
                "min-h-[200px] space-y-2 rounded-xl p-2 transition-all duration-200",
                isDropping
                  ? "bg-primary/5 ring-2 ring-primary/30 ring-dashed"
                  : "bg-muted/20 hover:bg-muted/30",
                !isDropping && stage.name === "WON" && "bg-green-50/30 dark:bg-green-950/10",
                !isDropping && stage.name === "LOST" && "bg-red-50/30 dark:bg-red-950/10",
              )}
              onDragOver={(e) => handleDragOver(e, stage.name)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.name)}
            >
              {stageDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={() => onDealClick?.(deal)}
                  onDragStart={(e) => handleDragStart(e, deal.id)}
                  onDragEnd={handleDragEnd}
                  isDragging={dragDealId === deal.id}
                  rottingDays={rottingDays}
                  onQuickAddTask={onQuickAddTask}
                />
              ))}

              {stageDeals.length === 0 && (
                <div className="flex h-[80px] items-center justify-center text-[11px] text-muted-foreground/50">
                  No deals
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
