"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { KanbanBoard } from "@/components/deals/kanban-board"
import { DealDetailSheet } from "@/components/deals/deal-detail-sheet"
import { Handshake, Plus, TrendingUp, TrendingDown, Pencil, Trash2 } from "lucide-react"
import { DealForm } from "@/components/deal-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

const STAGES = [
  { name: "LEAD", displayName: "Lead", color: "#6366f1" },
  { name: "QUALIFIED", displayName: "Qualified", color: "#3b82f6" },
  { name: "PROPOSAL", displayName: "Proposal", color: "#f59e0b" },
  { name: "NEGOTIATION", displayName: "Negotiation", color: "#f97316" },
  { name: "WON", displayName: "Won", color: "#22c55e" },
  { name: "LOST", displayName: "Lost", color: "#ef4444" },
]

const STAGE_NAME_MAP: Record<string, string> = {
  LEAD: "Lead", QUALIFIED: "Qualified", PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation", WON: "Won", LOST: "Lost",
}

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
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, any> | undefined>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Deal | null>(null)
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

  const kanbanDeals = deals.map(d => ({
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

  const handleDealClick = (deal: { id: string }) => {
    setSelectedDealId(deal.id)
    setSheetOpen(true)
  }

  function handleEditDeal(deal: Deal) {
    setEditData({ id: deal.id, name: deal.name, companyId: deal.company?.id, stage: deal.stage, valueAmount: deal.valueAmount, currency: deal.currency, probability: deal.probability, expectedClose: deal.expectedClose, notes: deal.notes })
    setFormOpen(true)
  }

  function handleAdd() {
    setEditData(undefined)
    setFormOpen(true)
  }

  function handleDeleteDeal(deal: Deal) {
    setDeleteItem(deal)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/deals/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchDeals()
  }

  const selectedDeal = selectedDealId ? deals.find(d => d.id === selectedDealId) : null

  const dealForSheet = selectedDeal ? {
    id: selectedDeal.id,
    name: selectedDeal.name,
    company: selectedDeal.company?.name || "N/A",
    value: selectedDeal.valueAmount,
    stage: STAGE_NAME_MAP[selectedDeal.stage] || selectedDeal.stage,
    stageColor: STAGES.find(s => s.name === selectedDeal.stage)?.color || "#6b7280",
    probability: selectedDeal.probability,
    assignee: selectedDeal.assignedTo || "Unassigned",
    assigneeAvatar: (selectedDeal.assignedTo || "U")[0].toUpperCase(),
    createdAt: selectedDeal.createdAt?.slice(0, 10) || "",
    expectedClose: selectedDeal.expectedClose?.slice(0, 10) || "",
    description: selectedDeal.notes || "",
    contact: "", contactEmail: "",
    stageHistory: [],
    activities: [],
    team: [],
  } : null

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Deals Pipeline</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals Pipeline</h1>
          <p className="text-sm text-muted-foreground">{deals.length} deals total</p>
        </div>
        <Button onClick={handleAdd}><Plus className="h-4 w-4" /> New Deal</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Deals" value={deals.length} icon={<Handshake className="h-4 w-4" />} />
        <StatCard title="Pipeline Value" value={`${totalValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Won" value={`${wonValue.toLocaleString()} ₼`} description={`${wonDeals.length} deals`} trend="up" />
        <StatCard title="Lost" value={deals.filter(d => d.stage === "LOST").length} icon={<TrendingDown className="h-4 w-4" />} trend="down" />
      </div>

      <KanbanBoard stages={STAGES} deals={kanbanDeals} onDealClick={handleDealClick} />

      <DealDetailSheet
        deal={dealForSheet}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onEdit={() => { if (selectedDeal) { setSheetOpen(false); handleEditDeal(selectedDeal) } }}
        onDelete={() => { if (selectedDeal) { setSheetOpen(false); handleDeleteDeal(selectedDeal) } }}
      />
      <DealForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchDeals} initialData={editData} orgId={orgId} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title="Delete Deal" itemName={deleteItem?.name} />
    </div>
  )
}
