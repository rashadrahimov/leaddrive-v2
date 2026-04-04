"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { AlertTriangle } from "lucide-react"

const categoryColors: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  WARNING: "bg-amber-100 text-amber-700 border-amber-200",
  INFO: "bg-blue-100 text-blue-700 border-blue-200",
}

export default function MtmAlertsPage() {
  const t = useTranslations("nav")
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/mtm/alerts?resolved=false&limit=50")
      .then((r) => r.json())
      .then((r) => { if (r.success) setAlerts(r.data.alerts || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <PageDescription icon={AlertTriangle} title={t("mtmAlerts")} description="GPS anomalies, late starts, missed visits" />

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">No active alerts</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const cat = categoryColors[alert.category] || categoryColors.INFO
            return (
              <div key={alert.id} className={`rounded-lg border p-3 ${cat}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium text-sm">{alert.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{alert.agent?.name}</span>
                    <span className="text-[10px] opacity-70">{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {alert.description && <p className="text-xs mt-1 opacity-80">{alert.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono">{alert.type}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
