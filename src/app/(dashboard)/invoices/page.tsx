"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ColorStatCard } from "@/components/color-stat-card"
import { DataTable } from "@/components/data-table"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Plus, FileSpreadsheet, DollarSign, Clock, AlertTriangle, CheckCircle } from "lucide-react"

interface Invoice {
  id: string
  invoiceNumber: string
  title: string
  company?: { id: string; name: string }
  companyId?: string
  status: string
  totalAmount?: number
  currency: string
  dueDate?: string
  balanceDue?: number
  createdAt: string
}

interface InvoiceStats {
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  totalOverdue: number
  currency: string
}

const statusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">{status}</Badge>
    case "sent":
      return <Badge variant="default">{status}</Badge>
    case "viewed":
      return <Badge variant="outline">{status}</Badge>
    case "partially_paid":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{status}</Badge>
    case "paid":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>
    case "overdue":
      return <Badge variant="destructive">{status}</Badge>
    case "cancelled":
      return <Badge variant="secondary" className="line-through">{status}</Badge>
    case "refunded":
      return <Badge variant="outline">{status}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function InvoicesPage() {
  const { data: session } = useSession()
  const t = useTranslations("invoices")
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    currency: "USD",
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = (session?.user as { organizationId?: string })?.organizationId

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/v1/invoices/stats", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setStats(json.data)
    } catch {}
  }

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/v1/invoices?limit=500${statusFilter ? `&status=${statusFilter}` : ""}`,
        {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        }
      )
      const json = await res.json()
      if (json.success) setInvoices(json.data.invoices)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchStats()
      fetchInvoices()
    }
  }, [session, statusFilter])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/invoices/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchInvoices()
    fetchStats()
  }

  const columns = [
    {
      key: "invoiceNumber",
      label: t("colNumber"),
      sortable: true,
      render: (item: any) => (
        <span className="font-mono text-sm">{item.invoiceNumber}</span>
      ),
    },
    {
      key: "company",
      label: t("colCompany"),
      sortable: true,
      render: (item: any) => item.company?.name ?? "—",
    },
    {
      key: "title",
      label: t("colTitle"),
      sortable: true,
    },
    {
      key: "totalAmount",
      label: t("colAmount"),
      sortable: true,
      render: (item: any) => (
        <span className="font-medium">
          {item.totalAmount != null ? item.totalAmount.toLocaleString() : "—"}{" "}
          {item.currency}
        </span>
      ),
    },
    {
      key: "status",
      label: t("colStatus"),
      sortable: true,
      render: (item: any) => statusBadge(item.status),
    },
    {
      key: "dueDate",
      label: t("colDueDate"),
      sortable: true,
      render: (item: any) =>
        item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "—",
    },
    {
      key: "balanceDue",
      label: t("colBalanceDue"),
      sortable: true,
      render: (item: any) => (
        <span className="font-medium">
          {item.balanceDue != null ? item.balanceDue.toLocaleString() : "—"}{" "}
          {item.currency}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (item: any) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              router.push(`/invoices/${item.id}`)
            }}
          >
            {t("view")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              setDeleteId(item.id)
              setDeleteName(item.invoiceNumber)
            }}
            className="text-destructive"
          >
            {t("delete")}
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse h-96 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => router.push("/invoices/create")}>
          <Plus className="h-4 w-4 mr-1" /> {t("newInvoice")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ColorStatCard
          label={t("statTotalInvoiced")}
          value={`${stats.totalInvoiced.toLocaleString()} ${stats.currency}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="blue"
        />
        <ColorStatCard
          label={t("statPaid")}
          value={`${stats.totalPaid.toLocaleString()} ${stats.currency}`}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
        <ColorStatCard
          label={t("statOutstanding")}
          value={`${stats.totalOutstanding.toLocaleString()} ${stats.currency}`}
          icon={<Clock className="h-5 w-5" />}
          color="orange"
        />
        <ColorStatCard
          label={t("statOverdue")}
          value={`${stats.totalOverdue.toLocaleString()} ${stats.currency}`}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
        />
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-[200px]"
        >
          <option value="">{t("statusAll")}</option>
          <option value="draft">{t("status.draft")}</option>
          <option value="sent">{t("status.sent")}</option>
          <option value="paid">{t("status.paid")}</option>
          <option value="overdue">{t("status.overdue")}</option>
          <option value="partially_paid">{t("status.partially_paid")}</option>
          <option value="cancelled">{t("status.cancelled")}</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        searchPlaceholder={t("searchPlaceholder")}
        searchKey="invoiceNumber"
        onRowClick={(item: any) => router.push(`/invoices/${item.id}`)}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        onConfirm={handleDelete}
        title={t("deleteInvoice")}
        itemName={deleteName}
      />
    </div>
  )
}
