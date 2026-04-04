"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MotionPage, MotionCard } from "@/components/ui/motion"
import {
  ArrowLeft, Pencil, Trash2, AlertCircle, Tag, Plus, X,
  CheckCircle2, Clock, Loader2,
} from "lucide-react"
import { DealForm } from "@/components/deal-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { StageProgress } from "@/components/deals/stage-progress"
import { QuickActionBar } from "@/components/deals/quick-action-bar"
import { DealSidebar } from "@/components/deals/deal-sidebar"
import { ActivityTimeline } from "@/components/deals/activity-timeline"
import { StageValidationDialog } from "@/components/deals/stage-validation-dialog"

const STAGE_STYLES = [
  { key: "LEAD",        color: "#6366f1", bg: "bg-indigo-500" },
  { key: "QUALIFIED",   color: "#3b82f6", bg: "bg-blue-500" },
  { key: "PROPOSAL",    color: "#f59e0b", bg: "bg-amber-500" },
  { key: "NEGOTIATION", color: "#f97316", bg: "bg-orange-500" },
  { key: "WON",         color: "#22c55e", bg: "bg-green-500" },
  { key: "LOST",        color: "#ef4444", bg: "bg-red-500" },
]

interface Deal {
  id: string
  name: string
  stage: string
  valueAmount: number
  currency: string
  probability: number
  confidenceLevel: number
  assignedTo: string | null
  notes: string | null
  expectedClose: string | null
  stageChangedAt: string | null
  createdAt: string
  updatedAt: string
  lostReason: string | null
  tags: string[]
  contactId: string | null
  customerNeed: string | null
  salesChannel: string | null
  company: { id: string; name: string } | null
  campaign: { id: string; name: string } | null
  contact: { id: string; fullName: string; position: string | null; email: string | null; phone: string | null; avatar: string | null } | null
  teamMembers: Array<{
    id: string; userId: string; role: string
    user: { id: string; name: string | null; email: string; avatar: string | null; role: string | null }
  }>
  contactRoles: Array<{
    id: string; contactId: string; role: string; influence: string; decisionFactor: string; loyalty: string
    isPrimary: boolean; cashbackType: string | null; cashbackValue: number | null
    contact: { id: string; fullName: string; position: string | null; email: string | null; phone: string | null }
  }>
}

