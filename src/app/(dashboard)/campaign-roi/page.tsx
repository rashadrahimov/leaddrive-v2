"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { StatCard } from "@/components/stat-card"
import { DollarSign, TrendingUp, BarChart3, Target, Users, Send, MousePointer, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface CampaignROI {
  id: string
  name: string
  status: string
  type: string
  budget: number
  totalRecipients: number
  totalSent: number
  totalOpened: number
  totalClicked: number
  sentAt: string | null
}

export default function CampaignROIPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const [campaigns, setCampaigns] = useState<CampaignROI[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/campaigns?limit=500", {
      headers: { "x-organization-id": String(orgId) },
    })
      .then(r => r.json())
      .then(j => {
        if (j.success) setCampaigns(j.data.campaigns || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  // Aggregate stats
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0)
  const sentCampaigns = campaigns.filter(c => c.status === "sent")
  const totalSent = campaigns.reduce((s, c) => s + c.totalSent, 0)
  const totalOpened = campaigns.reduce((s, c) => s + c.totalOpened, 0)
  const totalClicked = campaigns.reduce((s, c) => s + c.totalClicked, 0)
  const totalRecipients = campaigns.reduce((s, c) => s + c.totalRecipients, 0)

  // ROI = (revenue - cost) / cost * 100. No revenue tracking yet, so ROI = -100% if budget > 0
  const roi = totalBudget > 0 ? -100 : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">ROI кампаний</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-lg">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ROI кампаний</h1>
          <p className="text-sm text-muted-foreground">Анализ окупаемости инвестиций в кампании</p>
        </div>
      </div>

      {/* Stats cards like v1 */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-5 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Общий доход</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-green-600">$0</div>
          <p className="text-xs text-muted-foreground mt-1">Общий доход</p>
        </div>
        <div className="border rounded-lg p-5 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Стоимость</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">${totalBudget.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Стоимость</p>
        </div>
        <div className="border rounded-lg p-5 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">ROI</span>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={cn("text-3xl font-bold", roi >= 0 ? "text-green-600" : "text-red-500")}>
            {roi.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">ROI</p>
        </div>
        <div className="border rounded-lg p-5 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Кампании</span>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-primary">{sentCampaigns.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Кампании</p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="border rounded-lg p-4 bg-muted/30 flex items-center gap-8 text-sm">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Средний балл:</span>
          <span className="font-bold text-primary">{totalRecipients > 0 ? Math.round(totalSent / totalRecipients * 100) : 0}/100</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Ср. открываемость:</span>
          <span className="font-bold text-primary">{totalSent > 0 ? (totalOpened / totalSent * 100).toFixed(1) : 0}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MousePointer className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Ср. кликабельность:</span>
          <span className="font-bold text-primary">{totalSent > 0 ? (totalClicked / totalSent * 100).toFixed(1) : 0}%</span>
        </div>
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Нет кампаний для анализа
          </div>
        ) : (
          campaigns.map(campaign => {
            const campRoi = campaign.budget > 0 ? -100 : 0
            return (
              <div key={campaign.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Доход: <strong className="text-foreground">$0</strong></span>
                      <span>Стоимость: <strong className="text-foreground">${(campaign.budget || 0).toLocaleString()}</strong></span>
                      <span>Лиды: <strong className="text-foreground">{campaign.totalRecipients}</strong></span>
                      <span>Конверсии: <strong className="text-foreground">{campaign.totalClicked}</strong></span>
                    </div>
                  </div>
                  <div className={cn(
                    "text-lg font-bold",
                    campRoi >= 0 ? "text-green-600" : "text-red-500"
                  )}>
                    {campRoi.toFixed(1)}% ROI
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
