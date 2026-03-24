"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Trash2, Save, Package } from "lucide-react"

interface InvoiceItem {
  id: string
  productId?: string
  name: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
}

interface Company { id: string; name: string }
interface Contact { id: string; firstName: string; lastName: string; email: string }
interface Deal { id: string; name: string }
interface Product { id: string; name: string; price: number; description?: string }

export default function EditInvoicePage() {
  const t = useTranslations("invoices")
  const tc = useTranslations("common")
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string
  const orgId = (session?.user as { organizationId?: string })?.organizationId

  const [loading, setLoading] = useState(true)
  const [invoiceNumber, setInvoiceNumber] = useState("")

  // Client section
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [company, setCompany] = useState("")
  const [contact, setContact] = useState("")
  const [deal, setDeal] = useState("")

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([])

  // Summary
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState(0)
  const [includeVat, setIncludeVat] = useState(false)
  const [taxRate] = useState(0.18)

  // Details
  const [currency, setCurrency] = useState("AZN")
  const [paymentTerms, setPaymentTerms] = useState("net30")
  const [issueDate, setIssueDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [voen, setVoen] = useState("")
  const [title, setTitle] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")

  // Notes
  const [notes, setNotes] = useState("")
  const [terms, setTerms] = useState("")
  const [footerNote, setFooterNote] = useState("")

  // UI state
  const [saving, setSaving] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const headers: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}

  // Load invoice data
  useEffect(() => {
    if (!orgId || !invoiceId) return
    setLoading(true)
    fetch(`/api/v1/invoices/${invoiceId}`, { headers })
      .then(r => r.json())
      .then(json => {
        const inv = json.data ?? json
        setInvoiceNumber(inv.invoiceNumber || "")
        setTitle(inv.title || "")
        setCompany(inv.companyId || inv.company?.id || "")
        setContact(inv.contactId || inv.contact?.id || "")
        setDeal(inv.dealId || inv.deal?.id || "")
        setCurrency(inv.currency || "AZN")
        setPaymentTerms(inv.paymentTerms || "net30")
        setIssueDate(inv.issueDate ? inv.issueDate.split("T")[0] : "")
        setDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "")
        setVoen(inv.voen || "")
        setRecipientEmail(inv.recipientEmail || "")
        setNotes(inv.notes || "")
        setTerms(inv.termsAndConditions || "")
        setFooterNote(inv.footerNote || "")
        setDiscountType((inv.discountType as "percentage" | "fixed") || "percentage")
        setDiscountValue(Number(inv.discountValue) || 0)
        setIncludeVat(inv.includeVat || false)
        setItems(
          inv.items?.length
            ? inv.items.map((item: Record<string, unknown>) => ({
                id: item.id as string,
                productId: item.productId as string | undefined,
                name: (item.name as string) || "",
                description: (item.description as string) || "",
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.unitPrice) || 0,
                discount: Number(item.discount) || 0,
              }))
            : [{ id: "item-1", name: "", description: "", quantity: 1, unitPrice: 0, discount: 0 }]
        )
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [orgId, invoiceId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch reference data
  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/companies?limit=500", { headers }).then(r => r.json()).then(j => setCompanies(j.data?.companies || j.companies || [])).catch(console.error)
    fetch("/api/v1/deals?limit=500", { headers }).then(r => r.json()).then(j => setDeals(j.data?.deals || j.deals || [])).catch(console.error)
    fetch("/api/v1/products?limit=500", { headers }).then(r => r.json()).then(j => setProducts(j.data?.products || j.products || j.data || [])).catch(console.error)
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch contacts when company changes
  useEffect(() => {
    if (!orgId || !company) { setContacts([]); return }
    fetch(`/api/v1/contacts?companyId=${company}`, { headers }).then(r => r.json()).then(j => setContacts(j.data?.contacts || j.contacts || [])).catch(console.error)
  }, [orgId, company]) // eslint-disable-line react-hooks/exhaustive-deps

  // Calculations
  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice
      return sum + lineTotal - (lineTotal * item.discount) / 100
    }, 0)
    const discountAmount = discountType === "percentage" ? (subtotal * discountValue) / 100 : discountValue
    const afterDiscount = subtotal - discountAmount
    const taxAmount = includeVat ? afterDiscount * taxRate : 0
    const total = afterDiscount + taxAmount
    return { subtotal, discountAmount, taxAmount, total }
  }, [items, discountType, discountValue, includeVat, taxRate])

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { id: String(Date.now()), name: "", description: "", quantity: 1, unitPrice: 0, discount: 0 }])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.id !== id) : prev)
  }, [])

  const updateItem = useCallback((id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }, [])

  const addFromProduct = useCallback((product: Product) => {
    setItems(prev => [...prev, { id: String(Date.now()), productId: product.id, name: product.name, description: product.description || "", quantity: 1, unitPrice: product.price || 0, discount: 0 }])
    setShowProductDropdown(false)
  }, [])

  const getLineTotal = (item: InvoiceItem) => {
    const lineTotal = item.quantity * item.unitPrice
    return lineTotal - (lineTotal * item.discount) / 100
  }

  const fmt = (n: number) => new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const payload = {
        title: title || invoiceNumber,
        companyId: company || undefined,
        contactId: contact || undefined,
        dealId: deal || undefined,
        currency,
        paymentTerms,
        issueDate,
        dueDate: dueDate || undefined,
        voen: voen || undefined,
        recipientEmail: recipientEmail || undefined,
        notes: notes || undefined,
        termsAndConditions: terms || undefined,
        footerNote: footerNote || undefined,
        discountType,
        discountValue,
        includeVat,
        taxRate: includeVat ? taxRate : 0,
        items: items.filter(i => i.name.trim()).map(item => ({
          productId: item.productId || undefined,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: getLineTotal(item),
        })),
      }
      const res = await fetch(`/api/v1/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to update invoice")
      }
      router.push(`/invoices/${invoiceId}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update invoice")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/invoices/${invoiceId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToInvoices")}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tc("edit")} — {t("invoiceDetails")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{invoiceNumber}</p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">{invoiceNumber}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t("invoiceTitle")}</CardTitle></CardHeader>
            <CardContent>
              <Input placeholder={t("invoiceTitlePlaceholder")} value={title} onChange={e => setTitle(e.target.value)} />
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t("client")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("company")} *</Label>
                  <Select value={company} onChange={e => setCompany(e.target.value)}>
                    <option value="">{t("selectCompany")}</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("contact")}</Label>
                  <Select value={contact} onChange={e => setContact(e.target.value)} disabled={!company}>
                    <option value="">{t("selectContact")}</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("deal")} ({tc("optional")})</Label>
                <Select value={deal} onChange={e => setDeal(e.target.value)}>
                  <option value="">{t("selectDeal")}</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("recipientEmail")}</Label>
                <Input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("items")}</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Button variant="outline" size="sm" onClick={() => setShowProductDropdown(!showProductDropdown)}>
                      <Package className="h-4 w-4 mr-2" />{t("fromProducts")}
                    </Button>
                    {showProductDropdown && products.length > 0 && (
                      <div className="absolute right-0 mt-1 w-72 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {products.map(product => (
                          <button key={product.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center" onClick={() => addFromProduct(product)}>
                            <span className="truncate mr-2">{product.name}</span>
                            <span className="text-muted-foreground whitespace-nowrap">{fmt(product.price)} {currency}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />{t("addItem")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="hidden md:grid grid-cols-12 gap-2 mb-2 text-xs font-medium text-muted-foreground px-1">
                <div className="col-span-3">{t("itemName")}</div>
                <div className="col-span-3">{t("description")}</div>
                <div className="col-span-1">{t("qty")}</div>
                <div className="col-span-2">{t("unitPrice")}</div>
                <div className="col-span-1">{t("discountPercent")}</div>
                <div className="col-span-1 text-right">{t("total")}</div>
                <div className="col-span-1"></div>
              </div>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-2 rounded-md border bg-muted/30">
                    <div className="md:col-span-3">
                      <Input placeholder={t("itemNamePlaceholder")} value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)} className="h-9" />
                    </div>
                    <div className="md:col-span-3">
                      <Input placeholder={t("descriptionPlaceholder")} value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)} className="h-9" />
                    </div>
                    <div className="md:col-span-1">
                      <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))} className="h-9" />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" min={0} step={0.01} value={item.unitPrice} onChange={e => updateItem(item.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))} className="h-9" />
                    </div>
                    <div className="md:col-span-1">
                      <Input type="number" min={0} max={100} step={0.1} value={item.discount} onChange={e => updateItem(item.id, "discount", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} className="h-9" />
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end">
                      <span className="text-sm font-medium whitespace-nowrap mt-2 md:mt-0">{fmt(getLineTotal(item))}</span>
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end">
                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} disabled={items.length === 1} className="h-9 w-9 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={addItem} className="mt-3 w-full border-dashed border">
                <Plus className="h-4 w-4 mr-2" />{t("addAnotherItem")}
              </Button>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("invoiceNumber")}</Label>
                  <Input value={invoiceNumber} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>{t("issueDate")}</Label>
                  <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("currency")}</Label>
                  <Select value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="AZN">AZN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("paymentTerms")}</Label>
                  <Select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
                    <option value="dueOnReceipt">{t("dueOnReceipt")}</option>
                    <option value="net15">{t("net15")}</option>
                    <option value="net30">{t("net30")}</option>
                    <option value="net45">{t("net45")}</option>
                    <option value="net60">{t("net60")}</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("dueDate")}</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>VÖEN</Label>
                  <Input value={voen} onChange={e => setVoen(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t("notesAndTerms")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("notes")}</Label>
                <Textarea placeholder={t("notesPlaceholder")} value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{t("termsAndConditions")}</Label>
                <Textarea placeholder={t("termsPlaceholder")} value={terms} onChange={e => setTerms(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{t("footerNote")}</Label>
                <Textarea placeholder={t("footerNotePlaceholder")} value={footerNote} onChange={e => setFooterNote(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">{t("summary")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span>{fmt(calculations.subtotal)} {currency}</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t("discount")}</Label>
                  <div className="flex gap-2">
                    <Select value={discountType} onChange={e => setDiscountType(e.target.value as "percentage" | "fixed")} className="w-20">
                      <option value="percentage">%</option>
                      <option value="fixed">{currency}</option>
                    </Select>
                    <Input type="number" min={0} step={0.01} value={discountValue} onChange={e => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))} className="flex-1" />
                  </div>
                  {calculations.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>{t("discountAmount")}</span>
                      <span>-{fmt(calculations.discountAmount)} {currency}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeVat} onChange={e => setIncludeVat(e.target.checked)} className="h-4 w-4 rounded border-input" />
                    <span className="text-sm">{t("includeVat")} (18%)</span>
                  </label>
                  {includeVat && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("vat")} (18%)</span>
                      <span>{fmt(calculations.taxAmount)} {currency}</span>
                    </div>
                  )}
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold">{t("total")}</span>
                    <span className="text-xl font-bold">{fmt(calculations.total)} {currency}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? tc("saving") : tc("save")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
