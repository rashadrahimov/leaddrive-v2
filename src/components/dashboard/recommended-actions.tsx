"use client"

import { useEffect, useState } from "react"
import { Target, Phone, Mail, CheckSquare, ArrowUpRight, Loader2 } from "lucide-react"
import Link from "next/link"

interface NextAction {
  type: string
  title: string
  reason: string
  priority: "high" | "medium" | "low"
  entityType: string
  entityId: string
  entityName: string
}

const TYPE_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  task: CheckSquare,
  meeting: Target,
  update_stage: ArrowUpRight,
  send_offer: Mail,
}

const PRIORITY_STYLES: Record<string, { dot: string; text: string }> = {
  high: { dot: "bg-red-500", text: "text-red-600" },
  medium: { dot: "bg-amber-500", text: "text-amber-600" },
  low: { dot: "bg-blue-500", text: "text-blue-600" },
}

function getEntityLink(type: string, id: string): string {
  switch (type) {
    case "deal": return `/deals/${id}`
    case "lead": return `/leads`
    case "contact": return `/contacts/${id}`
    case "company": return `/companies/${id}`
    default: return "#"
  }
}

export function RecommendedActions() {
  const [actions, setActions] = useState<NextAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/ai/next-actions?limit=5")
      .then(r => r.json())
      .then(j => { if (j.success) setActions(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-lg bg-card border border-border shadow-sm p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Target className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Рекомендуемые действия</span>
      </div>

      {loading ? (
        <div className="h-[140px] flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : actions.length === 0 ? (
        <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">
          Нет рекомендаций
        </div>
      ) : (
        <div className="space-y-1.5">
          {actions.map((action, idx) => {
            const Icon = TYPE_ICONS[action.type] || Target
            const style = PRIORITY_STYLES[action.priority]
            const link = getEntityLink(action.entityType, action.entityId)

            return (
              <Link
                key={idx}
                href={link}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                      {action.title}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{action.reason}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
