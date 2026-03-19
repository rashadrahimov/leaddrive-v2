"use client"

import { DealCard } from "./deal-card"
import { cn } from "@/lib/utils"

interface Stage {
  name: string
  displayName: string
  color: string
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
}

export function KanbanBoard({ stages, deals, onDealClick }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage.name)
        const total = stageDeals.reduce((s, d) => s + d.valueAmount, 0)

        return (
          <div key={stage.name} className="min-w-[280px] flex-shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-sm font-semibold">{stage.displayName}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {stageDeals.length}
                </span>
              </div>
              {total > 0 && (
                <span className="text-xs text-muted-foreground">
                  {total.toLocaleString()} ₼
                </span>
              )}
            </div>

            <div
              className={cn(
                "min-h-[200px] space-y-2 rounded-lg border-2 border-dashed p-2 transition-colors",
                "border-transparent hover:border-muted-foreground/20"
              )}
            >
              {stageDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={() => onDealClick?.(deal)}
                />
              ))}

              {stageDeals.length === 0 && (
                <div className="flex h-[100px] items-center justify-center text-xs text-muted-foreground">
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
