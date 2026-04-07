"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MotionPage, MotionItem } from "@/components/ui/motion"
import {
  Settings2, Plus, Trash2, Shield, ChevronRight, X, Loader2, CheckCircle2,
} from "lucide-react"

interface PipelineStage {
  id: string
  name: string
  displayName: string
  color: string
  probability: number
  sortOrder: number
  isWon: boolean
  isLost: boolean
}

interface ValidationRule {
  id: string
  fieldName: string
  ruleType: string
  ruleValue: string | null
  errorMessage: string
  isActive: boolean
}

const FIELD_KEYS = [
  { value: "valueAmount", key: "fieldDealValue" },
  { value: "contactId", key: "fieldContactPerson" },
  { value: "notes", key: "fieldNotes" },
  { value: "expectedClose", key: "fieldExpectedClose" },
  { value: "assignedTo", key: "fieldAssignedTo" },
  { value: "companyId", key: "fieldCompany" },
]

const RULE_TYPE_KEYS = [
  { value: "required", key: "ruleRequired" },
  { value: "min_value", key: "ruleMinValue" },
  { value: "task_completed", key: "ruleTaskCompleted" },
]

interface Pipeline {
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  _count?: { deals: number }
  stages: PipelineStage[]
}

export default function PipelinesSettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("pipelineSettings")
  const tc = useTranslations("common")
  const orgId = session?.user?.organizationId ? String(session.user.organizationId) : undefined

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("")
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [rules, setRules] = useState<Record<string, ValidationRule[]>>({})
  const [rulesLoading, setRulesLoading] = useState<string | null>(null)
  const [newPipelineName, setNewPipelineName] = useState("")
  const [creatingPipeline, setCreatingPipeline] = useState(false)

  // Add rule form
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [newField, setNewField] = useState("valueAmount")
  const [newRuleType, setNewRuleType] = useState("required")
  const [newRuleValue, setNewRuleValue] = useState("")
  const [newErrorMsg, setNewErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)

  const headers: Record<string, string> = orgId ? { "x-organization-id": orgId } : {} as Record<string, string>

  const fetchPipelines = async () => {
    try {
      const res = await fetch("/api/v1/pipelines", { headers })
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        setPipelines(json.data)
        const def = json.data.find((p: any) => p.isDefault) || json.data[0]
        setSelectedPipelineId(def.id)
        setStages(def.stages || [])
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const selectPipeline = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId)
    const p = pipelines.find(p => p.id === pipelineId)
    if (p) setStages(p.stages || [])
    setExpandedStage(null)
  }

  const createPipeline = async () => {
    if (!newPipelineName.trim()) return
    setCreatingPipeline(true)
    try {
      const res = await fetch("/api/v1/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          name: newPipelineName.trim(),
          stages: [
            { name: "LEAD", displayName: "Lead", color: "#6366f1", probability: 10, sortOrder: 1 },
            { name: "QUALIFIED", displayName: "Qualified", color: "#3b82f6", probability: 25, sortOrder: 2 },
            { name: "PROPOSAL", displayName: "Proposal", color: "#f59e0b", probability: 50, sortOrder: 3 },
            { name: "NEGOTIATION", displayName: "Negotiation", color: "#f97316", probability: 75, sortOrder: 4 },
            { name: "WON", displayName: "Won", color: "#22c55e", probability: 100, sortOrder: 5, isWon: true },
            { name: "LOST", displayName: "Lost", color: "#ef4444", probability: 0, sortOrder: 6, isLost: true },
          ],
        }),
      })
      const json = await res.json()
      if (json.success) {
        setNewPipelineName("")
        fetchPipelines()
      }
    } catch {} finally { setCreatingPipeline(false) }
  }

  const deletePipeline = async (pipelineId: string) => {
    if (!confirm(t("deleteConfirm"))) return
    try {
      const res = await fetch(`/api/v1/pipelines/${pipelineId}`, {
        method: "DELETE",
        headers,
      })
      const json = await res.json()
      if (!json.success) { alert(json.error); return }
      fetchPipelines()
    } catch {}
  }

  const setDefault = async (pipelineId: string) => {
    try {
      await fetch(`/api/v1/pipelines/${pipelineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ isDefault: true }),
      })
      fetchPipelines()
    } catch {}
  }

  const fetchStages = async () => {
    // Deprecated — use fetchPipelines instead
    fetchPipelines()
  }

  const fetchRules = async (stageId: string) => {
    setRulesLoading(stageId)
    try {
      const res = await fetch(`/api/v1/pipeline-stages/${stageId}/rules`, { headers })
      const json = await res.json()
      if (json.success) setRules(prev => ({ ...prev, [stageId]: json.data }))
    } catch (err) { console.error(err) }
    finally { setRulesLoading(null) }
  }

  useEffect(() => { if (session) fetchPipelines() }, [session])

  const toggleStage = (stageId: string) => {
    if (expandedStage === stageId) {
      setExpandedStage(null)
    } else {
      setExpandedStage(stageId)
      if (!rules[stageId]) fetchRules(stageId)
    }
    setAddingFor(null)
  }

  const addRule = async (stageId: string) => {
    if (!newErrorMsg.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/v1/pipeline-stages/${stageId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          fieldName: newField,
          ruleType: newRuleType,
          ruleValue: newRuleType === "min_value" ? newRuleValue : null,
          errorMessage: newErrorMsg.trim(),
        }),
      })
      fetchRules(stageId)
      setAddingFor(null)
      setNewField("valueAmount")
      setNewRuleType("required")
      setNewRuleValue("")
      setNewErrorMsg("")
    } finally { setSaving(false) }
  }

  const deleteRule = async (stageId: string, ruleId: string) => {
    await fetch(`/api/v1/pipeline-stages/${stageId}/rules`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ ruleId }),
    })
    fetchRules(stageId)
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted rounded-xl" />)}
      </div>
    )
  }

  return (
    <MotionPage className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Pipeline tabs */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {pipelines.map(p => (
            <button
              key={p.id}
              onClick={() => selectPipeline(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                selectedPipelineId === p.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 hover:bg-muted border-transparent"
              }`}
            >
              {p.name}
              {p.isDefault && <span className="text-[10px] opacity-70">★</span>}
              <span className="text-[10px] opacity-60">({p._count?.deals || 0})</span>
            </button>
          ))}
        </div>

        {/* Pipeline actions */}
        {selectedPipelineId && (() => {
          const p = pipelines.find(p => p.id === selectedPipelineId)
          if (!p) return null
          return (
            <div className="flex items-center gap-2 text-xs">
              {!p.isDefault && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDefault(p.id)}>
                  {t("setDefault")}
                </Button>
              )}
              {!p.isDefault && (p._count?.deals || 0) === 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={() => deletePipeline(p.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> {tc("delete")}
                </Button>
              )}
            </div>
          )
        })()}

        {/* Create new pipeline */}
        <div className="flex items-center gap-2">
          <input
            value={newPipelineName}
            onChange={e => setNewPipelineName(e.target.value)}
            placeholder={t("newPipelinePlaceholder")}
            className="h-8 rounded-lg border bg-background px-3 text-xs w-48"
            onKeyDown={e => e.key === "Enter" && createPipeline()}
          />
          <Button size="sm" className="h-8 text-xs" onClick={createPipeline} disabled={creatingPipeline || !newPipelineName.trim()}>
            {creatingPipeline ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
            {t("addPipeline")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {stages.map((stage, idx) => {
          const isExpanded = expandedStage === stage.id
          const stageRules = rules[stage.id] || []
          const isLoadingRules = rulesLoading === stage.id

          return (
            <MotionItem key={stage.id}>
              <div className="rounded-xl border bg-card overflow-hidden">
                {/* Stage header */}
                <button
                  onClick={() => toggleStage(stage.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold">{stage.displayName}</span>
                    <span className="text-xs text-muted-foreground ml-2">({stage.name})</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{stage.probability}%</Badge>
                  {stageRules.length > 0 && (
                    <Badge className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                      <Shield className="h-3 w-3 mr-0.5" /> {stageRules.length} {t("rules")}
                    </Badge>
                  )}
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                </button>

                {/* Expanded: rules list */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t px-4 py-3 space-y-2">
                        {isLoadingRules ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : stageRules.length === 0 && addingFor !== stage.id ? (
                          <div className="text-center py-4">
                            <p className="text-xs text-muted-foreground">{t("noRules")}</p>
                          </div>
                        ) : (
                          stageRules.map(rule => (
                            <div key={rule.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border">
                              <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{rule.errorMessage}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {rule.fieldName} · {rule.ruleType}{rule.ruleValue ? ` ≥ ${rule.ruleValue}` : ""}
                                </p>
                              </div>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                onClick={() => deleteRule(stage.id, rule.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))
                        )}

                        {/* Add rule form */}
                        {addingFor === stage.id ? (
                          <div className="p-3 rounded-lg border bg-background space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">{t("field")}</label>
                                <select
                                  value={newField} onChange={e => setNewField(e.target.value)}
                                  className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
                                >
                                  {FIELD_KEYS.map(f => <option key={f.value} value={f.value}>{t(f.key)}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">{t("ruleType")}</label>
                                <select
                                  value={newRuleType} onChange={e => setNewRuleType(e.target.value)}
                                  className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
                                >
                                  {RULE_TYPE_KEYS.map(r => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
                                </select>
                              </div>
                            </div>
                            {newRuleType === "min_value" && (
                              <div>
                                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">{t("ruleMinValue")}</label>
                                <input
                                  type="number" min="0" value={newRuleValue}
                                  onChange={e => setNewRuleValue(e.target.value)}
                                  className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
                                  placeholder="e.g. 1000"
                                />
                              </div>
                            )}
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">{t("errorMessage")}</label>
                              <input
                                value={newErrorMsg} onChange={e => setNewErrorMsg(e.target.value)}
                                className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
                                placeholder={t("errorMessagePlaceholder")}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => addRule(stage.id)} disabled={!newErrorMsg.trim() || saving} className="gap-1">
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                {t("addRule")}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setAddingFor(null)}>{tc("cancel")}</Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setAddingFor(stage.id)} className="gap-1 w-full">
                            <Plus className="h-3.5 w-3.5" /> {t("addValidationRule")}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </MotionItem>
          )
        })}
      </div>
    </MotionPage>
  )
}
