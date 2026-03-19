"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { FileSpreadsheet, Plus } from "lucide-react"

interface Offer {
  id: string
  offerNumber: string
  title: string
  companyId?: string
  status: "draft" | "sent" | "accepted" | "rejected"
  totalAmount?: number
  currency: string
  validUntil?: string
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = { draft: "secondary", sent: "default", accepted: "outline", rejected: "destructive" }

export default function OffersPage() {
  const { data: session } = useSession()
  const [offers, setOffers] = useState<Offer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const orgId = (session?.user as any)?.organizationId

  const fetchOffers = async () => {
    try {
      const res = await fetch("/api/v1/offers?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setOffers(json.data.offers)
        setTotal(json.data.total)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchOffers() }, [session])

  const columns = [
    { key: "offerNumber", label: "Number", sortable: true },
    { key: "title", label: "Title", sortable: true },
    {
      key: "totalAmount", label: "Amount", sortable: true,
      render: (item: Offer) => <span className="font-medium">{item.totalAmount ? item.totalAmount.toLocaleString() : "—"} {item.currency}</span>,
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (item: Offer) => <Badge variant={statusColors[item.status]}>{item.status}</Badge>,
    },
    {
      key: "validUntil", label: "Valid Until", sortable: true,
      render: (item: Offer) => item.validUntil ? new Date(item.validUntil).toLocaleDateString() : "—",
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
        <div className="animate-pulse h-96 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
          <p className="text-sm text-muted-foreground">Create and track proposals</p>
        </div>
        <Button><Plus className="h-4 w-4" /> New Offer</Button>
      </div>
      <DataTable columns={columns} data={offers} searchPlaceholder="Search offers..." searchKey="title" />
    </div>
  )
}
