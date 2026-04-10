"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { MtmCustomerForm } from "@/components/mtm/customer-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Building2, Plus, Pencil, Trash2, Search, Users, Download } from "lucide-react"

const categoryColors: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-red-100 text-red-600",
}

export default function MtmCustomersPage() {
  const { data: session } = useSession()
  const t = useTranslations("mtmCustomers")
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name_asc")
  const orgId = session?.user?.organizationId

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/v1/mtm/customers?limit=200", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const r = await res.json()
      if (r.success) setCustomers(r.data.customers || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCustomers() }, [session])

  const filtered = customers.filter(c => {
    if (activeFilter !== "all" && c.category !== activeFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!c.name?.toLowerCase().includes(s) && !c.code?.toLowerCase().includes(s) && !c.city?.toLowerCase().includes(s)) return false
    }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "name_asc": return (a.name || "").localeCompare(b.name || "")
      case "name_desc": return (b.name || "").localeCompare(a.name || "")
      case "category": return (a.category || "").localeCompare(b.category || "")
      default: return 0
    }
  })

  const catCounts: Record<string, number> = {}
  for (const c of customers) catCounts[c.category] = (catCounts[c.category] || 0) + 1
  const totalActive = customers.filter(c => c.status === "ACTIVE").length

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/customers/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchCustomers()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageDescription icon={Building2} title={t("title")} description={t("subtitle")} />
        <div className="animate-pulse space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={Building2} title={`${t("title")} (${filtered.length})`} description={t("subtitle")} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const csv = ["Code,Name,Category,City,Address,Contact,Phone", ...filtered.map(c => `${c.code || ""},${c.name || ""},${c.category || ""},${c.city || ""},${c.address || ""},${c.contactPerson || ""},${c.phone || ""}`)].join("\n")
            const blob = new Blob([csv], { type: "text/csv" })
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "field-customers.csv"; a.click()
          }}><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> {t("add")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label={t("statTotal")} value={customers.length} icon={<Building2 className="h-4 w-4" />} color="blue" hint={t("hintTotal")} />
        <ColorStatCard label={t("statCatA")} value={catCounts["A"] || 0} icon={<Building2 className="h-4 w-4" />} color="green" hint={t("hintCatA")} />
        <ColorStatCard label={t("statCatB")} value={catCounts["B"] || 0} icon={<Building2 className="h-4 w-4" />} color="violet" hint={t("hintCatB")} />
        <ColorStatCard label={t("statActive")} value={totalActive} icon={<Users className="h-4 w-4" />} color="orange" hint={t("hintActive")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>
          {t("all")} ({customers.length})
        </Button>
        {(["A", "B", "C", "D"] as const).map(cat => (
          <Button key={cat} variant={activeFilter === cat ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(cat)}>
            {t(`filterCat${cat}` as any)} ({catCounts[cat] || 0})
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[160px]">
          <option value="name_asc">{t("sortNameAsc")}</option>
          <option value="name_desc">{t("sortNameDesc")}</option>
          <option value="category">{t("sortCategory")}</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">
          {customers.length === 0 ? t("empty") : t("noResults")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium">{t("colCode")}</th>
                <th className="px-4 py-2 font-medium">{t("colName")}</th>
                <th className="px-4 py-2 font-medium">{t("colCategory")}</th>
                <th className="px-4 py-2 font-medium">{t("colCity")}</th>
                <th className="px-4 py-2 font-medium">{t("colAddress")}</th>
                <th className="px-4 py-2 font-medium">{t("colContact")}</th>
                <th className="px-4 py-2 font-medium">{t("colPhone")}</th>
                <th className="px-4 py-2 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{c.code || "—"}</td>
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[c.category] || ""}`}>{c.category}</span></td>
                  <td className="px-4 py-2">{c.city || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs max-w-[200px] truncate">{c.address || "—"}</td>
                  <td className="px-4 py-2">{c.contactPerson || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditData(c); setFormOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteItem(c); setDeleteOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MtmCustomerForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchCustomers} initialData={editData} orgId={orgId ? String(orgId) : undefined} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("delete")} itemName={deleteItem?.name} />
    </div>
  )
}
