"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

interface ChurnItem {
  companyId: string
  companyName: string
  riskScore: number
  factors: string[]
  lastActivity: string | null
}

export function ChurnRiskWidget() {
  const t = useTranslations("dashboard")
  const [data, setData] = useState<ChurnItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/analytics/churn-risk?limit=5")
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-lg bg-card border border-border shadow-sm p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold">Риск оттока</span>
      </div>

      {loading ? (
        <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">Загрузка...</div>
      ) : data.length === 0 ? (
        <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">Нет данных</div>
      ) : (
        <div className="space-y-2">
          {data.map(item => (
            <Link
              key={item.companyId}
              href={`/companies/${item.companyId}`}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{item.companyName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.factors[0]}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.riskScore >= 60 ? "bg-red-500" : item.riskScore >= 40 ? "bg-amber-500" : "bg-yellow-400"
                    }`}
                    style={{ width: `${item.riskScore}%` }}
                  />
                </div>
                <span className={`text-[10px] font-semibold w-6 text-right ${
                  item.riskScore >= 60 ? "text-red-500" : item.riskScore >= 40 ? "text-amber-500" : "text-yellow-600"
                }`}>
                  {item.riskScore}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
