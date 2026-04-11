"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

interface Alert {
  id: string
  year: number
  month: number
  alertType: string
  message: string
  threshold: number | null
  projectedBalance: number
  isResolved: boolean
  createdAt: string
}

interface Props {
  alerts: Alert[]
  onResolve?: (alertId: string) => void
}

const MONTH_KEYS = ["monthShort_jan", "monthShort_feb", "monthShort_mar", "monthShort_apr", "monthShort_may", "monthShort_jun", "monthShort_jul", "monthShort_aug", "monthShort_sep", "monthShort_oct", "monthShort_nov", "monthShort_dec"] as const

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const ALERT_STYLES: Record<string, { bg: string; icon: string }> = {
  negative_balance: { bg: "bg-red-50 border-red-200", icon: "text-red-600" },
  low_balance: { bg: "bg-yellow-50 border-yellow-200", icon: "text-yellow-600" },
  large_outflow: { bg: "bg-orange-50 border-orange-200", icon: "text-orange-600" },
}

export function BudgetCashFlowAlerts({ alerts, onResolve }: Props) {
  const t = useTranslations("budgeting")
  if (alerts.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          {t("cashFlowAlerts_title")}
          <Badge className="bg-red-100 text-red-800 ml-2">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert) => {
            const style = ALERT_STYLES[alert.alertType] || ALERT_STYLES.negative_balance
            return (
              <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg border ${style.bg}`}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${style.icon}`} />
                  <div>
                    <div className="text-sm font-medium">
                      {t(MONTH_KEYS[alert.month - 1])} {alert.year}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({alert.alertType.replace("_", " ")})
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{alert.message}</div>
                    <div className="text-xs font-mono mt-0.5">
                      {t("cashFlowAlerts_projectedBalance")} <span className="font-bold text-red-700">{fmt(alert.projectedBalance)}</span>
                    </div>
                  </div>
                </div>
                {onResolve && (
                  <Button size="sm" variant="ghost" onClick={() => onResolve(alert.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {t("cashFlowAlerts_resolved")}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
