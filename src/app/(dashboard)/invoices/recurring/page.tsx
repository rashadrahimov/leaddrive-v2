"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Calendar,
  Trash2,
  Play,
  Pause,
} from "lucide-react"

interface RecurringInvoice {
  id: string
  title: string
  frequency: string
  intervalCount: number
  isActive: boolean
  startDate: string | null
  endDate: string | null
  nextRunDate: string | null
  lastRunDate: string | null
  totalGenerated: number
  maxOccurrences: number | null
  currency: string
  includeVat: boolean
  taxRate: number
  paymentTerms: string | null
  recipientEmail: string | null
  notes: string | null
  companyId: string | null
  company?: { id: string; name: string }
  items: RecurringInvoiceItem[]
}

interface RecurringInvoiceItem {
  id?: string
  name: string
  quantity: number
  unitPrice: number
  discount: number
}

interface Company {
  id: string
  name: string
}

const emptyItem = (): RecurringInvoiceItem => ({
  name: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
})

const defaultForm = {
  title: "",
  titleTemplate: "",
  companyId: "",
  frequency: "monthly",
  intervalCount: 1,
  startDate: "",
  endDate: "",
  maxOccurrences: "",
  currency: "AZN",
  includeVat: false,
  taxRate: "0.18",
  paymentTerms: "",
  recipientEmail: "",
  notes: "",
}

