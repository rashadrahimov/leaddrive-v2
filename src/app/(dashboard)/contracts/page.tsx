"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { FileText, Plus } from "lucide-react"

const MOCK_CONTRACTS = [
  { id: "1", contractNumber: "GT-C-2026-001", title: "IT Outsourcing Agreement", company: "Zeytun Pharma", status: "active", startDate: "2026-01-01", endDate: "2026-12-31", valueAmount: 120000 },
  { id: "2", contractNumber: "GT-C-2026-002", title: "InfoSec Services", company: "Delta Telecom", status: "active", startDate: "2026-02-01", endDate: "2027-01-31", valueAmount: 85000 },
  { id: "3", contractNumber: "GT-C-2025-010", title: "HelpDesk SLA", company: "Azmade", status: "expired", startDate: "2025-01-01", endDate: "2025-12-31", valueAmount: 45000 },
]

const statusColors: Record<string, "default" | "secondary" | "destructive"> = { active: "default", expired: "destructive", draft: "secondary" }

export default function ContractsPage() {
  const columns = [
    { key: "contractNumber", label: "Number", sortable: true },
    { key: "title", label: "Title", sortable: true },
    { key: "company", label: "Company", sortable: true },
    {
      key: "valueAmount", label: "Value", sortable: true,
      render: (item: typeof MOCK_CONTRACTS[0]) => <span className="font-medium">{item.valueAmount.toLocaleString()} ₼</span>,
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (item: typeof MOCK_CONTRACTS[0]) => <Badge variant={statusColors[item.status]}>{item.status}</Badge>,
    },
    { key: "endDate", label: "Expires", sortable: true },
  ]

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
        <StatCard title="Total" value={MOCK_CONTRACTS.length} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Active" value={MOCK_CONTRACTS.filter(c => c.status === "active").length} trend="up" />
        <StatCard title="Total Value" value={`${MOCK_CONTRACTS.reduce((s, c) => s + c.valueAmount, 0).toLocaleString()} ₼`} />
      </div>
      <DataTable columns={columns} data={MOCK_CONTRACTS} searchPlaceholder="Search contracts..." searchKey="title" />
    </div>
  )
}
