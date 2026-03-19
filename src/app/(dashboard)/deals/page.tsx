"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { KanbanBoard } from "@/components/deals/kanban-board"
import { DealDetailSheet } from "@/components/deals/deal-detail-sheet"
import { Handshake, Plus, TrendingUp, TrendingDown } from "lucide-react"

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

const MOCK_DEALS = [
  { id: "1", name: "Zeytunpharma — New Deal", company: "Zeytunpharma", valueAmount: 0, currency: "AZN", stage: "LEAD", assignedTo: "azar.alili", probability: 10 },
  { id: "2", name: "GT-OFF-2026-005 — ZEYTUN", company: "Zeytunpharma", valueAmount: 16284, currency: "AZN", stage: "PROPOSAL", assignedTo: "rashad", probability: 50 },
  { id: "3", name: "Тест включения уведомлений", company: "", valueAmount: 0, currency: "AZN", stage: "PROPOSAL", assignedTo: "", probability: 50 },
  { id: "4", name: "Тест отключения уведомлений", company: "", valueAmount: 0, currency: "AZN", stage: "WON", assignedTo: "", probability: 100 },
  { id: "5", name: "Тест уведомлений", company: "", valueAmount: 0, currency: "AZN", stage: "WON", assignedTo: "", probability: 100 },
  { id: "6", name: "Тест уведомлений 2", company: "", valueAmount: 12500, currency: "AZN", stage: "WON", assignedTo: "", probability: 100 },
]

// Enriched deal details for the slide-over
const DEAL_DETAILS: Record<string, {
  description: string; contact: string; contactEmail: string;
  createdAt: string; expectedClose: string;
  stageHistory: Array<{ stage: string; date: string; by: string }>;
  activities: Array<{ type: string; description: string; date: string; by: string }>;
  team: Array<{ name: string; role: string; avatar: string }>;
}> = {
  "1": {
    description: "New partnership opportunity with Zeytunpharma for managed IT services.",
    contact: "Elvin Mammadov", contactEmail: "elvin@zeytunpharma.az",
    createdAt: "2026-03-10", expectedClose: "2026-04-30",
    stageHistory: [{ stage: "Lead", date: "2026-03-10", by: "Azar Alili" }],
    activities: [
      { type: "note", description: "Initial contact made via LinkedIn", date: "2026-03-10", by: "Azar Alili" },
      { type: "call", description: "Discovery call scheduled for March 15", date: "2026-03-12", by: "Azar Alili" },
    ],
    team: [{ name: "Azar Alili", role: "Account Executive", avatar: "AA" }],
  },
  "2": {
    description: "Comprehensive security and IT management offer for Zeytunpharma. Includes InfoSec, Permanent IT, and HelpDesk services.",
    contact: "Rashad Rahimov", contactEmail: "rashad@zeytunpharma.az",
    createdAt: "2026-02-15", expectedClose: "2026-03-31",
    stageHistory: [
      { stage: "Lead", date: "2026-02-15", by: "Rashad" },
      { stage: "Qualified", date: "2026-02-20", by: "Rashad" },
      { stage: "Proposal", date: "2026-03-01", by: "Rashad" },
    ],
    activities: [
      { type: "email", description: "Sent proposal document GT-OFF-2026-005", date: "2026-03-01", by: "Rashad" },
      { type: "meeting", description: "Presentation to CTO and IT Director", date: "2026-03-05", by: "Rashad" },
      { type: "note", description: "Client reviewing proposal with board", date: "2026-03-12", by: "Rashad" },
    ],
    team: [
      { name: "Rashad Rahimov", role: "Sales Lead", avatar: "RR" },
      { name: "Nigar Hasanova", role: "Solutions Architect", avatar: "NH" },
    ],
  },
}

export default function DealsPage() {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const totalValue = MOCK_DEALS.reduce((s, d) => s + d.valueAmount, 0)
  const wonDeals = MOCK_DEALS.filter(d => d.stage === "WON")
  const wonValue = wonDeals.reduce((s, d) => s + d.valueAmount, 0)

  const handleDealClick = (deal: { id: string }) => {
    setSelectedDealId(deal.id)
    setSheetOpen(true)
  }

  const selectedDeal = selectedDealId ? MOCK_DEALS.find(d => d.id === selectedDealId) : null
  const selectedDetail = selectedDealId ? DEAL_DETAILS[selectedDealId] : null

  const dealForSheet = selectedDeal && selectedDetail ? {
    id: selectedDeal.id,
    name: selectedDeal.name,
    company: selectedDeal.company || "N/A",
    value: selectedDeal.valueAmount,
    stage: STAGE_NAME_MAP[selectedDeal.stage] || selectedDeal.stage,
    stageColor: STAGES.find(s => s.name === selectedDeal.stage)?.color || "#6b7280",
    probability: selectedDeal.probability,
    assignee: selectedDeal.assignedTo || "Unassigned",
    assigneeAvatar: (selectedDeal.assignedTo || "U")[0].toUpperCase(),
    createdAt: selectedDetail.createdAt,
    expectedClose: selectedDetail.expectedClose,
    description: selectedDetail.description,
    contact: selectedDetail.contact,
    contactEmail: selectedDetail.contactEmail,
    stageHistory: selectedDetail.stageHistory,
    activities: selectedDetail.activities,
    team: selectedDetail.team,
  } : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals Pipeline</h1>
          <p className="text-sm text-muted-foreground">{MOCK_DEALS.length} deals total</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New Deal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Deals" value={MOCK_DEALS.length} icon={<Handshake className="h-4 w-4" />} />
        <StatCard title="Pipeline Value" value={`${totalValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Won" value={`${wonValue.toLocaleString()} ₼`} description={`${wonDeals.length} deals`} trend="up" />
        <StatCard title="Lost" value={MOCK_DEALS.filter(d => d.stage === "LOST").length} icon={<TrendingDown className="h-4 w-4" />} trend="down" />
      </div>

      <KanbanBoard
        stages={STAGES}
        deals={MOCK_DEALS}
        onDealClick={handleDealClick}
      />

      <DealDetailSheet
        deal={dealForSheet}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
