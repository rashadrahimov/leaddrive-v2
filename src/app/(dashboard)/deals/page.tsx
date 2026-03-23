"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { KanbanBoard } from "@/components/deals/kanban-board"
import { Select } from "@/components/ui/select"
import { Handshake, Plus, TrendingUp, TrendingDown } from "lucide-react"
import { t, getLocale } from "@/lib/locale"
import { DealForm } from "@/components/deal-form"

const STAGES = [
  { name: "LEAD", displayName: "Lead", color: "#6366f1" },
  { name: "QUALIFIED", displayName: "Qualified", color: "#3b82f6" },
  { name: "PROPOSAL", displayName: "Proposal", color: "#f59e0b" },
  { name: "NEGOTIATION", displayName: "Negotiation", color: "#f97316" },
  { name: "WON", displayName: "Won", color: "#22c55e" },
  { name: "LOST", displayName: "Lost", color: "#ef4444" },
]

interface Deal {
  id: string
  name: string
  valueAmount: number
  currency: string
  stage: string
  assignedTo: string | null
  probability: number
  notes: string | null
  expectedClose: string | null
  createdAt: string
  company: { id: string; name: string } | null
}

export default function DealsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [sortBy, setSortBy] = useState("newest")
  const orgId = session?.user?.organizationId

  const fetchDeals = async () => {
    try {
      const res = await fetch("/api/v1/deals?limit=200", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setDeals(json.data.deals)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchDeals() }, [session])

  const sortedDeals = [...deals].sort((a, b) => {
    switch (sortBy) {
      case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "value_desc": return b.valueAmount - a.valueAmount
      case "value_asc": return a.valueAmount - b.valueAmount
      case "name": return a.name.localeCompare(b.name)
      default: return 0
    }
  })

  const kanbanDeals = sortedDeals.map(d => ({
    id: d.id,
    name: d.name,
    company: d.company?.name || "",
    valueAmount: d.valueAmount,
    currency: d.currency,
    stage: d.stage,
    assignedTo: d.assignedTo || "",
    probability: d.probability,
  }))

  const totalValue = deals.reduce((s, d) => s + d.valueAmount, 0)
  const wonDeals = deals.filter(d => d.stage === "WON")
  const wonValue = wonDeals.reduce((s, d) => s + d.valueAmount, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("Deals Pipeline")}</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("Deals Pipeline")}</h1>
          <p className="text-sm text-muted-foreground">{deals.length} deals total</p>
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[180px]">
            <option value="newest">Новые первые</option>
            <option value="oldest">Старые первые</option>
            <option value="value_desc">Сумма ↓</option>
            <option value="value_asc">Сумма ↑</option>
            <option value="name">Имя А → Я</option>
          </Select>
          <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1" /> Новая сделка</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title={t("Total Deals")} value={deals.length} icon={<Handshake className="h-4 w-4" />} />
        <StatCard title={t("Pipeline Value")} value={`${totalValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Won" value={`${wonValue.toLocaleString()} ₼`} description={`${wonDeals.length} deals`} trend="up" />
        <StatCard title="Lost" value={deals.filter(d => d.stage === "LOST").length} icon={<TrendingDown className="h-4 w-4" />} trend="down" />
      </div>

      <KanbanBoard
        stages={STAGES}
        deals={kanbanDeals}
        onDealClick={(deal) => router.push(`/deals/${deal.id}`)}
      />

      <DealForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchDeals} orgId={orgId} />
    </div>
  )
}
