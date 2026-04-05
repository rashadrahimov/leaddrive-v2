"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft, Pencil, Trash2, Megaphone, Users, Mail, MousePointerClick,
  CheckCircle2, XCircle, AlertTriangle, Eye, BarChart3
} from "lucide-react"
import { ColorStatCard } from "@/components/color-stat-card"
import { PageDescription } from "@/components/page-description"
import { CampaignForm } from "@/components/campaign-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import dynamic from "next/dynamic"

const CampaignFlowEditor = dynamic(
  () => import("@/components/campaign-flow-editor").then(m => m.CampaignFlowEditor),
  { ssr: false, loading: () => <div className="h-[600px] bg-muted/30 rounded-xl animate-pulse" /> }
)

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-foreground/70",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  paused: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
  ab_testing: "bg-purple-100 text-purple-700",
}

export default function CampaignDetailPage() {
  const t = useTranslations("campaigns")
  const tc = useTranslations("common")
  const tab = useTranslations("abTest")
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [campaign, setCampaign] = useState<any>(null)
  const [variants, setVariants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const orgId = session?.user?.organizationId

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/v1/campaigns/${params.id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success && json.data) {
        setCampaign(json.data)
        // Fetch variants if A/B test
        if (json.data.isAbTest) {
          fetch(`/api/v1/campaigns/${params.id}/variants`, {
            headers: orgId ? { "x-organization-id": String(orgId) } : {},
          }).then(r => r.json()).then(vj => {
            if (vj.success) setVariants(vj.data || [])
          }).catch(() => {})
        }
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { if (params.id) fetchCampaign() }, [params.id, session])

  const handleDelete = async () => {
    const res = await fetch(`/api/v1/campaigns/${params.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error(tc("failedToSave"))
    router.push("/campaigns")
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-4 gap-3">{[0,1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}</div>
      </div>
    )
  }

  if (!campaign) return <div className="text-center py-12 text-muted-foreground">{tc("noData")}</div>

  const totalSent = campaign.totalSent ?? 0
  const totalOpened = campaign.totalOpened ?? 0
  const totalClicked = campaign.totalClicked ?? 0
  const totalBounced = campaign.totalBounced ?? 0
  const totalUnsub = campaign.totalUnsubscribed ?? 0
  const totalSpam = campaign.totalSpam ?? 0
  const delivered = totalSent - totalBounced
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0
  const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0
  const bounceRate = totalSent > 0 ? Math.round((totalBounced / totalSent) * 100) : 0

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold truncate">{campaign.name}</h1>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_STYLES[campaign.status] || ""}>{campaign.status}</Badge>
                <Badge variant="outline" className="text-xs">{campaign.type}</Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> {tc("edit")}
          </Button>
          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> {tc("delete")}
          </Button>
        </div>
      </div>

      {/* Creatio-style KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-500 text-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">{t("sent")}</span>
            <CheckCircle2 className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{delivered.toLocaleString()}</span>
        </div>
        <div className="bg-amber-500 text-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">Bounces</span>
            <XCircle className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{totalBounced}</span>
        </div>
        <div className="bg-orange-500 text-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">Unsubscribes</span>
            <Users className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{totalUnsub}</span>
        </div>
        <div className="bg-red-500 text-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">Spam</span>
            <AlertTriangle className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{totalSpam}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ColorStatCard label={t("opens")} value={totalOpened.toLocaleString()} icon={<Eye className="h-4 w-4" />} color="blue" hint={t("hintOpens")} />
        <ColorStatCard label={t("openRate")} value={`${openRate}%`} icon={<BarChart3 className="h-4 w-4" />} color="teal" hint={t("hintOpenRate")} />
        <ColorStatCard label={t("clicks")} value={totalClicked.toLocaleString()} icon={<MousePointerClick className="h-4 w-4" />} color="violet" hint={t("hintClicks")} />
        <ColorStatCard label={t("clickRate")} value={`${clickRate}%`} icon={<BarChart3 className="h-4 w-4" />} color="indigo" hint={t("hintClickRate")} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="results" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 h-auto">
          <TabsTrigger value="results" className="rounded-md text-sm">{tc("results")}</TabsTrigger>
          <TabsTrigger value="flow" className="rounded-md text-sm">Flow</TabsTrigger>
          <TabsTrigger value="details" className="rounded-md text-sm">{tc("details")}</TabsTrigger>
          {campaign.isAbTest && <TabsTrigger value="ab-test" className="rounded-md text-sm">{tab("results")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Delivery Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: tab("openRate"), pct: openRate, color: "bg-blue-500" },
                  { label: tab("clickRate"), pct: clickRate, color: "bg-green-500" },
                  { label: t("bounceRate") || "Bounce rate", pct: bounceRate, color: "bg-red-400" },
                ].map(r => (
                  <div key={r.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-semibold">{r.pct}%</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${Math.max(r.pct, 2)}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Financial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: t("budget"), value: `${(campaign.budget || 0).toLocaleString()} ₼` },
                  { label: tc("cost"), value: `${(campaign.actualCost || 0).toLocaleString()} ₼` },
                  { label: tc("cost"), value: totalSent > 0 ? `${((campaign.actualCost || 0) / totalSent).toFixed(2)} ₼` : "—" },
                  { label: tc("cost"), value: totalClicked > 0 ? `${((campaign.actualCost || 0) / totalClicked).toFixed(2)} ₼` : "—" },
                ].map(f => (
                  <div key={f.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium">{f.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="flow">
          <CampaignFlowEditor
            flowData={campaign.flowData as any}
            readOnly={campaign.status === "sent" || campaign.status === "completed"}
            onSave={async (data) => {
              await fetch(`/api/v1/campaigns/${params.id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  ...(orgId ? { "x-organization-id": String(orgId) } : {}),
                },
                body: JSON.stringify({ flowData: data }),
              })
              fetchCampaign()
            }}
          />
        </TabsContent>

        <TabsContent value="details">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: tc("subject"), value: campaign.subject || "—" },
                { label: tc("type"), value: campaign.type },
                { label: t("recipients"), value: (campaign.totalRecipients ?? 0).toLocaleString() },
                { label: t("sent"), value: totalSent.toLocaleString() },
                { label: tc("date"), value: campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString("ru-RU") : "—" },
                { label: t("sent"), value: campaign.sentAt ? new Date(campaign.sentAt).toLocaleString("ru-RU") : "—" },
                { label: tc("createdAt"), value: new Date(campaign.createdAt).toLocaleString("ru-RU") },
              ].map(d => (
                <div key={d.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
              {campaign.description && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">{tc("description")}</p>
                  <p className="text-sm">{campaign.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* A/B Test Results Tab */}
        {campaign.isAbTest && (
          <TabsContent value="ab-test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tab("results")}</CardTitle>
              </CardHeader>
              <CardContent>
                {variants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{tab("noVariants")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">{tab("variant")}</th>
                          <th className="text-left px-4 py-2 font-medium">{tab("subject")}</th>
                          <th className="text-right px-4 py-2 font-medium">{tab("sent")}</th>
                          <th className="text-right px-4 py-2 font-medium">{tab("opened")}</th>
                          <th className="text-right px-4 py-2 font-medium">{tab("openRate")}</th>
                          <th className="text-right px-4 py-2 font-medium">{tab("clicked")}</th>
                          <th className="text-right px-4 py-2 font-medium">{tab("ctr")}</th>
                          <th className="text-center px-4 py-2 font-medium">{tab("winner")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v: any) => {
                          const openRate = v.totalSent > 0 ? (v.totalOpened / v.totalSent * 100).toFixed(1) : "0.0"
                          const ctr = v.totalSent > 0 ? (v.totalClicked / v.totalSent * 100).toFixed(1) : "0.0"
                          return (
                            <tr key={v.id} className={`border-t ${v.isWinner ? "bg-green-50 dark:bg-green-900/10" : ""}`}>
                              <td className="px-4 py-3 font-medium">{v.name}</td>
                              <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{v.subject || campaign.subject || "—"}</td>
                              <td className="px-4 py-3 text-right">{v.totalSent}</td>
                              <td className="px-4 py-3 text-right">{v.totalOpened}</td>
                              <td className="px-4 py-3 text-right font-medium">{openRate}%</td>
                              <td className="px-4 py-3 text-right">{v.totalClicked}</td>
                              <td className="px-4 py-3 text-right font-medium">{ctr}%</td>
                              <td className="px-4 py-3 text-center">
                                {v.isWinner && <Badge className="bg-green-100 text-green-700">{tab("winner")}</Badge>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Visual bar chart comparison */}
                {variants.length >= 2 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">{tab("performanceComparison")}</h4>
                    {variants.map((v: any) => {
                      const openRate = v.totalSent > 0 ? (v.totalOpened / v.totalSent * 100) : 0
                      const ctr = v.totalSent > 0 ? (v.totalClicked / v.totalSent * 100) : 0
                      return (
                        <div key={v.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{v.name} {v.isWinner && "★"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-14">Open</span>
                            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, openRate)}%` }} />
                            </div>
                            <span className="text-xs font-mono w-12 text-right">{openRate.toFixed(1)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-14">CTR</span>
                            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, ctr)}%` }} />
                            </div>
                            <span className="text-xs font-mono w-12 text-right">{ctr.toFixed(1)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {campaign.winnerSelectedAt && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {tab("winnerSelected")}: {new Date(campaign.winnerSelectedAt).toLocaleString("ru-RU")}
                  </p>
                )}
                {campaign.status === "ab_testing" && !campaign.winnerSelectedAt && (
                  <p className="text-xs text-amber-600 mt-3">
                    {tab("testInProgress")} {campaign.testDurationHours || 4} {tab("hours")}.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <CampaignForm
        open={editOpen} onOpenChange={setEditOpen} onSaved={fetchCampaign} orgId={orgId}
        initialData={{
          id: campaign.id, name: campaign.name || "", type: campaign.type || "email",
          status: campaign.status || "draft", subject: campaign.subject || "",
          totalRecipients: campaign.totalRecipients || 0, budget: campaign.budget || 0,
          scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().split("T")[0] : "",
          recipientMode: campaign.recipientMode, segmentId: campaign.segmentId,
          recipientIds: campaign.recipientIds, recipientSource: campaign.recipientSource,
          isAbTest: campaign.isAbTest, abTestType: campaign.abTestType,
          testPercentage: campaign.testPercentage, testDurationHours: campaign.testDurationHours,
          winnerCriteria: campaign.winnerCriteria,
        }}
      />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} title={t("deleteCampaign")} itemName={campaign.name} />
    </div>
  )
}
