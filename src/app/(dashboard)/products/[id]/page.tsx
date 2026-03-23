"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
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

const CATEGORIES = [
  { value: "service", label: "Service" },
  { value: "product", label: "Product" },
  { value: "addon", label: "Add-on" },
  { value: "consulting", label: "Consulting" },
]

const categoryColors: Record<string, string> = {
  service: "bg-blue-500", product: "bg-green-500", addon: "bg-purple-500", consulting: "bg-amber-500",
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params.id as string
  const orgId = session?.user?.organizationId

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
    } catch {} finally { setLoading(false) }
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
    } catch {} finally { setSaving(false) }
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
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Card><CardContent className="py-10 text-center text-muted-foreground">Product not found</CardContent></Card>
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
              {product.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); populateForm(product) }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Price</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {product.price > 0 ? `${product.price.toLocaleString()} ${product.currency}` : "Free"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Category</span>
            </div>
            <p className="text-lg font-bold capitalize">{product.category}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Features</span>
            </div>
            <p className="text-lg font-bold">{(product.features || []).length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">Tags</span>
            </div>
            <p className="text-lg font-bold">{(product.tags || []).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 h-auto">
          <TabsTrigger value="details" className="rounded-md text-sm">Details</TabsTrigger>
          <TabsTrigger value="features" className="rounded-md text-sm">Features ({(product.features || []).length})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          {editing ? (
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onChange={e => setCategory(e.target.value)}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Price</Label>
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
                  <Label>Tags (comma-separated)</Label>
                  <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="cloud, migration, enterprise" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} id="editActive" className="rounded" />
                  <Label htmlFor="editActive">Active</Label>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Product Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { icon: <Package className="h-4 w-4" />, label: "Name", value: product.name },
                    { icon: <Layers className="h-4 w-4" />, label: "Category", value: product.category },
                    { icon: <DollarSign className="h-4 w-4" />, label: "Price", value: product.price > 0 ? `${product.price.toLocaleString()} ${product.currency}` : "Free" },
                    { icon: product.isActive ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />, label: "Status", value: product.isActive ? "Active" : "Inactive" },
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
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {product.description || "No description provided."}
                  </p>
                  {(product.tags || []).length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Tags</p>
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
                <Label>Features (comma-separated)</Label>
                <Textarea
                  value={featuresStr}
                  onChange={e => setFeaturesStr(e.target.value)}
                  rows={6}
                  placeholder="Azure/AWS, Zero Downtime, Data Migration"
                />
                <p className="text-xs text-muted-foreground mt-2">Separate features with commas. These are shown in AI recommendations.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                {(product.features || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No features listed</p>
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

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title="Delete Product" itemName={product.name} />
    </div>
  )
}
