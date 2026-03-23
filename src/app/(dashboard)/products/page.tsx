"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { StatCard } from "@/components/stat-card"
import { DataTable } from "@/components/data-table"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Package, Plus, Pencil, Trash2, DollarSign, Tag, Layers, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface Product {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  currency: string
  isActive: boolean
  features: string[]
  tags: string[]
  createdAt: string
}

// Category labels defined inside component for i18n
const CATEGORY_KEYS = ["service", "product", "addon", "consulting"]

const categoryColors: Record<string, string> = {
  service: "bg-blue-100 text-blue-800",
  product: "bg-green-100 text-green-800",
  addon: "bg-purple-100 text-purple-800",
  consulting: "bg-amber-100 text-amber-800",
}

export default function ProductsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const t = useTranslations("products")
  const tc = useTranslations("common")
  const orgId = session?.user?.organizationId
  const catLabelKeys: Record<string, string> = { service: "categoryService", product: "categoryProduct", addon: "categoryAddon", consulting: "categoryConsulting" }
  const CATEGORIES = CATEGORY_KEYS.map(k => ({ value: k, label: t(catLabelKeys[k]) }))
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<Product | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Product | null>(null)
  const [filter, setFilter] = useState("all")

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("service")
  const [price, setPrice] = useState("")
  const [currency, setCurrency] = useState("AZN")
  const [isActive, setIsActive] = useState(true)
  const [featuresStr, setFeaturesStr] = useState("")
  const [tagsStr, setTagsStr] = useState("")
  const [saving, setSaving] = useState(false)

  const headers = () => orgId ? { "x-organization-id": String(orgId), "Content-Type": "application/json" } : { "Content-Type": "application/json" }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/v1/products", { headers: orgId ? { "x-organization-id": String(orgId) } : {} })
      const json = await res.json()
      if (json.success) setProducts(json.data || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchProducts() }, [session])

  function openCreate() {
    setEditItem(null)
    setName(""); setDescription(""); setCategory("service"); setPrice(""); setCurrency("AZN")
    setIsActive(true); setFeaturesStr(""); setTagsStr("")
    setFormOpen(true)
  }

  function openEdit(p: Product) {
    setEditItem(p)
    setName(p.name)
    setDescription(p.description || "")
    setCategory(p.category)
    setPrice(String(p.price))
    setCurrency(p.currency)
    setIsActive(p.isActive)
    setFeaturesStr(p.features.join(", "))
    setTagsStr(p.tags.join(", "))
    setFormOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const body = {
      name,
      description: description || null,
      category,
      price: parseFloat(price) || 0,
      currency,
      isActive,
      features: featuresStr.split(",").map(s => s.trim()).filter(Boolean),
      tags: tagsStr.split(",").map(s => s.trim()).filter(Boolean),
    }

    try {
      if (editItem) {
        await fetch(`/api/v1/products/${editItem.id}`, { method: "PUT", headers: headers(), body: JSON.stringify(body) })
      } else {
        await fetch("/api/v1/products", { method: "POST", headers: headers(), body: JSON.stringify(body) })
      }
      setFormOpen(false)
      await fetchProducts()
    } catch {} finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleteItem) return
    await fetch(`/api/v1/products/${deleteItem.id}`, { method: "DELETE", headers: headers() })
    await fetchProducts()
  }

  const activeCount = products.filter(p => p.isActive).length
  const totalValue = products.reduce((s, p) => s + p.price, 0)
  const filtered = filter === "all" ? products : products.filter(p => p.category === filter)

  const columns = [
    {
      key: "name", label: t("colProduct"), sortable: true,
      render: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">{item.name}</p>
            {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "category", label: t("colCategory"), sortable: true,
      render: (item: any) => (
        <Badge className={cn("text-xs", categoryColors[item.category] || "bg-gray-100 text-gray-800")}>
          {item.category}
        </Badge>
      ),
    },
    {
      key: "price", label: t("colPrice"), sortable: true,
      render: (item: any) => (
        <span className="text-sm font-semibold text-primary">
          {item.price > 0 ? `${item.price.toLocaleString()} ${item.currency}` : "Free"}
        </span>
      ),
    },
    {
      key: "features", label: t("colFeatures"),
      render: (item: any) => (
        <div className="flex gap-1 flex-wrap">
          {(item.features || []).slice(0, 3).map((f: string, i: number) => (
            <Badge key={i} variant="outline" className="text-[10px]">{f}</Badge>
          ))}
          {(item.features || []).length > 3 && <Badge variant="outline" className="text-[10px]">+{item.features.length - 3}</Badge>}
        </div>
      ),
    },
    {
      key: "isActive", label: t("colStatus"), sortable: true,
      render: (item: any) => (
        <Badge className={item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
          {item.isActive ? tc("active") : tc("inactive")}
        </Badge>
      ),
    },
    {
      key: "actions", label: "", className: "w-20",
      render: (item: any) => (
        <div className="flex items-center gap-1" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
          <button onClick={() => { setDeleteItem(item); setDeleteOpen(true) }} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Package className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> {t("newProduct")}</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title={t("statTotal")} value={products.length} icon={<Package className="h-4 w-4" />} />
        <StatCard title={t("statActive")} value={activeCount} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard title={t("statTotalValue")} value={`${totalValue.toLocaleString()} AZN`} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard title={t("statCategories")} value={[...new Set(products.map(p => p.category))].length} icon={<Layers className="h-4 w-4" />} />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all", label: tc("all"), count: products.length },
          ...CATEGORIES.map(c => ({ key: c.value, label: c.label, count: products.filter(p => p.category === c.value).length })),
        ].filter(t => t.key === "all" || t.count > 0).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full border transition-colors",
              filter === tab.key ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} searchPlaceholder={t("searchPlaceholder")} searchKey="name" onRowClick={(item) => router.push(`/products/${item.id}`)} />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogHeader>
          <DialogTitle>{editItem ? t("editProduct") : t("newProduct")}</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div>
            <Label>{t("nameLabel")} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Cloud Migration Package" />
          </div>
          <div>
            <Label>{t("descriptionLabel")}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Complete migration from on-premise to cloud..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{tc("category")}</Label>
              <Select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>{t("priceLabel")}</Label>
              <div className="flex gap-2">
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="flex-1" />
                <Select value={currency} onChange={e => setCurrency(e.target.value)} className="w-24">
                  <option value="AZN">AZN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
            </div>
          </div>
          <div>
            <Label>{t("featuresLabel")}</Label>
            <Input value={featuresStr} onChange={e => setFeaturesStr(e.target.value)} placeholder="Azure/AWS, Zero Downtime, Data Migration" />
          </div>
          <div>
            <Label>{t("tagsLabel")}</Label>
            <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="cloud, migration, enterprise" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} id="isActive" className="rounded" />
            <Label htmlFor="isActive">{t("activeLabel")}</Label>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setFormOpen(false)}>{tc("cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? tc("saving") : editItem ? t("saveChanges") : t("createProduct")}
          </Button>
        </DialogFooter>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("deleteProduct")} itemName={deleteItem?.name} />
    </div>
  )
}
