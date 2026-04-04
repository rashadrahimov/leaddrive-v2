"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ColorStatCard } from "@/components/color-stat-card"
import { KanbanBoard } from "@/components/deals/kanban-board"
import { Select } from "@/components/ui/select"
import { Handshake, Plus, TrendingUp, TrendingDown, BarChart3, Columns3, Sparkles, X, Loader2 } from "lucide-react"
import { DealForm } from "@/components/deal-form"
import { PageDescription } from "@/components/page-description"
import { DealsAnalytics } from "@/components/deals/deals-analytics"
import { cn } from "@/lib/utils"
import { useLocale } from "next-intl"

interface Deal {
  id: string
  name: string
  valueAmount: number
  currency: string
  stage: string
  assignedTo: string | null
  probability: number
  notes: string | null
  expectedClose: string | null
  createdAt: string
  company: { id: string; name: string } | null
}

export default function DealsPage() {
  const t = useTranslations("deals")
  const tc = useTranslations("common")
  const locale = useLocale()
  const { data: session } = useSession()
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [sortBy, setSortBy] = useState("newest")
  const [tab, setTab] = useState<"analytics" | "kanban">("analytics")
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const orgId = session?.user?.organizationId

  const STAGES = [
    { name: "LEAD", displayName: t("stageLead"), color: "#6366f1", hint: t("hintStageLead") },
    { name: "QUALIFIED", displayName: t("stageQualified"), color: "#3b82f6", hint: t("hintStageQualified") },
    { name: "PROPOSAL", displayName: t("stageProposal"), color: "#f59e0b", hint: t("hintStageProposal") },
    { name: "NEGOTIATION", displayName: t("stageNegotiation"), color: "#f97316", hint: t("hintStageNegotiation") },
    { name: "WON", displayName: t("stageWon"), color: "#22c55e", hint: t("hintStageWon") },
    { name: "LOST", displayName: t("stageLost"), color: "#ef4444", hint: t("hintStageLost") },
  ]

  const fetchDeals = async () => {
    try {
      const res = await fetch("/api/v1/deals?limit=200", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setDeals(json.data.deals)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchDeals() }, [session])

  const runAiAnalysis = async () => {
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    setAiOpen(true)
    try {
      const res = await fetch("/api/v1/deals/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ lang: locale }),
      })
      const json = await res.json()
      if (json.success) {
        setAiResult(json.data.analysis)
      } else {
        setAiError(json.error || "Analysis failed")
      }
    } catch {
      setAiError("Network error")
    } finally {
      setAiLoading(false)
    }
  }

  const sortedDeals = [...deals].sort((a, b) => {
    switch (sortBy) {
      case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "value_desc": return b.valueAmount - a.valueAmount
      case "value_asc": return a.valueAmount - b.valueAmount
      case "name": return a.name.localeCompare(b.name)
      default: return 0
    }
  })

  const kanbanDeals = sortedDeals.map(d => ({
    id: d.id,
    name: d.name,
    company: d.company?.name || "",
    valueAmount: d.valueAmount,
    currency: d.currency,
    stage: d.stage,
    assignedTo: d.assignedTo || "",
    probability: d.probability,
  }))

  const handleDealMove = useCallback(async (dealId: string, newStage: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d))
    try {
      await fetch(`/api/v1/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      })
    } catch {
      fetchDeals()
    }
  }, [])

  const totalValue = deals.reduce((s, d) => s + d.valueAmount, 0)
  const wonDeals = deals.filter(d => d.stage === "WON")
  const wonValue = wonDeals.reduce((s, d) => s + d.valueAmount, 0)
  const lostCount = deals.filter(d => d.stage === "LOST").length

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("totalDeals", { count: deals.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
            <button
              onClick={() => setTab("analytics")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "analytics" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              {tc("analytics")}
            </button>
            <button
              onClick={() => setTab("kanban")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "kanban" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Columns3 className="h-4 w-4" />
              {tc("kanban")}
            </button>
          </div>
          {tab === "kanban" && (
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[180px]">
              <option value="newest">{t("sortNewest")}</option>
              <option value="oldest">{t("sortOldest")}</option>
              <option value="value_desc">{t("sortAmountDesc")}</option>
              <option value="value_asc">{t("sortAmountAsc")}</option>
              <option value="name">{t("sortNameAsc")}</option>
            </Select>
          )}
          <Button variant="outline" onClick={runAiAnalysis} disabled={aiLoading || deals.length === 0} className="gap-1.5">
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Da Vinci
          </Button>
          <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1" /> {t("newDeal")}</Button>
        </div>
      </div>

      {tab === "analytics" ? (
        <DealsAnalytics
          deals={deals.map(d => ({
            id: d.id,
            title: d.name,
            value: d.valueAmount,
            stage: d.stage,
            probability: d.probability,
            company: d.company ? { name: d.company.name } : undefined,
            expectedCloseDate: d.expectedClose || undefined,
            createdAt: d.createdAt,
          }))}
          pipelineValue={totalValue}
          wonValue={wonValue}
          lostCount={lostCount}
          wonCount={wonDeals.length}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ColorStatCard label={t("statTotal")} value={deals.length} icon={<Handshake className="h-4 w-4" />} color="blue" hint={t("hintTotalDeals")} />
            <ColorStatCard label={t("statPipelineValue")} value={`${totalValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} color="green" hint={t("hintPipelineValue")} />
            <ColorStatCard label={t("statWon")} value={`${wonValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} color="teal" hint={t("hintWonValue")} />
            <ColorStatCard label={t("statLost")} value={lostCount} icon={<TrendingDown className="h-4 w-4" />} color="red" hint={t("hintLostCount")} />
          </div>

          <KanbanBoard
            stages={STAGES}
            deals={kanbanDeals}
            onDealClick={(deal) => router.push(`/deals/${deal.id}`)}
            onDealMove={handleDealMove}
          />
        </>
      )}

      <DealForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchDeals} orgId={orgId} />

      {/* Da Vinci AI Analysis Modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAiOpen(false)}>
          <div className="relative w-full max-w-2xl max-h-[80vh] mx-4 rounded-xl border bg-card shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold">Da Vinci — {t("title")}</h3>
              </div>
              <button onClick={() => setAiOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{tc("loading")}...</p>
                </div>
              )}
              {aiError && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
                  {aiError}
                </div>
              )}
              {aiResult && (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {aiResult}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
