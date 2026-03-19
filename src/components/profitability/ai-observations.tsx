"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, RefreshCw, Lightbulb, AlertTriangle, TrendingUp } from "lucide-react"

interface Observation {
  type: "insight" | "warning" | "opportunity"
  title: string
  description: string
}

const MOCK_OBSERVATIONS: Record<string, Observation[]> = {
  analytics: [
    { type: "warning", title: "Negative Overall Margin", description: "The portfolio is operating at -4.57% margin (−28,185 ₼/mo). HelpDesk is the primary cost driver at 236,368 ₼/mo with only 88,899 ₼ in revenue." },
    { type: "insight", title: "IT and InfoSec Carry the Business", description: "Daimi IT (51.6% margin) and InfoSec (43.5% margin) together generate 85% of total revenue. These are your core profitable services." },
    { type: "opportunity", title: "Cost/User Optimization", description: "At 143.38 ₼/user, there's room to optimize. Increasing the user base by 500 (11%) would drop cost/user to ~129 ₼ without proportional cost increase." },
  ],
  services: [
    { type: "warning", title: "HelpDesk Margin Crisis", description: "HelpDesk operates at -165.8% margin. With 56 operators serving the portfolio, the revenue per operator (1,588 ₼) is far below the fully-loaded cost (4,221 ₼)." },
    { type: "insight", title: "GRC Underpriced", description: "GRC at 1.86 ₼/user barely covers direct costs. With 8 specialists, consider premium pricing or bundling with InfoSec." },
    { type: "opportunity", title: "PM Service Expansion", description: "Project Management has 5 skilled PMs but generates only 2,516 ₼/mo revenue. This team could be offered as a value-add to existing enterprise clients." },
  ],
  clients: [
    { type: "insight", title: "Top 3 Clients = 68% Revenue", description: "SOCAR, Azərişıq, and Kapital Bank account for 211,500 ₼ of 310,000 ₼ total revenue. High concentration risk — losing any would be significant." },
    { type: "warning", title: "38 Loss-Making Clients", description: "70% of the client base is unprofitable. Most are small accounts where the fixed cost allocation exceeds their revenue contribution." },
    { type: "opportunity", title: "Minimum Viable Client", description: "Clients with <50 users are almost always unprofitable. Consider a minimum user threshold of 75+ or introducing a minimum monthly fee." },
  ],
  overhead: [
    { type: "insight", title: "Admin OH = 30.6% of Total Cost", description: "At 197,655 ₼/mo, admin overhead is the second largest cost component. Office rent (30K) and trainings (20.8K) are the biggest items." },
    { type: "opportunity", title: "Training Cost Review", description: "250K/year on trainings (20,833 ₼/mo) — verify ROI and consider shifting some budget to certification programs that increase billable rates." },
    { type: "warning", title: "Cortex XDR License Cost", description: "Cortex at 49,167 ₼/mo is the single most expensive tech overhead item. Ensure this cost is fully passed through to InfoSec pricing." },
  ],
}

interface AIObservationsProps {
  tab: string
}

export function AIObservations({ tab }: AIObservationsProps) {
  const [loading, setLoading] = useState(false)
  const [observations, setObservations] = useState<Observation[]>(MOCK_OBSERVATIONS[tab] || [])

  const handleRefresh = () => {
    setLoading(true)
    // Simulate AI call
    setTimeout(() => {
      setObservations(MOCK_OBSERVATIONS[tab] || [])
      setLoading(false)
    }, 1500)
  }

  const typeConfig = {
    insight: { icon: Lightbulb, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
    opportunity: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  }

  if (observations.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4" /> AI Observations
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analyzing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {observations.map((obs, i) => {
          const config = typeConfig[obs.type]
          const Icon = config.icon
          return (
            <div key={i} className={`rounded-lg p-3 ${config.bg}`}>
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{obs.title}</span>
                    <Badge className={`text-[10px] ${config.badge}`}>
                      {obs.type === "insight" ? "Insight" : obs.type === "warning" ? "Warning" : "Opportunity"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{obs.description}</p>
                </div>
              </div>
            </div>
          )
        })}
        <p className="text-xs text-muted-foreground text-center">
          Powered by Claude · Cached for 1 hour · Extended Thinking enabled
        </p>
      </CardContent>
    </Card>
  )
}
