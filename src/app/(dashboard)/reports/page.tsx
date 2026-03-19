"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp, DollarSign, BarChart3, CheckSquare, Clock } from "lucide-react"

const REPORTS = [
  {
    id: "1",
    title: "Revenue Report",
    description: "Total revenue, MRR, growth trends",
    icon: DollarSign,
    value: "$342,856",
    period: "This Month",
  },
  {
    id: "2",
    title: "Client Profitability",
    description: "Revenue by client, margins",
    icon: TrendingUp,
    value: "$89,234",
    period: "Average",
  },
  {
    id: "3",
    title: "Deal Pipeline",
    description: "Pipeline by stage, conversion rates",
    icon: BarChart3,
    value: "$1.2M",
    period: "Potential",
  },
  {
    id: "4",
    title: "Task Summary",
    description: "Completed, overdue, upcoming",
    icon: CheckSquare,
    value: "2,456",
    period: "This Quarter",
  },
  {
    id: "5",
    title: "Ticket SLA",
    description: "Resolution time, SLA compliance",
    icon: Clock,
    value: "98.3%",
    period: "On-Time",
  },
  {
    id: "6",
    title: "Team Performance",
    description: "Activity, deals closed, revenue",
    icon: TrendingUp,
    value: "125",
    period: "Deals Closed",
  },
]

export default function ReportsPage() {
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
        {REPORTS.map((report) => {
          const IconComponent = report.icon
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                  </div>
                  <IconComponent className="h-5 w-5 text-primary" />
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
          )
        })}
      </div>
    </div>
  )
}
