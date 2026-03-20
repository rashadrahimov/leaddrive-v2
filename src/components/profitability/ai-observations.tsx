"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, RefreshCw, Lightbulb, AlertTriangle, TrendingUp } from "lucide-react"

interface Observation {
  type: "insight" | "warning" | "opportunity"
  title: string
  description: string
}

const FALLBACK_OBSERVATIONS: Record<string, Observation[]> = {
  analytics: [
    { type: "warning", title: "Negative Overall Margin", description: "The portfolio is operating at negative margin. Review cost structure and pricing." },
    { type: "insight", title: "Core Services Drive Revenue", description: "IT and InfoSec services generate the majority of revenue. Focus on growing these." },
    { type: "opportunity", title: "Cost/User Optimization", description: "Increasing the user base can reduce cost per user without proportional cost increase." },
  ],
  services: [
    { type: "warning", title: "HelpDesk Cost Review", description: "HelpDesk may operate at negative margin. Review operator-to-revenue ratio." },
    { type: "insight", title: "Service Pricing Gap", description: "Some services may be underpriced relative to their cost base." },
    { type: "opportunity", title: "Service Bundling", description: "Consider bundling complementary services to increase average contract value." },
  ],
  clients: [
    { type: "insight", title: "Revenue Concentration", description: "Top clients account for a large share of revenue. Diversification recommended." },
    { type: "warning", title: "Unprofitable Clients", description: "Small clients with few users may not cover fixed cost allocation." },
    { type: "opportunity", title: "Minimum Client Threshold", description: "Consider a minimum user count or monthly fee for profitability." },
  ],
  overhead: [
    { type: "insight", title: "Admin Overhead Ratio", description: "Administrative overhead is a significant cost component. Review allocation." },
    { type: "opportunity", title: "Training ROI", description: "Verify training spend ROI and consider certification programs that increase billable rates." },
    { type: "warning", title: "License Costs", description: "Review major license costs to ensure they are fully passed through in pricing." },
  ],
}

interface AIObservationsProps {
  tab: string
}

export function AIObservations({ tab }: AIObservationsProps) {
  const [loading, setLoading] = useState(false)
  const [observations, setObservations] = useState<Observation[]>([])
  const [aiPowered, setAiPowered] = useState(false)

  const fetchObservations = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/ai-observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tab }),
      })
      const json = await res.json()
      if (json.success && json.data.observations?.length > 0) {
        setObservations(json.data.observations)
        setAiPowered(!json.data.fallback)
      } else {
        setObservations(FALLBACK_OBSERVATIONS[tab] || [])
        setAiPowered(false)
      }
    } catch {
      setObservations(FALLBACK_OBSERVATIONS[tab] || [])
      setAiPowered(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchObservations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const typeConfig = {
    insight: { icon: Lightbulb, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
    opportunity: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  }

  if (observations.length === 0 && !loading) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4" /> AI Observations
          {aiPowered && <Badge variant="outline" className="text-[10px] ml-1">Claude AI</Badge>}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchObservations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analyzing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && observations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Brain className="h-8 w-8 mx-auto mb-2 animate-pulse opacity-30" />
            Analyzing profitability data...
          </div>
        ) : (
          observations.map((obs, i) => {
            const config = typeConfig[obs.type] || typeConfig.insight
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
          })
        )}
        <p className="text-xs text-muted-foreground text-center">
          Powered by {aiPowered ? "Claude AI" : "Rule-based analysis"}
        </p>
      </CardContent>
    </Card>
  )
}
