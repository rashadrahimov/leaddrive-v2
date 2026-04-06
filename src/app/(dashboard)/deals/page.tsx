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
  stageChangedAt: string | null
  company: { id: string; name: string } | null
  nextTask?: { id: string; title: string; dueDate: string | null; status: string } | null
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
  const [pipelines, setPipelines] = useState<any[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("")
  const [pipelineSummary, setPipelineSummary] = useState<{ total: number; weighted: number; byStage: any[] } | null>(null)
  const orgId = session?.user?.organizationId

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
  const STAGES = (selectedPipeline?.stages || []).map((s: any) => ({
    key: s.name,
    name: s.name,
    label: s.displayName || s.name,
    displayName: s.displayName,
    color: s.color,
    hint: "",
  }))

  const fetchPipelines = async () => {
    try {
      const res = await fetch("/api/v1/pipelines")
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        setPipelines(json.data)
        const def = json.data.find((p: any) => p.isDefault) || json.data[0]
        setSelectedPipelineId(def.id)
      }
    } catch {}
  }

  const fetchDeals = async (pipelineId?: string) => {
    try {
      const pid = pipelineId || selectedPipelineId
      const url = pid ? `/api/v1/deals?limit=200&pipelineId=${pid}` : "/api/v1/deals?limit=200"
      const res = await fetch(url, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const json = await res.json()
      if (json.success) {
        setDeals(json.data.deals)
        if (json.data.pipelineSummary) setPipelineSummary(json.data.pipelineSummary)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchPipelines() }, [session])
  useEffect(() => { if (selectedPipelineId) fetchDeals(selectedPipelineId) }, [selectedPipelineId])

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
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
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
    stageChangedAt: d.stageChangedAt,
    nextTask: d.nextTask || null,
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
          {pipelines.length > 1 && (
            <Select
              value={selectedPipelineId}
              onChange={e => setSelectedPipelineId(e.target.value)}
              className="w-[180px]"
            >
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.isDefault ? " ★" : ""}</option>
              ))}
            </Select>
          )}
          {tab === "kanban" && (
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[180px]">
              <option value="newest">{t("sortNewest")}</option>
              <option value="oldest">{t("sortOldest")}</option>
              <option value="value_desc">{t("sortAmountDesc")}</option>
              <option value="value_asc">{t("sortAmountAsc")}</option>
              <option value="name">{t("sortNameAsc")}</option>
            </Select>
          )}
          <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1" /> {t("newDeal")}</Button>
        </div>
      </div>

      {/* Da Vinci AI button */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={runAiAnalysis}
          disabled={aiLoading || deals.length === 0}
          className="relative overflow-hidden bg-gradient-to-r from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))] hover:opacity-90 text-white border-0 shadow-md shadow-[hsl(var(--ai-from))]/25 hover:shadow-lg hover:shadow-[hsl(var(--ai-from))]/40 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
        >
          {aiLoading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <span className="relative mr-1.5 flex h-4 w-4 items-center justify-center">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </span>
          )}
          Da Vinci {tc("analytics").toLowerCase()}
        </Button>
      </div>

      {/* Da Vinci AI Analysis Card */}
      {aiOpen && (
        <div className="rounded-xl border border-[hsl(var(--ai-from))]/20 bg-card p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold">Da Vinci — {t("title")}</h3>
            </div>
            <button onClick={() => { setAiOpen(false); setAiResult(null) }} className="p-1 rounded-md hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          {aiLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {tc("loading")}...
            </div>
          )}
          {aiError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
              {aiError}
            </div>
          )}
          {aiResult && (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{aiResult}</div>
          )}
        </div>
      )}

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
            <ColorStatCard label={t("statTotal")} value={deals.length} icon={<Handshake className="h-4 w-4" />} color="blue" hint={t("hintTotalDeals")} />
            <ColorStatCard label={t("statPipelineValue")} value={`${totalValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} color="green" hint={t("hintPipelineValue")} />
            <ColorStatCard label={t("statWon")} value={`${wonValue.toLocaleString()} ₼`} icon={<TrendingUp className="h-4 w-4" />} color="teal" hint={t("hintWonValue")} />
            <ColorStatCard label={t("statLost")} value={lostCount} icon={<TrendingDown className="h-4 w-4" />} color="red" hint={t("hintLostCount")} />
          </div>

          {/* Weighted Pipeline Bar */}
          {pipelineSummary && pipelineSummary.total > 0 && (
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">{t("pipelineBar")}</span>
                    <p className="text-sm font-bold">{pipelineSummary.total.toLocaleString()} ₼</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">{t("weightedBar")}</span>
                    <p className="text-sm font-bold text-primary">{pipelineSummary.weighted.toLocaleString()} ₼</p>
                  </div>
                </div>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted gap-0.5">
                {pipelineSummary.byStage.map((s: any) => {
                  const pct = pipelineSummary.total > 0 ? (s.value / pipelineSummary.total) * 100 : 0
                  const stageInfo = STAGES.find((st: any) => st.key === s.name)
                  return (
                    <div
                      key={s.name}
                      className="h-full rounded-sm transition-all"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: stageInfo?.color || "#6366f1",
                      }}
                      title={`${stageInfo?.label || s.name}: ${s.value.toLocaleString()} ₼ (${t("weightedTooltip")} ${s.weighted.toLocaleString()} ₼)`}
                    />
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                {pipelineSummary.byStage.map((s: any) => {
                  const stageInfo = STAGES.find((st: any) => st.key === s.name)
                  return (
                    <div key={s.name} className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: stageInfo?.color || "#6366f1" }} />
                      <span className="text-[9px] text-muted-foreground">{stageInfo?.label || s.name} ({s.count})</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <KanbanBoard
            stages={STAGES}
            deals={kanbanDeals}
            onDealClick={(deal) => router.push(`/deals/${deal.id}`)}
            onDealMove={handleDealMove}
            onQuickAddTask={async (dealId, title) => {
              await fetch(`/api/v1/deals/${dealId}/next-steps`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>) },
                body: JSON.stringify({ title }),
              })
              fetchDeals()
            }}
          />
        </>
      )}

      <DealForm open={formOpen} onOpenChange={setFormOpen} onSaved={() => fetchDeals()} orgId={orgId} pipelineId={selectedPipelineId} />

    </div>
  )
}
