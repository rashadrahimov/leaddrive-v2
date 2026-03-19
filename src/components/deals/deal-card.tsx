import { Badge } from "@/components/ui/badge"
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
}

export function DealCard({ deal, onClick }: DealCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      draggable
    >
      <div className="mb-2 font-medium text-sm leading-tight">{deal.name}</div>
      {deal.company && (
        <div className="mb-2 text-xs text-muted-foreground">{deal.company}</div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">
          {deal.valueAmount.toLocaleString()} {deal.currency}
        </span>
        {deal.assignedTo && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {deal.assignedTo.charAt(0)}
          </div>
        )}
      </div>
    </div>
  )
}
