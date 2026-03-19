"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp, DollarSign, BarChart3, CheckSquare, Clock } from "lucide-react"

interface Report {
  id: string
  title: string
  description: string
  icon: string
  value: string
  period: string
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const orgId = (session?.user as any)?.organizationId

  useEffect(() => {
    // Simulate loading reports - in future, fetch from /api/v1/dashboard
    setLoading(false)
  }, [session])

  // Default report structure
  const REPORTS: Report[] = [
    {
      id: "1",
      title: "Revenue Report",
      description: "Total revenue, MRR, growth trends",
      icon: "dollar",
      value: "$0",
      period: "This Month",
    },
    {
      id: "2",
      title: "Client Profitability",
      description: "Revenue by client, margins",
      icon: "trending",
      value: "$0",
      period: "Average",
    },
    {
      id: "3",
      title: "Deal Pipeline",
      description: "Pipeline by stage, conversion rates",
      icon: "bar",
      value: "$0",
      period: "Potential",
    },
    {
      id: "4",
      title: "Task Summary",
      description: "Completed, overdue, upcoming",
      icon: "check",
      value: "0",
      period: "This Quarter",
    },
    {
      id: "5",
      title: "Ticket SLA",
      description: "Resolution time, SLA compliance",
      icon: "clock",
      value: "0%",
      period: "On-Time",
    },
    {
      id: "6",
      title: "Team Performance",
      description: "Activity, deals closed, revenue",
      icon: "trending",
      value: "0",
      period: "Deals Closed",
    },
  ]

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      dollar: <DollarSign className="h-5 w-5 text-primary" />,
      trending: <TrendingUp className="h-5 w-5 text-primary" />,
      bar: <BarChart3 className="h-5 w-5 text-primary" />,
      check: <CheckSquare className="h-5 w-5 text-primary" />,
      clock: <Clock className="h-5 w-5 text-primary" />,
    }
    return icons[iconName] || <TrendingUp className="h-5 w-5 text-primary" />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <div className="animate-pulse grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Business intelligence and insights</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                </div>
                {getIcon(report.icon)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold">{report.value}</div>
                <div className="text-xs text-muted-foreground">{report.period}</div>
              </div>
              <Button className="w-full" variant="outline" size="sm">
                Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
