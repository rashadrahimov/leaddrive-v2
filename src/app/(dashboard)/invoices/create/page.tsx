"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Trash2, Save, Send, Package } from "lucide-react"

interface InvoiceItem {
  id: string
  productId?: string
  name: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
}

interface Company {
  id: string
  name: string
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Deal {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  price: number
  description?: string
}

export default function CreateInvoicePage() {
  const t = useTranslations("invoices")
  const tc = useTranslations("common")
  const { data: session } = useSession()
  const router = useRouter()
  const orgId = (session?.user as { organizationId?: string })?.organizationId

  // Client section
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [company, setCompany] = useState("")
  const [companySearch, setCompanySearch] = useState("")
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [contact, setContact] = useState("")
  const [deal, setDeal] = useState("")

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "item-1", name: "", description: "", quantity: 1, unitPrice: 0, discount: 0 },
  ])

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

  // Set initial date on mount to avoid hydration mismatch
  useEffect(() => {
    if (!issueDate) {
      setIssueDate(new Date().toISOString().split("T")[0])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [voen, setVoen] = useState("")
  const [title, setTitle] = useState("")

  // Notes
  const [notes, setNotes] = useState("")
  const [terms, setTerms] = useState("")
  const [footerNote, setFooterNote] = useState("")

  // Document details
  const [documentLanguage, setDocumentLanguage] = useState("az")
  const [signerName, setSignerName] = useState("")
  const [signerTitle, setSignerTitle] = useState("")
  const [contractNumber, setContractNumber] = useState("")
  const [contractDate, setContractDate] = useState("")

  // UI state
  const [saving, setSaving] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const headers: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = () => { setShowCompanyDropdown(false); setShowProductDropdown(false) }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  // Fetch companies on mount
  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/companies?limit=500", { headers })
      .then((res) => res.json())
      .then((json) => setCompanies(json.data?.companies || json.companies || []))
      .catch(console.error)
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch deals on mount
  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/deals?limit=500", { headers })
      .then((res) => res.json())
      .then((json) => setDeals(json.data?.deals || json.deals || []))
      .catch(console.error)
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch products on mount
  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/products?limit=500", { headers })
      .then((res) => res.json())
      .then((json) => setProducts(json.data?.products || json.products || json.data || []))
      .catch(console.error)
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch invoice number on mount
  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/invoices/next-number", { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.number) setInvoiceNumber(data.number)
      })
      .catch(console.error)
  }, [orgId, headers])

  // Fetch contacts when company changes
  useEffect(() => {
    if (!orgId || !company) {
      setContacts([])
      setContact("")
      return
    }
    fetch(`/api/v1/contacts?companyId=${company}`, { headers })
      .then((res) => res.json())
      .then((json) => setContacts(json.data?.contacts || json.contacts || []))
      .catch(console.error)
  }, [orgId, company]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-calculate due date from payment terms
  useEffect(() => {
    if (!issueDate) return
    const issue = new Date(issueDate)
    let days = 0
    switch (paymentTerms) {
      case "due_on_receipt":
        days = 0
        break
      case "net15":
        days = 15
        break
      case "net30":
        days = 30
        break
      case "net45":
        days = 45
        break
      case "net60":
        days = 60
        break
      default:
        days = 30
    }
    const due = new Date(issue)
    due.setDate(due.getDate() + days)
    setDueDate(due.toISOString().split("T")[0])
  }, [paymentTerms, issueDate])

  // Calculations
  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice
      return sum + lineTotal - (lineTotal * item.discount) / 100
    }, 0)
    const discountAmount =
      discountType === "percentage" ? (subtotal * discountValue) / 100 : discountValue
    const afterDiscount = subtotal - discountAmount
    const taxAmount = includeVat ? afterDiscount * taxRate : 0
    const total = afterDiscount + taxAmount
    return { subtotal, discountAmount, taxAmount, total }
  }, [items, discountType, discountValue, includeVat, taxRate])

  // Item helpers
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8), name: "", description: "", quantity: 1, unitPrice: 0, discount: 0 },
    ])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))
  }, [])

  const updateItem = useCallback((id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }, [])

  const addFromProduct = useCallback((product: Product) => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
        productId: product.id,
        name: product.name,
        description: product.description || "",
        quantity: 1,
        unitPrice: product.price || 0,
        discount: 0,
      },
    ])
    setShowProductDropdown(false)
  }, [])

  const getLineTotal = (item: InvoiceItem) => {
    const lineTotal = item.quantity * item.unitPrice
    return lineTotal - (lineTotal * item.discount) / 100
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("az-AZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Submit handler
  const handleSubmit = async (status: "draft" | "sent") => {
    if (!orgId) return
    if (!company) {
      alert(t("selectCompany") || "Please select a company")
      return
    }
    if (items.length === 0 || !items.some((i) => i.name.trim())) {
      alert(t("addAtLeastOneItem") || "Please add at least one item")
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: title || invoiceNumber,
        invoiceNumber,
        companyId: company,
        contactId: contact || undefined,
        dealId: deal || undefined,
        status,
        currency,
        issueDate,
        dueDate,
        paymentTerms,
        voen,
        notes,
        terms,
        footerNote,
        signerName: signerName || undefined,
        signerTitle: signerTitle || undefined,
        contractNumber: contractNumber || undefined,
        contractDate: contractDate || undefined,
        documentLanguage,
        subtotal: calculations.subtotal,
        discountType,
        discountValue,
        discountAmount: calculations.discountAmount,
        includeVat,
        taxRate: includeVat ? taxRate : 0,
        taxAmount: calculations.taxAmount,
        total: calculations.total,
        items: items
          .filter((i) => i.name.trim())
          .map((item) => ({
            productId: item.productId || undefined,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: getLineTotal(item),
          })),
      }

      const res = await fetch("/api/v1/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": String(orgId),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create invoice")
      }

      const invoice = await res.json()
      router.push(`/invoices/${invoice.id}`)
    } catch (error) {
      console.error("Failed to create invoice:", error)
      alert(error instanceof Error ? error.message : "Failed to create invoice")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToInvoices") || "Back to Invoices"}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("createInvoice") || "Create Invoice"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("createInvoiceDescription") || "Fill in the details to create a new invoice"}
          </p>
        </div>
        {invoiceNumber && (
          <Badge variant="outline" className="text-base px-3 py-1">
            {invoiceNumber}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("invoiceTitle") || "Invoice Title"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder={t("invoiceTitlePlaceholder") || "e.g. Web Development Services - March 2026"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Client Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("client") || "Client"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("company") || "Company"} *</Label>
                  <div className="relative">
                    <Input
                      placeholder={t("selectCompany") || "Type to search company..."}
                      value={companySearch}
                      onChange={(e) => {
                        setCompanySearch(e.target.value)
                        setShowCompanyDropdown(true)
                        if (!e.target.value) { setCompany(""); setContacts([]); setContact("") }
                      }}
                      onFocus={() => setShowCompanyDropdown(true)}
                      className="h-10"
                    />
                    {showCompanyDropdown && companySearch && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {companies
                          .filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                          .slice(0, 15)
                          .map((c) => (
                            <button
                              key={c.id}
                              className={`w-full text-left px-3 py-2 hover:bg-accent text-sm ${company === c.id ? "bg-accent font-medium" : ""}`}
                              onClick={() => {
                                setCompany(c.id)
                                setCompanySearch(c.name)
                                setShowCompanyDropdown(false)
                              }}
                            >
                              {c.name}
                            </button>
                          ))}
                        {companies.filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No companies found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("contact") || "Contact"}</Label>
                  <Select
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    disabled={!company}
                  >
                    <option value="">{t("selectContact") || "Select contact..."}</option>
                    {contacts.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName || `${c.firstName || ""} ${c.lastName || ""}`}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("deal") || "Deal"} ({tc("optional") || "optional"})</Label>
                <Select
                  value={deal}
                  onChange={(e) => setDeal(e.target.value)}
                >
                  <option value="">{t("selectDeal") || "Select deal..."}</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Items Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("items") || "Items"}</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowProductDropdown(!showProductDropdown)}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      {t("fromProducts") || "From Products"}
                    </Button>
                    {showProductDropdown && products.length > 0 && (
                      <div className="absolute right-0 mt-1 w-72 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {products.map((product) => (
                          <button
                            key={product.id}
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center"
                            onClick={() => addFromProduct(product)}
                          >
                            <span className="truncate mr-2">{product.name}</span>
                            <span className="text-muted-foreground whitespace-nowrap">
                              {formatCurrency(product.price)} {currency}
                            </span>
                          </button>
                        ))}
                        {products.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            {t("noProducts") || "No products found"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addItem") || "Add Item"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-[1fr_2.5fr_80px_120px_80px_100px_40px] gap-0 bg-muted/60 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="px-3 py-2.5">#</div>
                  <div className="px-3 py-2.5">{t("itemName") || "Name"}</div>
                  <div className="px-3 py-2.5 text-center">{t("qty") || "Qty"}</div>
                  <div className="px-3 py-2.5 text-right">{t("unitPrice") || "Price"}</div>
                  <div className="px-3 py-2.5 text-center">{t("discountPercent") || "Disc %"}</div>
                  <div className="px-3 py-2.5 text-right">{t("total") || "Total"}</div>
                  <div className="px-1 py-2.5"></div>
                </div>

                {/* Item Rows */}
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_2.5fr_80px_120px_80px_100px_40px] gap-0 border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                  >
                    {/* Row number */}
                    <div className="hidden md:flex items-center px-3 py-2 text-sm text-muted-foreground font-mono">
                      {index + 1}
                    </div>
                    {/* Name + Description */}
                    <div className="px-3 py-2">
                      <Input
                        placeholder={t("itemNamePlaceholder") || "Service or product name"}
                        value={item.name}
                        onChange={(e) => updateItem(item.id, "name", e.target.value)}
                        className="h-8 border-0 px-0 shadow-none focus-visible:ring-0 font-medium"
                      />
                      <Input
                        placeholder={t("descriptionPlaceholder") || "Description (optional)"}
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        className="h-7 border-0 px-0 shadow-none focus-visible:ring-0 text-xs text-muted-foreground"
                      />
                    </div>
                    {/* Qty */}
                    <div className="px-2 py-2 flex items-center">
                      <Label className="md:hidden text-xs text-muted-foreground mr-2">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="h-8 text-center"
                      />
                    </div>
                    {/* Price */}
                    <div className="px-2 py-2 flex items-center">
                      <Label className="md:hidden text-xs text-muted-foreground mr-2">Price</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        className="h-8 text-right"
                      />
                    </div>
                    {/* Discount % */}
                    <div className="px-2 py-2 flex items-center">
                      <Label className="md:hidden text-xs text-muted-foreground mr-2">Disc</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(item.id, "discount", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))
                        }
                        className="h-8 text-center"
                      />
                    </div>
                    {/* Line Total */}
                    <div className="px-3 py-2 flex items-center justify-end">
                      <span className={`text-sm font-semibold tabular-nums ${getLineTotal(item) > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {formatCurrency(getLineTotal(item))}
                      </span>
                    </div>
                    {/* Delete */}
                    <div className="px-1 py-2 flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Add row button inside table */}
                <div className="border-t bg-muted/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addItem}
                    className="w-full h-10 rounded-none text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addAnotherItem") || "Add row"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("details") || "Details"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("invoiceNumber") || "Invoice Number"}</Label>
                  <Input value={invoiceNumber} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>{t("issueDate") || "Issue Date"}</Label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("currency") || "Currency"}</Label>
                  <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="AZN">AZN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("paymentTerms") || "Payment Terms"}</Label>
                  <Select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
                    <option value="due_on_receipt">{t("dueOnReceipt") || "Due on Receipt"}</option>
                    <option value="net15">Net 15</option>
                    <option value="net30">Net 30</option>
                    <option value="net45">Net 45</option>
                    <option value="net60">Net 60</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("dueDate") || "Due Date"}</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>VOEN</Label>
                  <Input
                    placeholder={t("voenPlaceholder") || "Tax ID (VOEN)"}
                    value={voen}
                    onChange={(e) => setVoen(e.target.value)}
                  />
                </div>
              </div>

              {/* Document language, signer, contract */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>{"Document Language"}</Label>
                  <Select value={documentLanguage} onChange={(e) => setDocumentLanguage(e.target.value)}>
                    <option value="az">Azərbaycan</option>
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </Select>
                </div>
                <div>
                  <Label>{"Contract Number"}</Label>
                  <Input
                    placeholder="GT/ZP/240806-01"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{"Contract Date"}</Label>
                  <Input
                    type="date"
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{"Signer Name"}</Label>
                  <Input
                    placeholder="Rəşad Rəhimov"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label>{"Signer Title"}</Label>
                  <Input
                    placeholder="Biznes və strateji şirkətlər üzrə xüsusi nümayəndə"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("notesAndTerms") || "Notes & Terms"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("notes") || "Notes"}</Label>
                <Textarea
                  placeholder={t("notesPlaceholder") || "Additional notes for the client..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("termsAndConditions") || "Terms & Conditions"}</Label>
                <Textarea
                  placeholder={t("termsPlaceholder") || "Payment terms, late fees, etc..."}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("footerNote") || "Footer Note"}</Label>
                <Textarea
                  placeholder={t("footerNotePlaceholder") || "Thank you for your business!"}
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("summary") || "Summary"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal") || "Subtotal"}</span>
                  <span>
                    {formatCurrency(calculations.subtotal)} {currency}
                  </span>
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <Label className="text-sm">{t("discount") || "Discount"}</Label>
                  <div className="flex gap-2">
                    <Select
                      value={discountType}
                      onChange={(e) =>
                        setDiscountType(e.target.value as "percentage" | "fixed")
                      }
                      className="w-20"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">{currency}</option>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={discountValue}
                      onChange={(e) =>
                        setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className="flex-1"
                    />
                  </div>
                  {calculations.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>{t("discountAmount") || "Discount"}</span>
                      <span>
                        -{formatCurrency(calculations.discountAmount)} {currency}
                      </span>
                    </div>
                  )}
                </div>

                {/* VAT */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeVat}
                      onChange={(e) => setIncludeVat(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">
                      {t("includeVat") || "Include VAT"} (18%)
                    </span>
                  </label>
                  {includeVat && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("vat") || "VAT"} (18%)
                      </span>
                      <span>
                        {formatCurrency(calculations.taxAmount)} {currency}
                      </span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold">{t("total") || "Total"}</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(calculations.total)} {currency}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  className="w-full"
                  onClick={() => handleSubmit("draft")}
                  disabled={saving}
                  variant="outline"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? (tc("saving") || "Saving...") : (t("saveDraft") || "Save Draft")}
                </Button>
                <Button
                  className="w-full"
                  onClick={() => handleSubmit("sent")}
                  disabled={saving}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {saving
                    ? (tc("saving") || "Saving...")
                    : (t("saveAndSend") || "Save & Send")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
