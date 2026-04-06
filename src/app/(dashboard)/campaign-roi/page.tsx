"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { DollarSign, TrendingUp, BarChart3, Target, Users, Eye, MousePointer } from "lucide-react"
import { cn } from "@/lib/utils"
import { ColorStatCard } from "@/components/color-stat-card"
import { InfoHint } from "@/components/info-hint"
import { PageDescription } from "@/components/page-description"

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
  const t = useTranslations("campaigns")
  const tr = useTranslations("campaignRoi")
  const tc = useTranslations("common")
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const [campaigns, setCampaigns] = useState<CampaignROI[]>([])
  const [summary, setSummary] = useState<Summary>({ totalRevenue: 0, totalCost: 0, totalRoi: 0, campaignCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/campaign-roi", {
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
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
        <h1 className="text-2xl font-bold tracking-tight">{t("title")} ROI</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">{t("title")} ROI</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <PageDescription text={tr("pageDescription")} />

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ColorStatCard label={tc("revenue")} value={`$${summary.totalRevenue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} color="green" hint={tr("hintTotalRevenue")} />
        <ColorStatCard label={tc("cost")} value={`$${summary.totalCost.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} color="blue" hint={tr("hintTotalCost")} />
        <ColorStatCard label="ROI" value={`${summary.totalRoi.toFixed(1)}%`} icon={<BarChart3 className="h-4 w-4" />} color={summary.totalRoi >= 0 ? "teal" : "red"} hint={tr("hintRoi")} />
        <ColorStatCard label={t("title")} value={summary.campaignCount} icon={<Target className="h-4 w-4" />} color="violet" />
      </div>

      {/* Summary bar */}
      <div className="border rounded-lg p-4 bg-muted/30 flex items-center gap-8 text-sm">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{t("sent")}:</span>
          <span className="font-bold text-primary">
            {campaigns.reduce((s, c) => s + c.totalRecipients, 0) > 0
              ? Math.round(totalSent / campaigns.reduce((s, c) => s + c.totalRecipients, 0) * 100)
              : 0}%
          </span>
          <InfoHint text={tr("hintSendRate")} size={12} />
        </div>
        <div className="flex items-center gap-1.5">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{tc("openRate")}:</span>
          <span className="font-bold text-primary">{totalSent > 0 ? (totalOpened / totalSent * 100).toFixed(1) : 0}%</span>
          <InfoHint text={tr("hintOpenRate")} size={12} />
        </div>
        <div className="flex items-center gap-1.5">
          <MousePointer className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{tc("clickRate")}:</span>
          <span className="font-bold text-primary">{totalSent > 0 ? (totalClicked / totalSent * 100).toFixed(1) : 0}%</span>
          <InfoHint text={tr("hintClickRate")} size={12} />
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
