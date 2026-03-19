"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { FileText, Plus } from "lucide-react"

interface Contract {
  id: string
  contractNumber: string
  title: string
  companyId?: string
  status: "draft" | "active" | "expired"
  startDate?: string
  endDate?: string
  valueAmount?: number
  currency: string
}

const statusColors: Record<string, "default" | "secondary" | "destructive"> = { active: "default", expired: "destructive", draft: "secondary" }

export default function ContractsPage() {
  const { data: session } = useSession()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const orgId = (session?.user as any)?.organizationId

  const fetchContracts = async () => {
    try {
      const res = await fetch("/api/v1/contracts?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setContracts(json.data.contracts)
        setTotal(json.data.total)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchContracts() }, [session])

  const columns = [
    { key: "contractNumber", label: "Number", sortable: true },
    { key: "title", label: "Title", sortable: true },
    {
      key: "valueAmount", label: "Value", sortable: true,
      render: (item: any) => <span className="font-medium">{item.valueAmount ? item.valueAmount.toLocaleString() : "—"} {item.currency}</span>,
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (item: any) => <Badge variant={statusColors[item.status]}>{item.status}</Badge>,
    },
    {
      key: "endDate", label: "Expires", sortable: true,
      render: (item: any) => item.endDate ? new Date(item.endDate).toLocaleDateString() : "—",
    },
  ]

  const activeCount = contracts.filter(c => c.status === "active").length
  const totalValue = contracts.reduce((s, c) => s + (c.valueAmount || 0), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
          <p className="text-sm text-muted-foreground">Manage client contracts</p>
        </div>
        <Button><Plus className="h-4 w-4" /> New Contract</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total" value={total} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Active" value={activeCount} trend="up" />
        <StatCard title="Total Value" value={`${totalValue.toLocaleString()} AZN`} />
      </div>
      <DataTable columns={columns} data={contracts} searchPlaceholder="Search contracts..." searchKey="title" />
    </div>
  )
}
