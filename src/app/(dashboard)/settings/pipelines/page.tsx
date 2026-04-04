"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
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

const FIELD_OPTIONS = [
  { value: "valueAmount", label: "Deal value (valueAmount)" },
  { value: "contactId", label: "Contact person (contactId)" },
  { value: "notes", label: "Notes" },
  { value: "expectedClose", label: "Expected close date" },
  { value: "assignedTo", label: "Assigned to" },
  { value: "companyId", label: "Company" },
]

const RULE_TYPE_OPTIONS = [
  { value: "required", label: "Required (must be filled)" },
  { value: "min_value", label: "Minimum value" },
  { value: "task_completed", label: "At least 1 task completed" },
]

export default function PipelinesSettingsPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId ? String(session.user.organizationId) : undefined

  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [rules, setRules] = useState<Record<string, ValidationRule[]>>({})
  const [rulesLoading, setRulesLoading] = useState<string | null>(null)

  // Add rule form
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [newField, setNewField] = useState("valueAmount")
  const [newRuleType, setNewRuleType] = useState("required")
  const [newRuleValue, setNewRuleValue] = useState("")
  const [newErrorMsg, setNewErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)

  const headers: Record<string, string> = orgId ? { "x-organization-id": orgId } : {}

  const fetchStages = async () => {
    try {
      const res = await fetch("/api/v1/pipeline-stages", { headers })
      const json = await res.json()
      if (json.success) setStages(json.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
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

  useEffect(() => { if (session) fetchStages() }, [session])

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
          Pipeline Stages & Validation Rules
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure transition rules for each stage. Deals cannot move to a stage unless all rules pass.
        </p>
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
                      <Shield className="h-3 w-3 mr-0.5" /> {stageRules.length} rules
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
                            <p className="text-xs text-muted-foreground">No validation rules. Deals can transition freely.</p>
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
                                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Field</label>
                                <select
                                  value={newField} onChange={e => setNewField(e.target.value)}
                                  className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
                                >
                                  {FIELD_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Rule type</label>
                                <select
                                  value={newRuleType} onChange={e => setNewRuleType(e.target.value)}
                                  className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
                                >
                                  {RULE_TYPE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                              </div>
                            </div>
                            {newRuleType === "min_value" && (
                              <div>
                                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Minimum value</label>
                                <input
                                  type="number" min="0" value={newRuleValue}
                                  onChange={e => setNewRuleValue(e.target.value)}
                                  className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
                                  placeholder="e.g. 1000"
                                />
                              </div>
                            )}
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Error message (shown to user)</label>
                              <input
                                value={newErrorMsg} onChange={e => setNewErrorMsg(e.target.value)}
                                className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
                                placeholder="e.g. Upload contract before moving to Payment"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => addRule(stage.id)} disabled={!newErrorMsg.trim() || saving} className="gap-1">
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                Add rule
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setAddingFor(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setAddingFor(stage.id)} className="gap-1 w-full">
                            <Plus className="h-3.5 w-3.5" /> Add validation rule
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
