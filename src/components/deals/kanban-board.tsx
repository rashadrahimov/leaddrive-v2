"use client"

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
}

export function KanbanBoard({ stages, deals, onDealClick }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-6 gap-2 w-full">
      {stages.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage.name)
        const total = stageDeals.reduce((s, d) => s + d.valueAmount, 0)

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
                "border-transparent hover:border-muted-foreground/20",
                stage.name === "WON" && "bg-green-50/50 dark:bg-green-900/10",
                stage.name === "LOST" && "bg-red-50/50 dark:bg-red-900/10",
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
