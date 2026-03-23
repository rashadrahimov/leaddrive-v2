"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ColorStatCard } from "@/components/color-stat-card"
import { KanbanBoard } from "@/components/deals/kanban-board"
import { Select } from "@/components/ui/select"
import { Handshake, Plus, TrendingUp, TrendingDown } from "lucide-react"
import { DealForm } from "@/components/deal-form"

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
  const t = useTranslations("deals")
  const tc = useTranslations("common")
  const { data: session } = useSession()
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [sortBy, setSortBy] = useState("newest")
  const orgId = session?.user?.organizationId

  const STAGES = [
    { name: "LEAD", displayName: t("stageLead"), color: "#6366f1" },
    { name: "QUALIFIED", displayName: t("stageQualified"), color: "#3b82f6" },
    { name: "PROPOSAL", displayName: t("stageProposal"), color: "#f59e0b" },
    { name: "NEGOTIATION", displayName: t("stageNegotiation"), color: "#f97316" },
    { name: "WON", displayName: t("stageWon"), color: "#22c55e" },
    { name: "LOST", displayName: t("stageLost"), color: "#ef4444" },
  ]

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
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{deals.length} {t("totalDeals")}</p>
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[180px]">
            <option value="newest">{t("sortNewest")}</option>
            <option value="oldest">{t("sortOldest")}</option>
            <option value="value_desc">{t("sortAmountDesc")}</option>
            <option value="value_asc">{t("sortAmountAsc")}</option>
            <option value="name">{t("sortNameAsc")}</option>
          </Select>
          <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1" /> {t("newDeal")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ColorStatCard label={t("statTotal")} value={deals.length} icon={<Handshake className="h-4 w-4" />} color="blue" />
        <ColorStatCard label={t("statPipelineValue")} value={`${totalValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} color="green" />
        <ColorStatCard label={t("statWon")} value={`${wonValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} color="teal" />
        <ColorStatCard label={t("statLost")} value={deals.filter(d => d.stage === "LOST").length} icon={<TrendingDown className="h-4 w-4" />} color="red" />
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
