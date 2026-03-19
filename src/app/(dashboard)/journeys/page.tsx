"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Plus, Zap, Users, CheckCircle } from "lucide-react"

interface JourneyStep {
  id: string
  stepOrder: number
  stepType: string
}

interface Journey {
  id: string
  name: string
  status: string
  triggerType: string
  entryCount: number
  activeCount: number
  completedCount: number
  steps?: JourneyStep[]
}

export default function JourneysPage() {
  const { data: session } = useSession()
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)
  const orgId = (session?.user as any)?.organizationId

  const fetchJourneys = async () => {
    try {
      const res = await fetch("/api/v1/journeys?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setJourneys(json.data.journeys)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJourneys()
  }, [session])

  const activeCount = journeys.filter((j) => j.status === "active").length
  const totalEntries = journeys.reduce((sum, j) => sum + j.entryCount, 0)
  const totalCompleted = journeys.reduce((sum, j) => sum + j.completedCount, 0)
  const totalActive = journeys.reduce((sum, j) => sum + j.activeCount, 0)

  const columns = [
    {
      key: "name",
      label: "Journey Name",
      sortable: true,
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.triggerType}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: any) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          active: "default",
          paused: "secondary",
          draft: "outline",
        }
        return <Badge variant={variants[item.status] || "outline"}>{item.status}</Badge>
      },
    },
    { key: "entryCount", label: "Total Entries", sortable: true },
    { key: "activeCount", label: "Active", sortable: true },
    { key: "completedCount", label: "Completed", sortable: true },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Customer Journeys</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <h1 className="text-2xl font-bold tracking-tight">Customer Journeys</h1>
          <p className="text-muted-foreground">Automate customer engagement workflows</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Journey
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Journeys" value={activeCount} icon={<Zap className="h-4 w-4" />} />
        <StatCard title="Total Entries" value={totalEntries} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Completed" value={totalCompleted} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard title="In Progress" value={totalActive} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journeys</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={journeys}
            searchPlaceholder="Search journeys..."
            searchKey="name"
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
