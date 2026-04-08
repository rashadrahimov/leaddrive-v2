"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { MtmVisitForm } from "@/components/mtm/visit-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { CheckSquare, Plus, Pencil, Trash2 } from "lucide-react"

export default function MtmVisitsPage() {
  const { data: session } = useSession()
  const t = useTranslations("nav")
  const [visits, setVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const orgId = session?.user?.organizationId

  const fetchVisits = async () => {
    try {
      const res = await fetch("/api/v1/mtm/visits?limit=50", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const r = await res.json()
      if (r.success) setVisits(r.data.visits || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchVisits() }, [session])

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/visits/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchVisits()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={CheckSquare} title={t("mtmVisits")} description="Visit log — check-ins and check-outs" />
        <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Log Visit
        </Button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : visits.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">No visits yet</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Check-in</th>
                <th className="px-4 py-2 font-medium">Check-out</th>
                <th className="px-4 py-2 font-medium">Duration</th>
                <th className="px-4 py-2 font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2">{v.agent?.name}</td>
                  <td className="px-4 py-2">{v.customer?.name}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      v.status === "CHECKED_OUT" ? "bg-green-100 text-green-700" :
                      v.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{v.status}</span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(v.checkInAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-muted-foreground">{v.checkOutAt ? new Date(v.checkOutAt).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{v.duration ? `${v.duration} min` : "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditData(v); setFormOpen(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteItem(v); setDeleteOpen(true) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MtmVisitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={fetchVisits}
        initialData={editData}
        orgId={orgId ? String(orgId) : undefined}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Visit"
        itemName={deleteItem?.customer?.name ? `visit to ${deleteItem.customer.name}` : "this visit"}
      />
    </div>
  )
}
