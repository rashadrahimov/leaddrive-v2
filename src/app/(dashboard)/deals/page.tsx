"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColorStatCard } from "@/components/color-stat-card"
import { KanbanBoard } from "@/components/deals/kanban-board"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Handshake, Plus, TrendingUp, TrendingDown, BarChart3, Columns3, List, Sparkles, X, Loader2, Search, Pencil, Trash2 } from "lucide-react"
import { DealForm } from "@/components/deal-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { useAutoTour } from "@/components/tour/tour-provider"
import { TourReplayButton } from "@/components/tour/tour-replay-button"
import { DealsAnalytics } from "@/components/deals/deals-analytics"
import { cn } from "@/lib/utils"
import { STAGE_COLORS } from "@/lib/constants"
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
  useAutoTour("deals")
  const [formOpen, setFormOpen] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | undefined>()
  const [sortBy, setSortBy] = useState("newest")
  const [tab, setTab] = useState<"analytics" | "kanban" | "list">("analytics")
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState("all")
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [pipelines, setPipelines] = useState<any[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("")
  const [pipelineSummary, setPipelineSummary] = useState<{ total: number; weighted: number; byStage: any[] } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
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

  // Filtered + sorted deals
  const filteredDeals = useMemo(() => {
    let result = [...deals]

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.company?.name || "").toLowerCase().includes(q) ||
        (d.notes || "").toLowerCase().includes(q)
      )
    }

    // Stage filter
    if (stageFilter !== "all") {
      result = result.filter(d => d.stage === stageFilter)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "value_desc": return b.valueAmount - a.valueAmount
        case "value_asc": return a.valueAmount - b.valueAmount
        case "name": return a.name.localeCompare(b.name)
        case "probability": return b.probability - a.probability
        case "close_date": return (a.expectedClose || "9999").localeCompare(b.expectedClose || "9999")
        default: return 0
      }
    })

    return result
  }, [deals, search, stageFilter, sortBy])

  const kanbanDeals = filteredDeals.map(d => ({
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

  const [moveError, setMoveError] = useState<string | null>(null)

  const handleDealMove = useCallback(async (dealId: string, newStage: string) => {
    setMoveError(null)
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d))
    try {
      const res = await fetch(`/api/v1/deals/${dealId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
        },
        body: JSON.stringify({ stage: newStage }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        if (data?.validationErrors?.length) {
          setMoveError(data.validationErrors.map((e: any) => e.message).join(". "))
        } else {
          setMoveError(data?.error || "Failed to move deal")
        }
        fetchDeals()
      }
    } catch {
      setMoveError("Network error")
      fetchDeals()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/deals/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    fetchDeals()
  }

  const totalValue = deals.reduce((s, d) => s + d.valueAmount, 0)
  const wonDeals = deals.filter(d => d.stage === "WON")
  const wonValue = wonDeals.reduce((s, d) => s + d.valueAmount, 0)
  const lostCount = deals.filter(d => d.stage === "LOST").length

  // Unique stages for filter buttons
  const stageNames = useMemo(() => {
    const names = [...new Set(deals.map(d => d.stage))]
    return STAGES.length > 0
      ? STAGES.map((s: any) => s.key).filter((k: string) => names.includes(k))
      : names
  }, [deals, STAGES])

  const getStageLabel = (stage: string) => {
    const s = STAGES.find((st: any) => st.key === stage)
    return s?.label || stage
  }

  const getStageColor = (stage: string) => {
    const s = STAGES.find((st: any) => st.key === stage)
    return s?.color || STAGE_COLORS.LEAD
  }

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
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">{t("title")} <TourReplayButton tourId="deals" /></h1>
          <p className="text-sm text-muted-foreground">{t("totalDeals", { count: deals.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div data-tour-id="deals-kanban" className="flex items-center rounded-lg border bg-muted/50 p-0.5">
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
            <button
              onClick={() => setTab("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
              {tc("list")}
            </button>
          </div>
          {pipelines.length > 1 && (
            <Select
              data-tour-id="deals-pipeline-select"
              value={selectedPipelineId}
              onChange={e => setSelectedPipelineId(e.target.value)}
              className="w-[180px]"
            >
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.isDefault ? " ★" : ""}</option>
              ))}
            </Select>
          )}
          {(tab === "kanban" || tab === "list") && (
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[180px]">
              <option value="newest">{t("sortNewest")}</option>
              <option value="oldest">{t("sortOldest")}</option>
              <option value="value_desc">{t("sortAmountDesc")}</option>
              <option value="value_asc">{t("sortAmountAsc")}</option>
              <option value="name">{t("sortNameAsc")}</option>
              <option value="probability">{t("winProbability")} ↓</option>
              <option value="close_date">{t("expectedClose")} ↑</option>
            </Select>
          )}
          <Button data-tour-id="deals-new" onClick={() => { setEditDeal(undefined); setFormOpen(true) }}><Plus className="h-4 w-4 mr-1" /> {t("newDeal")}</Button>
        </div>
      </div>

      {/* Search + Stage Filters (for kanban & list tabs) */}
      {(tab === "kanban" || tab === "list") && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={stageFilter === "all" ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => setStageFilter("all")}
            >
              {tc("all")} ({deals.length})
            </Button>
            {stageNames.map(stage => {
              const count = deals.filter(d => d.stage === stage).length
              return (
                <Button
                  key={stage}
                  variant={stageFilter === stage ? "default" : "outline"}
                  size="sm"
                  className="h-9"
                  onClick={() => setStageFilter(stageFilter === stage ? "all" : stage)}
                >
                  {getStageLabel(stage)} ({count})
                </Button>
              )
            })}
          </div>
        </div>
      )}

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
      ) : tab === "list" ? (
        /* LIST VIEW */
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-primary/[0.03] dark:bg-white/[0.03]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tc("name")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("company")}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("dealValue")}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tc("status")}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("winProbability")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("expectedClose")}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Handshake className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {search ? t("noDeals") : t("noDeals")}
                  </td>
                </tr>
              ) : (
                filteredDeals.map(deal => (
                  <tr
                    key={deal.id}
                    className="border-b border-border/30 transition-colors hover:bg-primary/[0.03] dark:hover:bg-white/[0.04] cursor-pointer group"
                    onClick={() => router.push(`/deals/${deal.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium">{deal.name}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {deal.company?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {deal.valueAmount.toLocaleString()} {deal.currency}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium"
                        style={{ borderColor: getStageColor(deal.stage), color: getStageColor(deal.stage) }}
                      >
                        {getStageLabel(deal.stage)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "text-xs font-medium",
                        deal.probability >= 70 ? "text-green-600 dark:text-green-400" :
                        deal.probability >= 40 ? "text-amber-600 dark:text-amber-400" :
                        "text-muted-foreground"
                      )}>
                        {deal.probability}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {deal.expectedClose
                        ? new Date(deal.expectedClose).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditDeal(deal); setFormOpen(true) }}
                          className="p-1 rounded hover:bg-muted"
                          title={t("editDeal")}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(deal.id); setDeleteName(deal.name) }}
                          className="p-1 rounded hover:bg-muted"
                          title={t("deleteDealBtn")}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredDeals.length > 0 && (
            <div className="px-4 py-2 border-t border-border/30 bg-muted/20 text-xs text-muted-foreground">
              {filteredDeals.length} {filteredDeals.length !== deals.length ? `/ ${deals.length}` : ""} {t("totalDeals", { count: filteredDeals.length }).replace(/\d+\s*/, "")}
            </div>
          )}
        </div>
      ) : (
        /* KANBAN VIEW */
        <>
          <div data-tour-id="deals-summary" className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
            <ColorStatCard label={t("statTotal")} value={filteredDeals.length} icon={<Handshake className="h-4 w-4" />} color="blue" hint={t("hintTotalDeals")} />
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
                        backgroundColor: stageInfo?.color || STAGE_COLORS.LEAD,
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
                      <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: stageInfo?.color || STAGE_COLORS.LEAD }} />
                      <span className="text-[9px] text-muted-foreground">{stageInfo?.label || s.name} ({s.count})</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {moveError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800/30 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
              <span className="flex-1">{moveError}</span>
              <button onClick={() => setMoveError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
            </div>
          )}

          <div data-tour-id="deals-card">
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
          </div>
        </>
      )}

      <DealForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditDeal(undefined) }}
        onSaved={() => fetchDeals()}
        orgId={orgId}
        pipelineId={selectedPipelineId}
        initialData={editDeal}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={t("deleteDeal")}
        itemName={deleteName}
      />
    </div>
  )
}
