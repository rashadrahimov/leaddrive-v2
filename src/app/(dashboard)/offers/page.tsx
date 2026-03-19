"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { FileSpreadsheet, Plus } from "lucide-react"

const MOCK_OFFERS = [
  { id: "1", offerNumber: "GT-OFF-2026-005", title: "IT Services Package — Zeytun", company: "Zeytun Pharma", status: "sent", totalAmount: 16284, validUntil: "2026-04-15" },
  { id: "2", offerNumber: "GT-OFF-2026-004", title: "InfoSec Audit", company: "Delta Telecom", status: "draft", totalAmount: 8500, validUntil: "2026-03-30" },
  { id: "3", offerNumber: "GT-OFF-2026-003", title: "Cloud Migration", company: "Tabia", status: "accepted", totalAmount: 22000, validUntil: "2026-03-20" },
]

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = { draft: "secondary", sent: "default", accepted: "outline", rejected: "destructive" }

export default function OffersPage() {
  const columns = [
    { key: "offerNumber", label: "Number", sortable: true },
    { key: "title", label: "Title", sortable: true },
    { key: "company", label: "Company", sortable: true },
    {
      key: "totalAmount", label: "Amount", sortable: true,
      render: (item: typeof MOCK_OFFERS[0]) => <span className="font-medium">{item.totalAmount.toLocaleString()} ₼</span>,
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (item: typeof MOCK_OFFERS[0]) => <Badge variant={statusColors[item.status]}>{item.status}</Badge>,
    },
    { key: "validUntil", label: "Valid Until", sortable: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
          <p className="text-sm text-muted-foreground">Create and track proposals</p>
        </div>
        <Button><Plus className="h-4 w-4" /> New Offer</Button>
      </div>
      <DataTable columns={columns} data={MOCK_OFFERS} searchPlaceholder="Search offers..." searchKey="title" />
    </div>
  )
}
