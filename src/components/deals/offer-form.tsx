"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Plus, Trash2, Package, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

interface Product {
  id: string
  name: string
  price: number
  currency: string
  category: string
}

interface OfferItemData {
  id?: string
  productId?: string | null
  name: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  sortOrder: number
}

interface OfferData {
  id: string
  type: string
  title: string
  currency: string
  companyId: string | null
  contactId: string | null
  voen: string | null
  includeVat: boolean
  discount: number | null
  validUntil: string | null
  notes: string | null
  items: OfferItemData[]
}

export function OfferForm({
  open,
  onClose,
  onSaved,
  dealId,
  orgId,
  offer,
  defaultCompanyId,
  defaultContactId,
  defaultCurrency,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  dealId: string
  orgId?: string
  offer?: OfferData | null
  defaultCompanyId?: string | null
  defaultContactId?: string | null
  defaultCurrency?: string
}) {
  const t = useTranslations("offers")
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  const [type, setType] = useState(offer?.type || "commercial")
  const [title, setTitle] = useState(offer?.title || "")
  const [currency, setCurrency] = useState(offer?.currency || defaultCurrency || "AZN")
  const [voen, setVoen] = useState(offer?.voen || "")
  const [includeVat, setIncludeVat] = useState(offer?.includeVat || false)
  const [validUntil, setValidUntil] = useState(
    offer?.validUntil ? new Date(offer.validUntil).toISOString().split("T")[0] : ""
  )
  const [notes, setNotes] = useState(offer?.notes || "")
  const [items, setItems] = useState<OfferItemData[]>(
    offer?.items?.length ? offer.items : []
  )

  const headers: Record<string, string> = orgId
    ? { "x-organization-id": orgId, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }

  useEffect(() => {
    fetch("/api/v1/products", { headers: orgId ? { "x-organization-id": orgId } : {} })
      .then(r => r.json())
      .then(j => { if (j.success) setProducts(j.data || []) })
      .catch(() => {})
      .finally(() => setLoadingProducts(false))
  }, [orgId])

  const addItem = () => {
    setItems([...items, { name: "", quantity: 1, unitPrice: 0, discount: 0, total: 0, sortOrder: items.length }])
  }

  const addFromProduct = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    setItems([...items, {
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: product.price,
      discount: 0,
      total: product.price,
      sortOrder: items.length,
    }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    ;(updated[index] as any)[field] = value
    const item = updated[index]
    const subtotal = item.quantity * item.unitPrice
    item.total = subtotal - subtotal * (item.discount / 100)
    setItems(updated)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const vatAmount = includeVat ? subtotal * 0.18 : 0
  const grandTotal = subtotal + vatAmount

  const handleSave = async () => {
    if (!title.trim()) { alert(t("titleRequired")); return }
    setSaving(true)

    const payload = {
      type,
      title,
      currency,
      companyId: defaultCompanyId || null,
      contactId: defaultContactId || null,
      voen: voen || null,
      includeVat,
      discount: 0,
      validUntil: validUntil || null,
      notes: notes || null,
      items: items.map((item, idx) => ({
        productId: item.productId || null,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        sortOrder: idx,
      })),
    }

    try {
      const url = offer?.id
        ? `/api/v1/offers/${offer.id}`
        : `/api/v1/deals/${dealId}/offers`
      const method = offer?.id ? "PUT" : "POST"

      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) })
      const data = await res.json()

      if (data.success) {
        alert(offer?.id ? t("updated") : t("created"))
        onSaved()
      } else {
        alert(data.error || "Error")
      }
    } catch (e) {
      alert(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{offer?.id ? t("edit") : t("new")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Top row: type, currency, VAT */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={type} onChange={e => setType(e.target.value)} label={t("type")}>
                <option value="commercial">{t("typeCommercial")}</option>
                <option value="invoice">{t("typeInvoice")}</option>
                <option value="equipment">{t("typeEquipment")}</option>
                <option value="services">{t("typeServices")}</option>
              </Select>
            </div>
            <div className="w-28">
              <Select value={currency} onChange={e => setCurrency(e.target.value)} label={t("currency")}>
                <option value="AZN">AZN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="vat"
                checked={includeVat}
                onChange={e => setIncludeVat(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="vat">ƏDV 18%</Label>
            </div>
          </div>

          {/* Title */}
          <div>
            <Label>{t("offerTitle")}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("offerTitlePlaceholder")} />
          </div>

          {/* VOEN + Valid until */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>VÖEN</Label>
              <Input value={voen} onChange={e => setVoen(e.target.value)} placeholder="VÖEN" />
            </div>
            <div>
              <Label>{t("validUntil")}</Label>
              <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>{t("notes")}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          {/* Items section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">{t("positions")} ({items.length})</h4>
              <div className="flex gap-2">
                {/* Product selector */}
                {!loadingProducts && products.length > 0 && (
                  <Select
                    value=""
                    onChange={e => { if (e.target.value) addFromProduct(e.target.value) }}
                    className="w-[200px]"
                  >
                    <option value="">
                      📦 {t("fromProducts")}
                    </option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.price.toFixed(2)} {p.currency}
                      </option>
                    ))}
                  </Select>
                )}
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> {t("addManually")}
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">{t("noItems")}</p>
            ) : (
              <div className="space-y-2">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_80px_100px_80px_100px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span>{t("itemName")}</span>
                  <span className="text-center">{t("qty")}</span>
                  <span className="text-right">{t("unitPrice")}</span>
                  <span className="text-center">{t("discountPercent")}</span>
                  <span className="text-right">{t("total")}</span>
                  <span></span>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_80px_100px_32px] gap-2 items-center">
                    <Input
                      value={item.name}
                      onChange={e => updateItem(idx, "name", e.target.value)}
                      placeholder={t("itemNamePlaceholder")}
                      className="h-9"
                    />
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="h-9 text-center"
                      min={1}
                    />
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="h-9 text-right"
                      min={0}
                      step="0.01"
                    />
                    <Input
                      type="number"
                      value={item.discount}
                      onChange={e => updateItem(idx, "discount", parseFloat(e.target.value) || 0)}
                      className="h-9 text-center"
                      min={0}
                      max={100}
                    />
                    <div className="text-right text-sm font-medium pr-1">
                      {item.total.toFixed(2)} {currency}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            {items.length > 0 && (
              <div className="border-t mt-4 pt-3 text-right space-y-1">
                <p className="text-sm">{t("subtotal")}: <span className="font-medium">{subtotal.toFixed(2)} {currency}</span></p>
                {includeVat && (
                  <p className="text-sm text-orange-600">ƏDV (18%): <span className="font-medium">{vatAmount.toFixed(2)} {currency}</span></p>
                )}
                <p className="text-lg font-bold">
                  {t("grandTotal")}: {grandTotal.toFixed(2)} {currency}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
