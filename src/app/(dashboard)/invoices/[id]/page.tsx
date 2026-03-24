"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import {
  ArrowLeft,
  FileSpreadsheet,
  Send,
  Download,
  Copy,
  Trash2,
  CreditCard,
  DollarSign,
  Calendar,
  Building2,
  User,
  Clock,
} from "lucide-react"

// ---------- Types ----------

interface InvoiceItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface Payment {
  id: string
  amount: number
  method: string
  reference: string | null
  notes: string | null
  paymentDate: string
  createdAt: string
}

interface AuditEntry {
  id: string
  action: string
  details: string | null
  createdAt: string
  user: { name: string | null; email: string } | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  title: string | null
  status: string
  issueDate: string
  dueDate: string
  paidDate: string | null
  paymentTerms: string | null
  currency: string
  subtotal: number
  discountTotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  balanceDue: number
  notes: string | null
  recipientEmail: string | null
  recipientVoen: string | null
  createdAt: string
  updatedAt: string
  company: { id: string; name: string } | null
  contact: {
    id: string
    fullName: string
    email: string | null
    phone: string | null
  } | null
  deal: { id: string; name: string } | null
  items: InvoiceItem[]
  payments: Payment[]
}

// ---------- Status helpers ----------

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-indigo-100 text-indigo-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500 line-through",
  refunded: "bg-purple-100 text-purple-800",
}

const PIPELINE_STAGES = ["draft", "sent", "paid"] as const

// ---------- Sub-components ----------

