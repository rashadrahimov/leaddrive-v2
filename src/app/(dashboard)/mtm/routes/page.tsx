"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { MtmRouteForm } from "@/components/mtm/route-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Route, MapPin, User, CheckCircle2, Plus, Pencil, Trash2 } from "lucide-react"

const statusBadge: Record<string, { label: string; className: string }> = {
  PLANNED: { label: "Planned", className: "bg-muted text-foreground/70" },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-600" },
}

export default function MtmRoutesPage() {
  const { data: session } = useSession()
  const t = useTranslations("nav")
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const orgId = session?.user?.organizationId

  const fetchRoutes = async () => {
    try {
      const res = await fetch("/api/v1/mtm/routes?limit=50", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const r = await res.json()
      if (r.success) setRoutes(r.data.routes || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRoutes() }, [session])

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/routes/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchRoutes()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={Route} title={t("mtmRoutes")} description="Plan and track agent routes" />
        <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Add Route
        </Button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : routes.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">No routes yet</div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => {
            const badge = statusBadge[route.status] || statusBadge.PLANNED
            return (
              <div key={route.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-cyan-500" />
                    <span className="font-medium text-sm">{route.agent?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(route.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditData(route); setFormOpen(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteItem(route); setDeleteOpen(true) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {route.name && <div className="text-xs text-muted-foreground mb-2">{route.name}</div>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {route.totalPoints} points</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> {route.visitedPoints} visited</span>
                </div>
                {route.points && route.points.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {route.points.map((p: any, i: number) => (
                      <span key={p.id} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        p.status === "VISITED" ? "bg-green-50 border-green-200 text-green-700" :
                        p.status === "SKIPPED" ? "bg-red-50 border-red-200 text-red-600" :
                        "bg-muted/50 border-border text-muted-foreground"
                      }`}>
                        {i + 1}. {p.customer?.name || "—"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <MtmRouteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={fetchRoutes}
        initialData={editData}
        orgId={orgId ? String(orgId) : undefined}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Route"
        itemName={deleteItem?.name || "this route"}
      />
    </div>
  )
}
