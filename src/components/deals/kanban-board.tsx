"use client"

import { useState, useCallback } from "react"
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
}

interface KanbanBoardProps {
  stages: Stage[]
  deals: Deal[]
  onDealClick?: (deal: Deal) => void
  onDealMove?: (dealId: string, newStage: string) => void
}

export function KanbanBoard({ stages, deals, onDealClick, onDealMove }: KanbanBoardProps) {
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
    <div className="grid grid-cols-6 gap-2 w-full">
      {stages.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage.name)
        const total = stageDeals.reduce((s, d) => s + d.valueAmount, 0)
        const isDropping = dropTarget === stage.name

        return (
          <div key={stage.name} className="min-w-0">
            {/* Stage header */}
            <div className="mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                <span className="text-xs font-semibold truncate">{stage.displayName}</span>
                {stage.hint && <InfoHint text={stage.hint} size={12} />}
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground flex-shrink-0">
                  {stageDeals.length}
                </span>
              </div>
              {total > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5 pl-4">
                  {total.toLocaleString()} ₼
                </p>
              )}
            </div>

            {/* Stage column */}
            <div
              className={cn(
                "min-h-[200px] space-y-2 rounded-lg border-2 border-dashed p-1.5 transition-colors",
                isDropping ? "border-primary/50 bg-primary/5" : "border-transparent hover:border-muted-foreground/20",
                !isDropping && stage.name === "WON" && "bg-green-50/50 dark:bg-green-900/10",
                !isDropping && stage.name === "LOST" && "bg-red-50/50 dark:bg-red-900/10",
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
                />
              ))}

              {stageDeals.length === 0 && (
                <div className="flex h-[80px] items-center justify-center text-[10px] text-muted-foreground">
                  No deals
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
