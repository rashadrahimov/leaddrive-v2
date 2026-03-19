"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { UserPlus, Plus, Target, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

const MOCK_LEADS = [
  { id: "1", contactName: "Kamran Hasanov", companyName: "Delta Telecom", email: "k.hasanov@deltatelecom.az", source: "referral", status: "new", priority: "high", score: 85, estimatedValue: 25000 },
  { id: "2", contactName: "Tarlan Mammadli", companyName: "Azmade", email: "tarlan@azmade.az", source: "website", status: "qualified", priority: "medium", score: 62, estimatedValue: 15000 },
  { id: "3", contactName: "Rashad Rahimov", companyName: "Zeytunpharma", email: "rashad@zeytunpharma.az", source: "referral", status: "new", priority: "high", score: 78, estimatedValue: 20000 },
  { id: "4", contactName: "Farid Gulalizade", companyName: "Tabia", email: "farid@tabia.az", source: "cold_call", status: "contacted", priority: "low", score: 35, estimatedValue: 5000 },
  { id: "5", contactName: "Jahan Pashayev", companyName: "Mars Overseas", email: "jahan@mars.az", source: "website", status: "lost", priority: "medium", score: 12, estimatedValue: 8000 },
]

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

  const columns = [
    {
      key: "contactName",
      label: "Lead",
      sortable: true,
      render: (item: typeof MOCK_LEADS[0]) => (
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
      render: (item: typeof MOCK_LEADS[0]) => <ScoreBadge score={item.score} />,
    },
    { key: "source", label: "Source", sortable: true },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (item: typeof MOCK_LEADS[0]) => (
        <Badge variant={priorityColors[item.priority] || "default"}>{item.priority}</Badge>
      ),
    },
    {
      key: "estimatedValue",
      label: "Est. Value",
      sortable: true,
      render: (item: typeof MOCK_LEADS[0]) => (
        <span className="font-medium">{item.estimatedValue?.toLocaleString()} ₼</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: typeof MOCK_LEADS[0]) => (
        <Badge variant="outline">{item.status}</Badge>
      ),
    },
  ]

  const avgScore = Math.round(MOCK_LEADS.reduce((s, l) => s + l.score, 0) / MOCK_LEADS.length)
  const totalValue = MOCK_LEADS.reduce((s, l) => s + (l.estimatedValue || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">Track and score your leads</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New Lead
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Leads" value={MOCK_LEADS.length} icon={<UserPlus className="h-4 w-4" />} />
        <StatCard title="Avg Score" value={avgScore} icon={<Target className="h-4 w-4" />} description={avgScore >= 60 ? "Good pipeline" : "Needs nurturing"} trend={avgScore >= 60 ? "up" : "down"} />
        <StatCard title="Pipeline Value" value={`${totalValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Hot Leads" value={MOCK_LEADS.filter(l => l.score >= 70).length} description="Score 70+" trend="up" />
      </div>

      <DataTable
        columns={columns}
        data={MOCK_LEADS}
        searchPlaceholder="Search leads..."
        searchKey="contactName"
        onRowClick={(item) => router.push(`/leads/${item.id}`)}
      />
    </div>
  )
}
