import { cn } from "@/lib/utils"

interface DealCardProps {
  deal: {
    id: string
    name: string
    company?: string
    valueAmount: number
    currency: string
    assignedTo?: string
    probability: number
  }
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
}

export function DealCard({ deal, onClick, onDragStart, onDragEnd, isDragging }: DealCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-2 shadow-sm transition-all hover:shadow-md",
        onClick && "cursor-pointer",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <p className="font-medium text-xs leading-tight truncate">{deal.name}</p>
      {deal.company && (
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{deal.company}</p>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs font-semibold text-primary">
          {deal.valueAmount ? `${deal.valueAmount.toLocaleString()} ${deal.currency}` : `0 ${deal.currency}`}
        </span>
        {deal.assignedTo && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium flex-shrink-0">
            {deal.assignedTo.charAt(0)}
          </div>
        )}
      </div>
    </div>
  )
}
