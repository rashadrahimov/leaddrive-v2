"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { MtmOrderForm } from "@/components/mtm/order-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { ShoppingCart, Plus, Pencil, Trash2, Search, DollarSign, CheckCircle2, FileText } from "lucide-react"

const statusColors: Record<string, string> = { DRAFT: "bg-muted text-muted-foreground", CONFIRMED: "bg-blue-100 text-blue-700", SHIPPED: "bg-amber-100 text-amber-700", DELIVERED: "bg-green-100 text-green-700", CANCELLED: "bg-red-100 text-red-600" }

export default function MtmOrdersPage() {
  const { data: session } = useSession()
  const t = useTranslations("mtmOrdersPage")
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date_desc")
  const orgId = session?.user?.organizationId

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/v1/mtm/orders?limit=200", { headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
      const r = await res.json()
      if (r.success) setOrders(r.data.orders || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [session])

  const filtered = orders.filter(o => {
    if (activeFilter !== "all" && o.status !== activeFilter) return false
    if (search) { const s = search.toLowerCase(); if (!o.orderNumber?.toLowerCase().includes(s) && !o.agent?.name?.toLowerCase().includes(s) && !o.customer?.name?.toLowerCase().includes(s)) return false }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "date_desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "date_asc": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "total_desc": return (b.totalAmount || 0) - (a.totalAmount || 0)
      case "status": return (a.status || "").localeCompare(b.status || "")
      default: return 0
    }
  })

  const statusCounts: Record<string, number> = {}
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  const totalRevenue = orders.filter(o => o.status === "DELIVERED").reduce((s, o) => s + (o.totalAmount || 0), 0)

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/orders/${deleteItem.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string> })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchOrders()
  }

  if (loading) return (
    <div className="space-y-6">
      <PageDescription icon={ShoppingCart} title={t("title")} description={t("subtitle")} />
      <div className="animate-pulse space-y-4"><div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div><div className="h-64 bg-muted rounded-lg" /></div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={ShoppingCart} title={`${t("title")} (${filtered.length})`} description={t("subtitle")} />
        <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}><Plus className="h-4 w-4 mr-1" /> {t("add")}</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label={t("statTotal")} value={orders.length} icon={<ShoppingCart className="h-4 w-4" />} color="blue" hint={t("hintTotal")} />
        <ColorStatCard label={t("statDraft")} value={statusCounts["DRAFT"] || 0} icon={<FileText className="h-4 w-4" />} color="orange" hint={t("hintDraft")} />
        <ColorStatCard label={t("statConfirmed")} value={statusCounts["CONFIRMED"] || 0} icon={<CheckCircle2 className="h-4 w-4" />} color="green" hint={t("hintConfirmed")} />
        <ColorStatCard label={t("statRevenue")} value={totalRevenue.toFixed(0)} icon={<DollarSign className="h-4 w-4" />} color="violet" hint={t("hintRevenue")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>{t("all")} ({orders.length})</Button>
        {(["DRAFT", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const).map(s => (
          <Button key={s} variant={activeFilter === s ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(s)}>
            {t(`filter${s.charAt(0) + s.slice(1).toLowerCase()}` as any)} ({statusCounts[s] || 0})
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[160px]">
          <option value="date_desc">{t("sortDateDesc")}</option>
          <option value="date_asc">{t("sortDateAsc")}</option>
          <option value="total_desc">{t("sortTotalDesc")}</option>
          <option value="status">{t("sortStatus")}</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">{orders.length === 0 ? t("empty") : t("noResults")}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-2 font-medium">{t("colOrderNumber")}</th>
              <th className="px-4 py-2 font-medium">{t("colAgent")}</th>
              <th className="px-4 py-2 font-medium">{t("colCustomer")}</th>
              <th className="px-4 py-2 font-medium">{t("colStatus")}</th>
              <th className="px-4 py-2 font-medium">{t("colTotal")}</th>
              <th className="px-4 py-2 font-medium">{t("colDate")}</th>
              <th className="px-4 py-2 font-medium w-20"></th>
            </tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{o.orderNumber || o.id.slice(0, 8)}</td>
                  <td className="px-4 py-2">{o.agent?.name}</td>
                  <td className="px-4 py-2">{o.customer?.name}</td>
                  <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[o.status] || ""}`}>{o.status}</span></td>
                  <td className="px-4 py-2 font-medium">{o.totalAmount?.toFixed(2)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2"><div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditData(o); setFormOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteItem(o); setDeleteOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MtmOrderForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchOrders} initialData={editData} orgId={orgId ? String(orgId) : undefined} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("delete")} itemName={deleteItem?.orderNumber || "this order"} />
    </div>
  )
}
