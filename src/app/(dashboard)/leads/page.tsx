"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { LeadForm } from "@/components/lead-form"
import { UserPlus, Plus, Target, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface Lead {
  id: string
  contactName: string
  companyName: string
  email: string
  source: string
  status: string
  priority: string
  score: number
  estimatedValue: number
}

function ScoreBadge({ score }: { score: number }) {
  let grade: string, color: string
  if (score >= 80) { grade = "A"; color = "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30" }
  else if (score >= 60) { grade = "B"; color = "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30" }
  else if (score >= 40) { grade = "C"; color = "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30" }
  else if (score >= 20) { grade = "D"; color = "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30" }
  else { grade = "F"; color = "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30" }

  return (
    <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold", color)}>
      {grade} <span className="font-normal opacity-70">{score}</span>
    </div>
  )
}

const priorityColors: Record<string, "default" | "secondary" | "destructive"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
}

export default function LeadsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const orgId = (session?.user as any)?.organizationId

  async function fetchLeads() {
    try {
      const res = await fetch("/api/v1/leads?limit=200", {
        headers: orgId ? { "x-organization-id": orgId } : {},
      })
      const json = await res.json()
      if (json.success) {
        setLeads(json.data.leads)
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [session])

  const columns = [
    {
      key: "contactName",
      label: "Lead",
      sortable: true,
      render: (item: Lead) => (
        <div>
          <div className="font-medium">{item.contactName}</div>
          <div className="text-xs text-muted-foreground">{item.companyName || "—"}</div>
        </div>
      ),
    },
    {
      key: "score",
      label: "Score",
      sortable: true,
      render: (item: Lead) => <ScoreBadge score={item.score} />,
    },
    { key: "source", label: "Source", sortable: true },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (item: Lead) => (
        <Badge variant={priorityColors[item.priority] || "default"}>{item.priority}</Badge>
      ),
    },
    {
      key: "estimatedValue",
      label: "Est. Value",
      sortable: true,
      render: (item: Lead) => (
        <span className="font-medium">{item.estimatedValue?.toLocaleString()} ₼</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: Lead) => (
        <Badge variant="outline">{item.status}</Badge>
      ),
    },
  ]

  const avgScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0
  const totalValue = leads.reduce((s, l) => s + (l.estimatedValue || 0), 0)
  const hotLeads = leads.filter(l => l.score >= 70).length

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
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
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">Track and score your leads</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          New Lead
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Leads" value={leads.length} icon={<UserPlus className="h-4 w-4" />} />
        <StatCard title="Avg Score" value={avgScore} icon={<Target className="h-4 w-4" />} description={avgScore >= 60 ? "Good pipeline" : "Needs nurturing"} trend={avgScore >= 60 ? "up" : "down"} />
        <StatCard title="Pipeline Value" value={`${totalValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Hot Leads" value={hotLeads} description="Score 70+" trend="up" />
      </div>

      <DataTable
        columns={columns}
        data={leads}
        searchPlaceholder="Search leads..."
        searchKey="contactName"
        onRowClick={(item) => router.push(`/leads/${item.id}`)}
      />

      <LeadForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchLeads} orgId={orgId} />
    </div>
  )
}