export default function RecurringInvoicesPage() {
  const { data: session } = useSession()
  const t = useTranslations("invoices")
  const router = useRouter()

  const orgId = (session?.user as { organizationId?: string })?.organizationId

  const [rules, setRules] = useState<RecurringInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [items, setItems] = useState<RecurringInvoiceItem[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [generateReport, setGenerateReport] = useState<Array<{ invoiceNumber: string; company?: string; status: string; error?: string }> | null>(null)

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (orgId) h["x-organization-id"] = String(orgId)
    return h
  }, [orgId])

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/recurring-invoices", {
        headers: headers(),
      })
      const json = await res.json()
      if (json.success) {
        setRules(json.data ?? json.data?.recurringInvoices ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [headers])

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/companies?limit=500", {
        headers: headers(),
      })
      const json = await res.json()
      if (json.success) {
        setCompanies(json.data?.companies ?? json.data ?? [])
      }
    } catch {
      // ignore
    }
  }, [headers])

  useEffect(() => {
    if (session) {
      fetchRules()
      fetchCompanies()
    }
  }, [session, fetchRules, fetchCompanies])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        titleTemplate: form.titleTemplate || `${form.title} — {month} {year}`,
        frequency: form.frequency,
        intervalCount: Number(form.intervalCount) || 1,
        currency: form.currency,
        includeVat: form.includeVat,
        taxRate: parseFloat(form.taxRate) || 0,
        items: items.filter((i) => i.name.trim() !== ""),
      }
      if (form.companyId) body.companyId = form.companyId
      if (form.startDate) body.startDate = form.startDate
      if (form.endDate) body.endDate = form.endDate
      if (form.maxOccurrences) body.maxOccurrences = Number(form.maxOccurrences)
      if (form.paymentTerms) body.paymentTerms = form.paymentTerms
      if (form.recipientEmail) body.recipientEmail = form.recipientEmail
      if (form.notes) body.notes = form.notes

      const res = await fetch("/api/v1/recurring-invoices", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setDialogOpen(false)
        setForm(defaultForm)
        setItems([emptyItem()])
        fetchRules()
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (rule: RecurringInvoice) => {
    try {
      await fetch(`/api/v1/recurring-invoices/${rule.id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      fetchRules()
    } catch {
      // ignore
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/recurring-invoices/${deleteId}`, {
      method: "DELETE",
      headers: headers(),
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchRules()
  }

  const handleGenerateNow = async () => {
    setGenerating(true)
    setGenerateReport(null)
    try {
      const res = await fetch("/api/v1/recurring-invoices/generate", {
        method: "POST",
        headers: headers(),
      })
      const json = await res.json()
      if (json.data?.report) {
        setGenerateReport(json.data.report)
      }
      fetchRules()
    } catch {
      // ignore
    } finally {
      setGenerating(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === rules.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rules.map((r) => r.id)))
    }
  }

  const handleBulkToggle = async (activate: boolean) => {
    for (const id of selectedIds) {
      await fetch(`/api/v1/recurring-invoices/${id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ isActive: activate }),
      })
    }
    setSelectedIds(new Set())
    fetchRules()
  }

  const updateItem = (
    index: number,
    field: keyof RecurringInvoiceItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeItem = (index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()])
  }

  const frequencyLabel = (freq: string) => {
    switch (freq) {
      case "daily":
        return t("freqDaily")
      case "weekly":
        return t("freqWeekly")
      case "monthly":
        return t("freqMonthly")
      case "quarterly":
        return t("freqQuarterly")
      case "yearly":
        return t("freqYearly")
      default:
        return freq
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("recurringInvoices")}
        </h1>
        <div className="animate-pulse h-96 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("recurringInvoices")}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateNow}
            disabled={generating}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${generating ? "animate-spin" : ""}`}
            />
            {t("generateNow")}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t("newRecurring")}
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <Card className="border-cyan-300 bg-cyan-50 dark:bg-cyan-950">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-sm font-medium">{selectedIds.size} seçilib</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleBulkToggle(true)}>
                <Play className="h-3.5 w-3.5 mr-1" /> Aktivləşdir
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-orange-700 border-orange-300 hover:bg-orange-50" onClick={() => handleBulkToggle(false)}>
                <Pause className="h-3.5 w-3.5 mr-1" /> Dayandır
              </Button>
              <Button size="sm" className="h-8" onClick={handleGenerateNow} disabled={generating}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${generating ? "animate-spin" : ""}`} />
                İndi göndər
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate report */}
      {generateReport && generateReport.length > 0 && (
        <Card className="border-green-300">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Son nəticə: {generateReport.filter(r => r.status === "sent").length} göndərildi, {generateReport.filter(r => r.status === "send_failed").length} xəta</span>
              <Button variant="ghost" size="sm" onClick={() => setGenerateReport(null)} className="h-6 text-xs">✕</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="max-h-48 overflow-y-auto text-xs space-y-1">
              {generateReport.map((r, i) => (
                <div key={i} className={`flex justify-between py-1 px-2 rounded ${r.status === "sent" ? "bg-green-50 text-green-800" : r.status === "send_failed" ? "bg-red-50 text-red-800" : "bg-gray-50"}`}>
                  <span>{r.invoiceNumber} — {r.company || "?"}</span>
                  <span className="font-medium">{r.status === "sent" ? "✓" : r.status === "send_failed" ? `✗ ${r.error?.slice(0, 40)}` : "draft"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">
              {t("noRecurringInvoices")}
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t("newRecurring")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={selectedIds.size === rules.length && rules.length > 0}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-xs text-muted-foreground">Hamısını seç ({rules.length})</span>
        </div>
        <div className="grid gap-3">
          {rules.map((rule) => (
            <Card key={rule.id} className={`hover:shadow-md transition-shadow ${selectedIds.has(rule.id) ? "ring-2 ring-cyan-400" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(rule.id)}
                      onChange={() => toggleSelect(rule.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <CardTitle className="text-base">{rule.title}</CardTitle>
                    <Badge variant="outline">
                      {rule.intervalCount > 1
                        ? `${t("every")} ${rule.intervalCount} ${frequencyLabel(rule.frequency)}`
                        : frequencyLabel(rule.frequency)}
                    </Badge>
                    {rule.isActive ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        {t("active")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("paused")}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(rule)}
                      title={rule.isActive ? t("pause") : t("resume")}
                    >
                      {rule.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        setDeleteId(rule.id)
                        setDeleteName(rule.title)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  {rule.company && (
                    <div>
                      <span className="text-muted-foreground">
                        {t("company")}:
                      </span>{" "}
                      <span className="font-medium">{rule.company.name}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">
                      {t("nextRun")}:
                    </span>{" "}
                    <span className="font-medium">
                      {formatDate(rule.nextRunDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("lastRun")}:
                    </span>{" "}
                    <span className="font-medium">
                      {formatDate(rule.lastRunDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("totalGenerated")}:
                    </span>{" "}
                    <span className="font-medium">
                      {rule.totalGenerated}
                      {rule.maxOccurrences
                        ? ` / ${rule.maxOccurrences}`
                        : ""}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("newRecurring")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1">
              <Label>{t("titleField")} *</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  const val = e.target.value
                  setForm((f) => ({
                    ...f,
                    title: val,
                    // Auto-fill template if user hasn't manually edited it
                    titleTemplate: !f.titleTemplate || f.titleTemplate === `${f.title} — {month} {year}`
                      ? `${val} — {month} {year}`
                      : f.titleTemplate,
                  }))
                }}
                placeholder={t("recurringTitlePlaceholder")}
              />
            </div>

            {/* Title Template */}
            <div className="space-y-1">
              <Label>Title Template</Label>
              <Input
                value={form.titleTemplate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titleTemplate: e.target.value }))
                }
                placeholder="{title} — {month} {year}"
              />
              <p className="text-xs text-muted-foreground">
                Variables: {"{month}"}, {"{year}"}, {"{number}"}. Leave empty to use static title.
              </p>
            </div>

            {/* Company */}
            <div className="space-y-1">
              <Label>{t("company")}</Label>
              <Select
                value={form.companyId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, companyId: e.target.value }))
                }
              >
                <option value="">{t("selectCompany")}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Frequency + Interval */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("frequency")}</Label>
                <Select
                  value={form.frequency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, frequency: e.target.value }))
                  }
                >
                  <option value="daily">{t("freqDaily")}</option>
                  <option value="weekly">{t("freqWeekly")}</option>
                  <option value="monthly">{t("freqMonthly")}</option>
                  <option value="quarterly">
                    {t("freqQuarterly")}
                  </option>
                  <option value="yearly">{t("freqYearly")}</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("intervalCount")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.intervalCount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      intervalCount: Number(e.target.value) || 1,
                    }))
                  }
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("startDate")}</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t("endDate")}</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Max Occurrences */}
            <div className="space-y-1">
              <Label>{t("maxOccurrences")}</Label>
              <Input
                type="number"
                min={0}
                value={form.maxOccurrences}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxOccurrences: e.target.value }))
                }
                placeholder={t("unlimited")}
              />
            </div>

            {/* Currency + VAT */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>{t("currency")}</Label>
                <Select
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currency: e.target.value }))
                  }
                >
                  <option value="AZN">AZN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.includeVat}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, includeVat: e.target.checked }))
                    }
                    className="rounded border-gray-300"
                  />
                  {t("includeVat")}
                </Label>
              </div>
              {form.includeVat && (
                <div className="space-y-1">
                  <Label>{t("taxRate")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={form.taxRate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, taxRate: e.target.value }))
                    }
                  />
                </div>
              )}
            </div>

            {/* Payment Terms */}
            <div className="space-y-1">
              <Label>{t("paymentTerms")}</Label>
              <Select
                value={form.paymentTerms}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    paymentTerms: e.target.value,
                  }))
                }
              >
                <option value="">{t("selectPaymentTerms")}</option>
                <option value="net_7">Net 7</option>
                <option value="net_15">Net 15</option>
                <option value="net_30">Net 30</option>
                <option value="net_45">Net 45</option>
                <option value="net_60">Net 60</option>
                <option value="due_on_receipt">
                  {t("dueOnReceipt")}
                </option>
              </Select>
            </div>

            {/* Recipient Email */}
            <div className="space-y-1">
              <Label>{t("recipientEmail")}</Label>
              <Input
                type="email"
                value={form.recipientEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recipientEmail: e.target.value }))
                }
                placeholder="email@example.com"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label>{t("notes")}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
              />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <Label>{t("items")}</Label>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium">
                        {t("itemName")}
                      </th>
                      <th className="text-right p-2 font-medium w-20">
                        {t("qty")}
                      </th>
                      <th className="text-right p-2 font-medium w-28">
                        {t("unitPrice")}
                      </th>
                      <th className="text-right p-2 font-medium w-24">
                        {t("discount")}
                      </th>
                      <th className="p-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1">
                          <Input
                            value={item.name}
                            onChange={(e) =>
                              updateItem(idx, "name", e.target.value)
                            }
                            className="h-8"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                "quantity",
                                Number(e.target.value) || 1
                              )
                            }
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                "unitPrice",
                                Number(e.target.value) || 0
                              )
                            }
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.discount}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                "discount",
                                Number(e.target.value) || 0
                              )
                            }
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeItem(idx)}
                            disabled={items.length <= 1}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                type="button"
              >
                <Plus className="h-3 w-3 mr-1" /> {t("addItem")}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.title.trim()}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                  {t("saving")}
                </>
              ) : (
                t("create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        onConfirm={handleDelete}
        title={t("deleteRecurring")}
        itemName={deleteName}
      />
    </div>
  )
}