// ── Tags Input ──
function TagsInput({ tags, onChange, addTagLabel }: { tags: string[]; onChange: (tags: string[]) => void; addTagLabel: string }) {
  const [input, setInput] = useState("")
  const TAG_COLORS = ["bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"]

  const addTag = () => {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInput("")
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag, i) => (
        <span key={tag} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${TAG_COLORS[i % TAG_COLORS.length]}`}>
          {tag}
          <button onClick={() => onChange(tags.filter(t => t !== tag))} className="hover:opacity-70">
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        className="h-5 w-20 border rounded-full px-2 text-[11px] bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
        placeholder={`+ ${addTagLabel}`}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
        onBlur={addTag}
      />
    </div>
  )
}

// ── Next Steps widget ──
function NextStepsWidget({ dealId, orgId, steps, fetchSteps }: {
  dealId: string; orgId?: string
  steps: Array<{ id: string; title: string; status: string; dueDate: string | null; completedAt: string | null }>
  fetchSteps: () => void
}) {
  const tc = useTranslations("common")
  const [newTitle, setNewTitle] = useState("")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(orgId ? { "x-organization-id": orgId } : {}),
  }

  const pending = steps.filter(s => s.status !== "completed")
  const completed = steps.filter(s => s.status === "completed")

  const completeStep = async (stepId: string) => {
    await fetch(`/api/v1/deals/${dealId}/next-steps`, {
      method: "PUT", headers,
      body: JSON.stringify({ taskId: stepId, status: "completed" }),
    })
    fetchSteps()
  }

  const addStep = async () => {
    if (!newTitle.trim()) return
    await fetch(`/api/v1/deals/${dealId}/next-steps`, {
      method: "POST", headers,
      body: JSON.stringify({ title: newTitle.trim() }),
    })
    setNewTitle("")
    fetchSteps()
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{tc("nextSteps")}</span>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{pending.length}</span>
      </div>

      {pending.map(step => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5 py-1.5"
        >
          <button
            className="h-4.5 w-4.5 rounded-full border-2 border-border hover:border-primary hover:bg-primary/10 flex-shrink-0 transition-colors"
            onClick={() => completeStep(step.id)}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{step.title}</p>
            {step.dueDate && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(step.dueDate).toLocaleDateString("az-AZ")}
              </p>
            )}
          </div>
        </motion.div>
      ))}

      {completed.length > 0 && (
        <div className="pt-1.5 space-y-0.5">
          {completed.slice(0, 3).map(step => (
            <div key={step.id} className="flex items-center gap-2.5 py-1 opacity-40">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              <p className="text-xs line-through truncate">{step.title}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <input
          className="flex-1 h-8 border rounded-lg px-2.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
          placeholder={tc("addNextStep")}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addStep() }}
        />
        <Button size="sm" variant="outline" disabled={!newTitle.trim()} onClick={addStep} className="h-8 px-2.5">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Main page ──
export default function DealDetailPage() {
  const t = useTranslations("deals")
  const tc = useTranslations("common")
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId ? String(session.user.organizationId) : undefined

  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [nextSteps, setNextSteps] = useState<Array<{ id: string; title: string; status: string; dueDate: string | null; completedAt: string | null }>>([])
  const [timelineKey, setTimelineKey] = useState(0)
  const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string }>>([])
  const [validationStage, setValidationStage] = useState<string>("")

  const stageLabels: Record<string, string> = {
    LEAD: t("stageLead"),
    QUALIFIED: t("stageQualified"),
    PROPOSAL: t("stageProposal"),
    NEGOTIATION: t("stageNegotiation"),
    WON: t("stageWon"),
    LOST: t("stageLost"),
  }

  const STAGES = STAGE_STYLES.map(s => ({ ...s, label: stageLabels[s.key] || s.key }))
  const headers: Record<string, string> = orgId ? { "x-organization-id": orgId } : {}

  const fetchDeal = async () => {
    try {
      const res = await fetch(`/api/v1/deals/${id}`, { headers })
      const json = await res.json()
      if (json.success) setDeal(json.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchNextSteps = async () => {
    try {
      const res = await fetch(`/api/v1/deals/${id}/next-steps`, { headers })
      const json = await res.json()
      if (json.success) setNextSteps(json.data || [])
    } catch (err) { console.error(err) }
  }

  useEffect(() => { if (session) { fetchDeal(); fetchNextSteps() } }, [session, id])

  const saveTags = async (newTags: string[]) => {
    if (!deal) return
    try {
      await fetch(`/api/v1/deals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ tags: newTags }),
      })
      setDeal({ ...deal, tags: newTags })
    } catch (err) { console.error(err) }
  }

  const handleStageChange = async (newStage: string) => {
    if (!deal || deal.stage === newStage) return
    try {
      const res = await fetch(`/api/v1/deals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ stage: newStage }),
      })
      if (res.ok) {
        fetchDeal()
      } else if (res.status === 422) {
        const json = await res.json()
        if (json.validationErrors) {
          setValidationErrors(json.validationErrors)
          setValidationStage(newStage)
        }
      }
    } catch (err) { console.error(err) }
  }

  const handleDelete = async () => {
    const res = await fetch(`/api/v1/deals/${id}`, {
      method: "DELETE", headers,
    })
    if (res.ok) router.push("/deals")
    else throw new Error("Failed to delete")
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 bg-muted rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-96 bg-muted rounded-xl" />
          <div className="col-span-2 h-96 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">{t("dealNotFound")}</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/deals")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("backToDeals")}
        </Button>
      </div>
    )
  }

  const stageInfo = STAGES.find(s => s.key === deal.stage)

  return (
    <MotionPage className="space-y-4 pb-12">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/deals")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold tracking-tight truncate">{deal.name}</h1>
            <Badge className="text-white text-[11px]" style={{ backgroundColor: stageInfo?.color }}>
              {stageInfo?.label ?? deal.stage}
            </Badge>
          </div>
          {/* Tags inline */}
          <div className="flex items-center gap-1.5 mt-1">
            <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <TagsInput tags={deal.tags || []} onChange={saveTags} addTagLabel={t("addTag")} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> {t("editDeal")}
          </Button>
          <Button
            variant="outline" size="sm"
            className="text-red-500 hover:text-red-600 hover:border-red-300"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Stage Progress Bar (chevrons) ── */}
      <StageProgress
        stages={STAGES}
        currentStage={deal.stage}
        onStageClick={handleStageChange}
      />

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* LEFT: Data sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <DealSidebar
              deal={deal}
              orgId={orgId}
              offersCount={0}
              invoicesCount={0}
              onEdit={() => setEditOpen(true)}
              fetchDeal={fetchDeal}
            />
          </div>

          {/* Next Steps */}
          <NextStepsWidget
            dealId={id}
            orgId={orgId}
            steps={nextSteps}
            fetchSteps={fetchNextSteps}
          />
        </div>

        {/* RIGHT: Timeline feed */}
        <div className="space-y-4">
          {/* Quick Action Bar — always visible at top */}
          <QuickActionBar
            dealId={id}
            orgId={orgId}
            onActivityAdded={() => setTimelineKey(k => k + 1)}
            onTaskAdded={fetchNextSteps}
            labels={{
              placeholder: tc("whatIsNext"),
              note: tc("actTypeNote"),
              task: tc("actTypeTask"),
              email: tc("actTypeEmail"),
              send: tc("send"),
            }}
          />

          {/* Unified Timeline */}
          <div className="rounded-xl border bg-card p-4">
            <ActivityTimeline key={timelineKey} dealId={id} orgId={orgId} />
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <DealForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchDeal}
        initialData={{
          id: deal.id,
          name: deal.name,
          companyId: deal.company?.id,
          stage: deal.stage,
          valueAmount: deal.valueAmount,
          currency: deal.currency,
          probability: deal.probability,
          expectedClose: deal.expectedClose,
          notes: deal.notes,
        }}
        orgId={orgId}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t("deleteDeal")}
        itemName={deal.name}
      />
      <StageValidationDialog
        open={validationErrors.length > 0}
        onClose={() => setValidationErrors([])}
        errors={validationErrors}
        targetStage={validationStage}
        stageLabel={stageLabels[validationStage] || validationStage}
        stageColor={STAGES.find(s => s.key === validationStage)?.color || "#6366f1"}
      />
    </MotionPage>
  )
}
