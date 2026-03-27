"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import {
  ArrowLeft, Package, Pencil, Trash2, Check, X, DollarSign,
  Tag, Layers, CheckCircle, XCircle, Loader2, Save, Sparkles,
} from "lucide-react"
import { ColorStatCard } from "@/components/color-stat-card"

const categoryColors: Record<string, string> = {
  service: "bg-blue-500", product: "bg-green-500", addon: "bg-purple-500", consulting: "bg-amber-500",
}

export default function ProductDetailPage() {
  const t = useTranslations("products")
  const tc = useTranslations("common")
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params.id as string
  const orgId = session?.user?.organizationId

  const CATEGORIES = [
    { value: "service", label: t("categoryService") },
    { value: "product", label: t("categoryProduct") },
    { value: "addon", label: t("categoryAddon") },
    { value: "consulting", label: t("categoryConsulting") },
  ]

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Edit state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("service")
  const [price, setPrice] = useState("")
  const [currency, setCurrency] = useState("AZN")
  const [isActive, setIsActive] = useState(true)
  const [featuresStr, setFeaturesStr] = useState("")
  const [tagsStr, setTagsStr] = useState("")

  const headers = (): any => ({
    "Content-Type": "application/json",
    ...(orgId ? { "x-organization-id": String(orgId) } : {}),
  })

  async function fetchProduct() {
    try {
      const res = await fetch(`/api/v1/products/${id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setProduct(json.data)
        populateForm(json.data)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  function populateForm(p: any) {
    setName(p.name || "")
    setDescription(p.description || "")
    setCategory(p.category || "service")
    setPrice(String(p.price || 0))
    setCurrency(p.currency || "AZN")
    setIsActive(p.isActive ?? true)
    setFeaturesStr((p.features || []).join(", "))
    setTagsStr((p.tags || []).join(", "))
  }

  useEffect(() => { fetchProduct() }, [id, session])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/products/${id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          name, description: description || null, category,
          price: parseFloat(price) || 0, currency, isActive,
          features: featuresStr.split(",").map(s => s.trim()).filter(Boolean),
          tags: tagsStr.split(",").map(s => s.trim()).filter(Boolean),
        }),
      })
      if (res.ok) {
        await fetchProduct()
        setEditing(false)
      }
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  async function confirmDelete() {
    await fetch(`/api/v1/products/${id}`, { method: "DELETE", headers: headers() })
    router.push("/products")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/products")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {tc("back")}
        </Button>
        <Card><CardContent className="py-10 text-center text-muted-foreground">{tc("noData")}</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Package className="h-6 w-6 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{product.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={`${categoryColors[product.category] || "bg-gray-500"} text-white`}>
              {product.category}
            </Badge>
            <Badge className={product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
              {product.isActive ? tc("active") : tc("inactive")}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" /> {tc("edit")}
              </Button>
              <Button variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> {tc("delete")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); populateForm(product) }}>
                <X className="h-4 w-4 mr-1" /> {tc("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                {tc("save")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ColorStatCard
          label={tc("price")}
          value={product.price > 0 ? `${product.price.toLocaleString()} ${product.currency}` : tc("free")}
          icon={<DollarSign className="h-4 w-4" />}
          color="green"
        />
        <ColorStatCard
          label={tc("category")}
          value={product.category}
          icon={<Layers className="h-4 w-4" />}
          color="blue"
        />
        <ColorStatCard
          label={tc("features")}
          value={(product.features || []).length}
          icon={<Sparkles className="h-4 w-4" />}
          color="amber"
        />
        <ColorStatCard
          label={tc("tags")}
          value={(product.tags || []).length}
          icon={<Tag className="h-4 w-4" />}
          color="violet"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 h-auto">
          <TabsTrigger value="details" className="rounded-md text-sm">{tc("details")}</TabsTrigger>
          <TabsTrigger value="features" className="rounded-md text-sm">{tc("features")} ({(product.features || []).length})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          {editing ? (
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>{t("nameLabel")} *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <Label>{t("descriptionLabel")}</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{tc("category")}</Label>
                    <Select value={category} onChange={e => setCategory(e.target.value)}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>{tc("price")}</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="flex-1" />
                      <Select value={currency} onChange={e => setCurrency(e.target.value)} className="w-24">
                        <option value="AZN">AZN</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </Select>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>{t("tagsLabel")}</Label>
                  <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="cloud, migration, enterprise" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} id="editActive" className="rounded" />
                  <Label htmlFor="editActive">{t("activeLabel")}</Label>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">{t("editProduct")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { icon: <Package className="h-4 w-4" />, label: t("nameLabel"), value: product.name },
                    { icon: <Layers className="h-4 w-4" />, label: tc("category"), value: product.category },
                    { icon: <DollarSign className="h-4 w-4" />, label: tc("price"), value: product.price > 0 ? `${product.price.toLocaleString()} ${product.currency}` : tc("free") },
                    { icon: product.isActive ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />, label: tc("status"), value: product.isActive ? tc("active") : tc("inactive") },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-muted-foreground">{row.icon}</div>
                      <div>
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                        <p className="text-sm font-medium capitalize">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">{t("descriptionLabel")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {product.description || tc("noData")}
                  </p>
                  {(product.tags || []).length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">{tc("tags")}</p>
                      <div className="flex gap-1 flex-wrap">
                        {product.tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          {editing ? (
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <Label>{t("featuresLabel")}</Label>
                <Textarea
                  value={featuresStr}
                  onChange={e => setFeaturesStr(e.target.value)}
                  rows={6}
                  placeholder="Azure/AWS, Zero Downtime, Data Migration"
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                {(product.features || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{tc("noData")}</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {product.features.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-green-50/30">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-sm font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("deleteProduct")} itemName={product.name} />
    </div>
  )
}
