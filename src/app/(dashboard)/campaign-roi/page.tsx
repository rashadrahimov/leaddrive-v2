"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { DollarSign, TrendingUp, BarChart3, Target, Users, Eye, MousePointer } from "lucide-react"
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
  revenue: number
  totalDeals: number
  wonDeals: number
  roi: number
}

interface Summary {
  totalRevenue: number
  totalCost: number
  totalRoi: number
  campaignCount: number
}

export default function CampaignROIPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const [campaigns, setCampaigns] = useState<CampaignROI[]>([])
  const [summary, setSummary] = useState<Summary>({ totalRevenue: 0, totalCost: 0, totalRoi: 0, campaignCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/campaign-roi", {
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setCampaigns(j.data.campaigns || [])
          setSummary(j.data.summary)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session])

  const totalSent = campaigns.reduce((s, c) => s + c.totalSent, 0)
  const totalOpened = campaigns.reduce((s, c) => s + c.totalOpened, 0)
  const totalClicked = campaigns.reduce((s, c) => s + c.totalClicked, 0)

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

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-5 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Общий доход</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-green-600">${summary.totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Из выигранных сделок</p>
        </div>
        <div className="border rounded-lg p-5 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Стоимость</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">${summary.totalCost.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Бюджет кампаний</p>
        </div>
        <div className="border rounded-lg p-5 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">ROI</span>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={cn("text-3xl font-bold", summary.totalRoi >= 0 ? "text-green-600" : "text-red-500")}>
            {summary.totalRoi.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">(Доход - Стоимость) / Стоимость</p>
        </div>
        <div className="border rounded-lg p-5 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Кампании</span>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-primary">{summary.campaignCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Всего кампаний</p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="border rounded-lg p-4 bg-muted/30 flex items-center gap-8 text-sm">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Доставляемость:</span>
          <span className="font-bold text-primary">
            {campaigns.reduce((s, c) => s + c.totalRecipients, 0) > 0
              ? Math.round(totalSent / campaigns.reduce((s, c) => s + c.totalRecipients, 0) * 100)
              : 0}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Открываемость:</span>
          <span className="font-bold text-primary">{totalSent > 0 ? (totalOpened / totalSent * 100).toFixed(1) : 0}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MousePointer className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Кликабельность:</span>
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
          campaigns.map(campaign => (
            <div key={campaign.id} className="border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{campaign.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Доход: <strong className={cn("text-foreground", campaign.revenue > 0 && "text-green-600")}>${campaign.revenue.toLocaleString()}</strong></span>
                    <span>Стоимость: <strong className="text-foreground">${(campaign.budget || 0).toLocaleString()}</strong></span>
                    <span>Сделки: <strong className="text-foreground">{campaign.totalDeals}</strong></span>
                    <span>Выиграно: <strong className={cn("text-foreground", campaign.wonDeals > 0 && "text-green-600")}>{campaign.wonDeals}</strong></span>
                    <span>Лиды: <strong className="text-foreground">{campaign.totalRecipients}</strong></span>
                  </div>
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  campaign.roi > 0 ? "text-green-600" : campaign.roi < 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {campaign.budget > 0 ? `${campaign.roi.toFixed(1)}% ROI` : "—"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
