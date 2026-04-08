"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react"

const categoryColors: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  WARNING: "bg-amber-100 text-amber-700 border-amber-200",
  INFO: "bg-blue-100 text-blue-700 border-blue-200",
}

export default function MtmAlertsPage() {
  const { data: session } = useSession()
  const t = useTranslations("nav")
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const orgId = session?.user?.organizationId

  const fetchAlerts = async () => {
    try {
      const resolved = showResolved ? "" : "&resolved=false"
      const res = await fetch(`/api/v1/mtm/alerts?limit=50${resolved}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const r = await res.json()
      if (r.success) setAlerts(r.data.alerts || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAlerts() }, [session, showResolved])

  const resolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/v1/mtm/alerts/${alertId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify({ isResolved: true }),
      })
      fetchAlerts()
    } catch {}
  }

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/alerts/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchAlerts()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={AlertTriangle} title={t("mtmAlerts")} description="GPS anomalies, late starts, missed visits" />
        <Button variant="outline" size="sm" onClick={() => setShowResolved(!showResolved)}>
          {showResolved ? "Hide Resolved" : "Show All"}
        </Button>
      </div>

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
                    {!alert.isResolved && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] bg-white/50 hover:bg-white/80" onClick={() => resolveAlert(alert.id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                      </Button>
                    )}
                    {alert.isResolved && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Resolved</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setDeleteItem(alert); setDeleteOpen(true) }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
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

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Alert"
        itemName={deleteItem?.title}
      />
    </div>
  )
}