function InvoicePipeline({
  currentStatus,
  t,
}: {
  currentStatus: string
  t: (key: string) => string
}) {
  const stageIndex = PIPELINE_STAGES.indexOf(
    currentStatus as (typeof PIPELINE_STAGES)[number]
  )
  const effectiveIndex =
    currentStatus === "paid" || currentStatus === "partially_paid"
      ? 2
      : currentStatus === "sent" ||
          currentStatus === "viewed" ||
          currentStatus === "overdue"
        ? 1
        : 0

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
      {PIPELINE_STAGES.map((stage, idx) => {
        const isActive =
          stage === currentStatus ||
          (stage === "sent" &&
            ["sent", "viewed", "overdue"].includes(currentStatus)) ||
          (stage === "paid" &&
            ["paid", "partially_paid"].includes(currentStatus))
        const isDone = idx < effectiveIndex

        return (
          <div key={stage} className="flex items-center flex-1 min-w-0">
            <div
              className={`
                relative flex items-center justify-center h-9 flex-1 min-w-0 px-3
                text-xs font-semibold transition-all select-none
                ${
                  isActive
                    ? "text-white shadow-sm"
                    : isDone
                      ? "text-white/90"
                      : "text-muted-foreground bg-muted/40 dark:bg-muted/20"
                }
              `}
              style={{
                background: isActive
                  ? stage === "draft"
                    ? "#6b7280"
                    : stage === "sent"
                      ? "#3b82f6"
                      : "#22c55e"
                  : isDone
                    ? (stage === "draft"
                        ? "#6b7280"
                        : stage === "sent"
                          ? "#3b82f6"
                          : "#22c55e") + "99"
                    : undefined,
                clipPath:
                  idx === 0
                    ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
                    : idx === PIPELINE_STAGES.length - 1
                      ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)"
                      : "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)",
              }}
            >
              <span className="truncate">
                {t(`status.${stage}`)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KpiCards({
  invoice,
  t,
}: {
  invoice: Invoice
  t: (key: string) => string
}) {
  const daysUntilDue = Math.ceil(
    (new Date(invoice.dueDate).getTime() - Date.now()) / 86400000
  )
  const isOverdue =
    daysUntilDue < 0 &&
    invoice.status !== "paid" &&
    invoice.status !== "cancelled" &&
    invoice.status !== "refunded"

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5" />
            {t("totalAmount")}
          </div>
          <p className="text-lg font-bold">
            {invoice.totalAmount.toLocaleString()} {invoice.currency}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <CreditCard className="h-3.5 w-3.5" />
            {t("balanceDue")}
          </div>
          <p
            className={`text-lg font-bold ${invoice.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}
          >
            {invoice.balanceDue.toLocaleString()} {invoice.currency}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5" />
            {t("paidAmount")}
          </div>
          <p className="text-lg font-bold text-green-600">
            {invoice.paidAmount.toLocaleString()} {invoice.currency}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Calendar className="h-3.5 w-3.5" />
            {isOverdue ? t("overdue") : t("daysUntilDue")}
          </div>
          <p
            className={`text-lg font-bold ${isOverdue ? "text-red-600" : ""}`}
          >
            {isOverdue
              ? `${Math.abs(daysUntilDue)} ${t("daysOverdue")}`
              : `${daysUntilDue} ${t("days")}`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------- Main page ----------

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const t = useTranslations("invoices")
  const tc = useTranslations("common")

  const orgId = (session?.user as { organizationId?: string })?.organizationId
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: "bank_transfer",
    paymentDate: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
  })
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState("")

  // Send form
  const [sendForm, setSendForm] = useState({
    email: "",
    subject: "",
    message: "",
  })
  const [sendLoading, setSendLoading] = useState(false)
  const [sendError, setSendError] = useState("")

  // Audit log
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(orgId ? { "x-organization-id": String(orgId) } : {}),
  }

  const fetchInvoice = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/invoices/${invoiceId}`, { headers })
      if (!res.ok) throw new Error("Failed to fetch invoice")
      const json = await res.json()
      const data = json.data ?? json
      setInvoice(data)
      // Pre-fill send form
      setSendForm((prev) => ({
        ...prev,
        email: data.recipientEmail || data.contact?.email || "",
        subject: `Invoice ${data.invoiceNumber}`,
      }))
      // Pre-fill payment amount
      setPaymentForm((prev) => ({
        ...prev,
        amount: data.balanceDue,
      }))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [orgId, invoiceId])

  const fetchAuditLog = useCallback(async () => {
    if (!orgId) return
    setAuditLoading(true)
    try {
      const res = await fetch(
        `/api/v1/audit-log?entityType=invoice&entityId=${invoiceId}`,
        { headers }
      )
      if (res.ok) {
        const data = await res.json()
        setAuditLog(Array.isArray(data) ? data : data.entries || [])
      }
    } catch {
      // ignore
    } finally {
      setAuditLoading(false)
    }
  }, [orgId, invoiceId])

  useEffect(() => {
    fetchInvoice()
  }, [fetchInvoice])

  useEffect(() => {
    if (activeTab === "activity") {
      fetchAuditLog()
    }
  }, [activeTab, fetchAuditLog])

  // ---------- Actions ----------

  async function handleDelete() {
    const res = await fetch(`/api/v1/invoices/${invoiceId}`, {
      method: "DELETE",
      headers,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || "Failed to delete invoice")
    }
    router.push("/invoices")
  }

  async function handleDuplicate() {
    if (!orgId) return
    const res = await fetch(`/api/v1/invoices/${invoiceId}/duplicate`, {
      method: "POST",
      headers,
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/invoices/${data.id}`)
    }
  }

  function handleDownloadPdf() {
    window.open(`/api/v1/invoices/${invoiceId}/pdf`, "_blank")
  }

  async function handleRecordPayment() {
    setPaymentLoading(true)
    setPaymentError("")
    try {
      const res = await fetch(`/api/v1/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          method: paymentForm.method,
          paymentDate: paymentForm.paymentDate,
          reference: paymentForm.reference || null,
          notes: paymentForm.notes || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to record payment")
      }
      setShowPaymentDialog(false)
      setPaymentForm({
        amount: 0,
        method: "bank_transfer",
        paymentDate: new Date().toISOString().split("T")[0],
        reference: "",
        notes: "",
      })
      fetchInvoice()
    } catch (err: any) {
      setPaymentError(err.message)
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleSendInvoice() {
    setSendLoading(true)
    setSendError("")
    try {
      const res = await fetch(`/api/v1/invoices/${invoiceId}/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: sendForm.email,
          subject: sendForm.subject,
          message: sendForm.message,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to send invoice")
      }
      setShowSendDialog(false)
      fetchInvoice()
    } catch (err: any) {
      setSendError(err.message)
    } finally {
      setSendLoading(false)
    }
  }

  // ---------- Loading / Not found ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Button variant="outline" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToInvoices")}
        </Button>
      </div>
    )
  }

  // ---------- Render ----------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {invoice.invoiceNumber}
              </h1>
              <Badge className={STATUS_STYLES[invoice.status] || ""}>
                {t(`status.${invoice.status}`)}
              </Badge>
            </div>
            {invoice.title && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {invoice.title}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSendDialog(true)}
          >
            <Send className="h-4 w-4 mr-1" />
            {t("send")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="h-4 w-4 mr-1" />
            {t("downloadPdf")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-1" />
            {t("duplicate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {tc("delete")}
          </Button>
        </div>
      </div>

      {/* Pipeline */}
      <InvoicePipeline currentStatus={invoice.status} t={t} />

      {/* KPI Cards */}
      <KpiCards invoice={invoice} t={t} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
          <TabsTrigger value="items">{t("tabItems")}</TabsTrigger>
          <TabsTrigger value="payments">{t("tabPayments")}</TabsTrigger>
          <TabsTrigger value="activity">{t("tabActivity")}</TabsTrigger>
          <TabsTrigger value="preview">{t("tabPreview")}</TabsTrigger>
        </TabsList>

        {/* ===== Overview Tab ===== */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invoice Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  {t("invoiceDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("invoiceNumber")}
                  </span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("issueDate")}
                  </span>
                  <span>
                    {new Date(invoice.issueDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("dueDate")}
                  </span>
                  <span>
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </span>
                </div>
                {invoice.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("paidDate")}
                    </span>
                    <span>
                      {new Date(invoice.paidDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {invoice.paymentTerms && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("paymentTerms")}
                    </span>
                    <span>{t(invoice.paymentTerms as any)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("currency")}
                  </span>
                  <span>{invoice.currency}</span>
                </div>
                {invoice.deal && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("linkedDeal")}
                    </span>
                    <button
                      className="text-primary hover:underline"
                      onClick={() =>
                        router.push(`/deals/${invoice.deal!.id}`)
                      }
                    >
                      {invoice.deal.name}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t("clientInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {invoice.company && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("company")}
                    </span>
                    <button
                      className="text-primary hover:underline"
                      onClick={() =>
                        router.push(`/companies/${invoice.company!.id}`)
                      }
                    >
                      {invoice.company.name}
                    </button>
                  </div>
                )}
                {invoice.contact && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("contact")}
                      </span>
                      <button
                        className="text-primary hover:underline"
                        onClick={() =>
                          router.push(`/contacts/${invoice.contact!.id}`)
                        }
                      >
                        {invoice.contact.fullName}
                      </button>
                    </div>
                    {invoice.contact.email && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {tc("email")}
                        </span>
                        <span>{invoice.contact.email}</span>
                      </div>
                    )}
                    {invoice.contact.phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {tc("phone")}
                        </span>
                        <span>{invoice.contact.phone}</span>
                      </div>
                    )}
                  </>
                )}
                {invoice.recipientEmail && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("recipientEmail")}
                    </span>
                    <span>{invoice.recipientEmail}</span>
                  </div>
                )}
                {invoice.recipientVoen && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VOEN</span>
                    <span>{invoice.recipientVoen}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {t("notes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== Items Tab ===== */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">
                        {t("itemName")}
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground">
                        {t("itemDescription")}
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">
                        {t("qty")}
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">
                        {t("unitPrice")}
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">
                        {t("discount")}
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">
                        {tc("total")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          {t("noItems")}
                        </td>
                      </tr>
                    ) : (
                      invoice.items.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-2.5 font-medium">{item.name}</td>
                          <td className="py-2.5 text-muted-foreground">
                            {item.description || "—"}
                          </td>
                          <td className="py-2.5 text-right">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 text-right">
                            {item.unitPrice.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right">
                            {item.discount > 0
                              ? `${item.discount.toLocaleString()}`
                              : "—"}
                          </td>
                          <td className="py-2.5 text-right font-medium">
                            {item.total.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              {invoice.items.length > 0 && (
                <div className="mt-4 border-t pt-4 space-y-2 max-w-xs ml-auto text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("subtotal")}
                    </span>
                    <span>
                      {invoice.subtotal.toLocaleString()} {invoice.currency}
                    </span>
                  </div>
                  {invoice.discountTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("discountTotal")}
                      </span>
                      <span className="text-red-600">
                        -{invoice.discountTotal.toLocaleString()}{" "}
                        {invoice.currency}
                      </span>
                    </div>
                  )}
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("tax")} ({invoice.taxRate}%)
                      </span>
                      <span>
                        {invoice.taxAmount.toLocaleString()} {invoice.currency}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>{tc("total")}</span>
                    <span>
                      {invoice.totalAmount.toLocaleString()} {invoice.currency}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Payments Tab ===== */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">{t("paymentHistory")}</h3>
            {invoice.balanceDue > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  setPaymentForm((prev) => ({
                    ...prev,
                    amount: invoice.balanceDue,
                    paymentDate: new Date().toISOString().split("T")[0],
                  }))
                  setShowPaymentDialog(true)
                }}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                {t("recordPayment")}
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">
                        {t("paymentDate")}
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">
                        {t("amount")}
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground">
                        {t("method")}
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground">
                        {t("reference")}
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground">
                        {t("notes")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          {t("noPayments")}
                        </td>
                      </tr>
                    ) : (
                      invoice.payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b last:border-0"
                        >
                          <td className="py-2.5">
                            {new Date(
                              payment.paymentDate
                            ).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 text-right font-medium text-green-600">
                            {payment.amount.toLocaleString()}{" "}
                            {invoice.currency}
                          </td>
                          <td className="py-2.5">
                            <Badge variant="outline">
                              {t(`paymentMethod_${payment.method}`)}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {payment.reference || "—"}
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {payment.notes || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Activity Tab ===== */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {auditLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : auditLog.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("noActivity")}
                </p>
              ) : (
                <div className="space-y-3">
                  {auditLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 text-sm border-b last:border-0 pb-3 last:pb-0"
                    >
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {entry.user?.name || entry.user?.email || t("system")}
                          </span>
                          <span className="text-muted-foreground">
                            {entry.action}
                          </span>
                        </div>
                        {entry.details && (
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {entry.details}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PDF Preview Tab ===== */}
        <TabsContent value="preview">
          <Card>
            <CardContent className="pt-4">
              <iframe
                src={`/api/v1/invoices/${invoiceId}/pdf?format=html`}
                className="w-full min-h-[600px] border rounded-md"
                title={t("pdfPreview")}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Delete Dialog ===== */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        itemName={invoice.invoiceNumber}
      />

      {/* ===== Record Payment Dialog ===== */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("recordPayment")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("amount")}</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("paymentMethod")}</Label>
              <Select
                value={paymentForm.method}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, method: e.target.value }))
                }
              >
                <option value="bank_transfer">
                  {t("paymentMethod_bank_transfer")}
                </option>
                <option value="cash">
                  {t("paymentMethod_cash")}
                </option>
                <option value="card">
                  {t("paymentMethod_card")}
                </option>
                <option value="check">
                  {t("paymentMethod_check")}
                </option>
                <option value="other">
                  {t("paymentMethod_other")}
                </option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("paymentDate")}</Label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    paymentDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("reference")}</Label>
              <Input
                value={paymentForm.reference}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    reference: e.target.value,
                  }))
                }
                placeholder={t("referencePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("notes")}</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            {paymentError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {paymentError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={paymentLoading}
            >
              {tc("cancel")}
            </Button>
            <Button onClick={handleRecordPayment} disabled={paymentLoading}>
              {paymentLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {tc("saving")}
                </span>
              ) : (
                t("recordPayment")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Send Invoice Dialog ===== */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {t("sendInvoice")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("recipientEmail")}</Label>
              <Input
                type="email"
                value={sendForm.email}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("subject")}</Label>
              <Input
                value={sendForm.subject}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("message")}</Label>
              <Textarea
                value={sendForm.message}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                rows={5}
                placeholder={t("messagePlaceholder")}
              />
            </div>
            {sendError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {sendError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSendDialog(false)}
              disabled={sendLoading}
            >
              {tc("cancel")}
            </Button>
            <Button onClick={handleSendInvoice} disabled={sendLoading}>
              {sendLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {t("sending")}
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  {t("send")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
