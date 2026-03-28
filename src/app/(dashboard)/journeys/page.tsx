"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ColorStatCard } from "@/components/color-stat-card"
import { JourneyForm } from "@/components/journey-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import {
  Plus, Workflow, Users, CheckCircle, Target, Play, Pause, Pencil, Trash2, Eye,
  X, Mail, Clock, GitBranch, MessageSquare, Bell, FileText, UserPlus, Send,
  Loader2, Smartphone, Heart, Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageDescription } from "@/components/page-description"
import dynamic from "next/dynamic"

const JourneyFlowEditor = dynamic(() => import("@/components/journey-flow-editor").then(m => ({ default: m.JourneyFlowEditor })), { ssr: false })

interface JourneyStep {
  id: string
  stepOrder: number
  stepType: string
  config: any
  statsEntered: number
  statsCompleted: number
}

interface Journey {
  id: string
  name: string
  description?: string
  status: string
  triggerType: string
  entryCount: number
  activeCount: number
  completedCount: number
  steps?: JourneyStep[]
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  active: "bg-green-100 text-green-700 border-green-200",
  paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
}

function getStepInfo(type: string, stepTypesList: { value: string; label: string; icon: any; color: string; borderColor: string }[]) {
  return stepTypesList.find(st => st.value === type) || stepTypesList[0]
}

function getStepSummary(step: { stepType: string; config: any }): string {
  const c = step.config || {}
  switch (step.stepType) {
    case "send_email": return c.subject ? `Тема: ${c.subject}` : "Тема: (без темы)"
    case "wait": return `Ждать: ${c.days || 1} дн.`
    case "condition": {
      const scenario = conditionScenarios.find(s => s.id === c._scenario)
      if (scenario && scenario.id !== "custom") return scenario.label
      if (c.field && c.operator) {
        const fld = conditionFields.find(f => f.value === c.field)?.label || c.field
        const op = conditionOperators.find(o => o.value === c.operator)?.label || c.operator
        return c.operator === "not_empty" ? `${fld} ${op}` : `${fld} ${op} "${c.value}"`
      }
      return "Şərt"
    }
    case "create_task": return c.title || "Новая задача"
    case "send_telegram": return c.message ? c.message.slice(0, 40) : "Telegram сообщение"
    case "send_whatsapp": return c.message ? c.message.slice(0, 40) : "WhatsApp сообщение"
    case "sms": return c.message ? c.message.slice(0, 40) : "SMS сообщение"
    case "update_field": return c.field ? `${c.field} = ${c.value || "..."}` : "Обновить поле"
    default: return ""
  }
}

// Pre-built condition scenarios (intuitive for non-technical users)
const conditionScenarios = [
  { id: "lead_status_new", label: "Lid yeni olduqda", description: "Status = Yeni", icon: "🆕", field: "status", operator: "equals", value: "new" },
  { id: "lead_status_qualified", label: "Lid uyğun olduqda", description: "Status = Uyğun", icon: "✅", field: "status", operator: "equals", value: "qualified" },
  { id: "lead_status_lost", label: "Lid itirildiyi halda", description: "Status = İtirilmiş", icon: "❌", field: "status", operator: "equals", value: "lost" },
  { id: "has_email", label: "Email varsa", description: "Email boş deyil", icon: "📧", field: "email", operator: "not_empty", value: "" },
  { id: "has_phone", label: "Telefon varsa", description: "Telefon boş deyil", icon: "📱", field: "phone", operator: "not_empty", value: "" },
  { id: "has_company", label: "Şirkət göstərilibsə", description: "Şirkət adı boş deyil", icon: "🏢", field: "companyName", operator: "not_empty", value: "" },
  { id: "source_website", label: "Saytdan gəlib", description: "Mənbə = Website", icon: "🌐", field: "source", operator: "equals", value: "website" },
  { id: "source_referral", label: "Tövsiyə ilə gəlib", description: "Mənbə = Tövsiyə", icon: "🤝", field: "source", operator: "equals", value: "referral" },
  { id: "custom", label: "Öz şərtim", description: "Sahə və dəyəri əl ilə seçin", icon: "⚙️", field: "", operator: "equals", value: "" },
]
const conditionActions = [
  { value: "continue", label: "Növbəti addıma keç" },
  { value: "skip_next", label: "1 addımı keç" },
  { value: "skip_2", label: "2 addımı keç" },
  { value: "stop", label: "Zənciri dayandır" },
]
const conditionFields = [
  { value: "status", label: "Status" },
  { value: "source", label: "Mənbə" },
  { value: "companyName", label: "Şirkət" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefon" },
  { value: "contactName", label: "Ad" },
]
const conditionOperators = [
  { value: "equals", label: "Bərabərdir" },
  { value: "not_equals", label: "Bərabər deyil" },
  { value: "contains", label: "Ehtiva edir" },
  { value: "not_empty", label: "Boş deyil" },
]

export default function JourneysPage() {
  const { data: session } = useSession()
  const t = useTranslations("journeys")
  const tc = useTranslations("common")
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Journey | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [stepsJourney, setStepsJourney] = useState<Journey | null>(null)
  const [steps, setSteps] = useState<{ stepType: string; config: any }[]>([])
  const [savingSteps, setSavingSteps] = useState(false)
  const [addStepOpen, setAddStepOpen] = useState(false)
  const [flowView, setFlowView] = useState(false)
  const [newStepType, setNewStepType] = useState("send_email")
  const [newStepConfig, setNewStepConfig] = useState<any>({})
  const [enrollOpen, setEnrollOpen] = useState<Journey | null>(null)
  const [enrollLeadId, setEnrollLeadId] = useState("")
  const [enrolling, setEnrolling] = useState(false)
  const [leads, setLeads] = useState<{ id: string; contactName: string; email?: string; companyName?: string; status: string }[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadSearch, setLeadSearch] = useState("")
  const [selectedLead, setSelectedLead] = useState<{ id: string; contactName: string; email?: string; companyName?: string } | null>(null)
  const orgId = session?.user?.organizationId

  const statusLabels: Record<string, string> = {
    draft: t("statusDraft"),
    active: t("statusActive"),
    paused: t("statusPaused"),
    completed: t("statusCompleted"),
  }
  const triggerLabels: Record<string, string> = {
    lead_created: t("triggerLeadCreated"),
    contact_created: t("triggerContactCreated"),
    deal_stage_change: t("triggerDealStageChange"),
    manual: t("triggerManual"),
  }
  const stepTypes = [
    { value: "send_email", label: t("stepEmail"), icon: Mail, color: "bg-blue-500", borderColor: "border-blue-200 bg-blue-50/50 dark:bg-blue-900/10" },
    { value: "sms", label: t("stepSms"), icon: Smartphone, color: "bg-gray-700", borderColor: "border-gray-200 bg-gray-50/50 dark:bg-gray-900/10" },
    { value: "wait", label: t("stepWait"), icon: Clock, color: "bg-yellow-500", borderColor: "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10" },
    { value: "condition", label: t("chainStepCondition"), icon: GitBranch, color: "bg-pink-500", borderColor: "border-pink-200 bg-pink-50/50 dark:bg-pink-900/10" },
    { value: "create_task", label: "Tapşırıq", icon: FileText, color: "bg-teal-500", borderColor: "border-teal-200 bg-teal-50/50 dark:bg-teal-900/10" },
    { value: "send_telegram", label: "Telegram", icon: Send, color: "bg-sky-500", borderColor: "border-sky-200 bg-sky-50/50 dark:bg-sky-900/10" },
    { value: "send_whatsapp", label: "WhatsApp", icon: Heart, color: "bg-green-500", borderColor: "border-green-200 bg-green-50/50 dark:bg-green-900/10" },
    { value: "update_field", label: "Sahəni yenilə", icon: Settings, color: "bg-purple-500", borderColor: "border-purple-200 bg-purple-50/50 dark:bg-purple-900/10" },
  ]

  const fetchJourneys = async () => {
    try {
      const res = await fetch("/api/v1/journeys?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setJourneys(json.data.journeys)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchJourneys() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/journeys/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    fetchJourneys()
  }

  const toggleStatus = async (journey: Journey) => {
    const newStatus = journey.status === "active" ? "paused" : "active"
    await fetch(`/api/v1/journeys/${journey.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(orgId ? { "x-organization-id": String(orgId) } : {}),
      },
      body: JSON.stringify({ name: journey.name, status: newStatus }),
    })
    fetchJourneys()
  }

  function openSteps(journey: Journey) {
    setStepsJourney(journey)
    const existingSteps = (journey.steps || [])
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map(s => ({ stepType: s.stepType, config: s.config || {} }))
    setSteps(existingSteps)
  }

  function openAddStep() {
    setNewStepType("send_email")
    setNewStepConfig({})
    setAddStepOpen(true)
  }

  function confirmAddStep() {
    setSteps(prev => [...prev, { stepType: newStepType, config: { ...newStepConfig } }])
    setAddStepOpen(false)
  }

  function removeStep(index: number) {
    setSteps(prev => prev.filter((_, i) => i !== index))
  }

  async function saveSteps() {
    if (!stepsJourney) return
    setSavingSteps(true)
    try {
      await fetch(`/api/v1/journeys/${stepsJourney.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({
          name: stepsJourney.name,
          steps: steps.map((s, i) => ({ stepType: s.stepType, stepOrder: i + 1, config: s.config })),
        }),
      })
      setStepsJourney(null)
      fetchJourneys()
    } catch (err) { console.error(err) } finally { setSavingSteps(false) }
  }

  const fetchLeads = async () => {
    setLeadsLoading(true)
    try {
      const res = await fetch("/api/v1/leads?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setLeads(json.data.leads || [])
    } catch (err) { console.error(err) } finally { setLeadsLoading(false) }
  }

  // Load leads when enroll dialog opens
  useEffect(() => {
    if (enrollOpen && leads.length === 0) fetchLeads()
  }, [enrollOpen])

  const filteredLeads = leads.filter(l => {
    if (!leadSearch.trim()) return true
    const q = leadSearch.toLowerCase()
    return (
      l.contactName?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.companyName?.toLowerCase().includes(q)
    )
  })

  async function handleEnroll() {
    if (!enrollOpen || !selectedLead) return
    setEnrolling(true)
    try {
      await fetch("/api/v1/journeys/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ journeyId: enrollOpen.id, leadId: selectedLead.id }),
      })
      setEnrollOpen(null)
      setSelectedLead(null)
      setLeadSearch("")
      fetchJourneys()
    } catch (err) { console.error(err) } finally { setEnrolling(false) }
  }

  const totalJourneys = journeys.length
  const activeCount = journeys.filter(j => j.status === "active").length
  const totalEntries = journeys.reduce((s, j) => s + j.entryCount, 0)
  const conversionRate = totalEntries > 0
    ? Math.round(journeys.reduce((s, j) => s + j.completedCount, 0) / totalEntries * 100)
    : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-32 bg-muted rounded-lg" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" /> {t("newJourney")}
        </Button>
      </div>

      <PageDescription text={t("pageDescription")} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ColorStatCard label={t("statTotal")} value={totalJourneys} icon={<Workflow className="h-4 w-4" />} color="blue" hint={t("hintTotalJourneys")} />
        <ColorStatCard label={t("statActive")} value={activeCount} icon={<CheckCircle className="h-4 w-4" />} color="green" hint={t("hintActiveJourneys")} />
        <ColorStatCard label={t("statEntries")} value={totalEntries} icon={<Users className="h-4 w-4" />} color="violet" hint={t("hintTotalEntries")} />
        <ColorStatCard label={t("statCompleted")} value={`${conversionRate}%`} icon={<Target className="h-4 w-4" />} color="teal" hint={t("hintCompletionRate")} />
      </div>

      {/* Journey cards */}
      <div className="space-y-3">
        {journeys.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/20 py-16 text-center">
            <Workflow className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t("noJourneys")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("noJourneysHint")}</p>
            <Button className="mt-4 gap-1.5" onClick={() => { setEditData(undefined); setShowForm(true) }}>
              <Plus className="h-4 w-4" /> {t("newJourney")}
            </Button>
          </div>
        ) : journeys.map(journey => (
          <div key={journey.id} className="border rounded-lg bg-card hover:shadow-md transition-shadow">
            <div className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium border", statusColors[journey.status])}>
                    {statusLabels[journey.status] || journey.status}
                  </span>
                  <h3 className="font-semibold truncate">{journey.name}</h3>
                </div>
                {journey.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{journey.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-orange-500" /> {triggerLabels[journey.triggerType] || journey.triggerType}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserPlus className="h-3 w-3" /> Вошли: {journey.entryCount}
                  </span>
                  <span>Активных: {journey.activeCount}</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Завершили: {journey.completedCount}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => openSteps(journey)}>
                  <Eye className="h-3 w-3" /> Шаги
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => { setEditData(journey); setShowForm(true) }}>
                  <Pencil className="h-3 w-3" /> Редактировать
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => { setEnrollOpen(journey); setSelectedLead(null); setLeadSearch("") }}>
                  <UserPlus className="h-3 w-3" /> Записать лида
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("gap-1 text-xs h-8", journey.status === "active" ? "text-yellow-600" : "text-green-600")}
                  onClick={() => toggleStatus(journey)}
                >
                  {journey.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {journey.status === "active" ? "Пауза" : "Запустить"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                  onClick={() => { setDeleteId(journey.id); setDeleteName(journey.name) }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== STEPS MODAL ===== */}
      {stepsJourney && (
        <Dialog open={!!stepsJourney} onOpenChange={open => { if (!open) setStepsJourney(null) }}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{stepsJourney.name}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Статус: {statusLabels[stepsJourney.status]} · Триггер: {triggerLabels[stepsJourney.triggerType]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={flowView ? "default" : "outline"}
                  className="gap-1 text-xs h-7"
                  onClick={() => setFlowView(!flowView)}
                >
                  <Workflow className="h-3 w-3" /> {flowView ? "List View" : "Visual Builder"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs h-7"
                  onClick={() => { setEnrollOpen(stepsJourney); setSelectedLead(null); setLeadSearch("") }}
                >
                  <UserPlus className="h-3 w-3" /> Записать лида
                </Button>
                <button onClick={() => setStepsJourney(null)} className="p-1 rounded hover:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </DialogHeader>
          <DialogContent className="max-h-[65vh] overflow-y-auto">
            {/* Visual Flow Builder */}
            {flowView && (
              <JourneyFlowEditor
                steps={stepsJourney?.steps?.map(s => ({ id: s.id, stepOrder: s.stepOrder, stepType: s.stepType, config: s.config })) || []}
                onSave={async (newSteps) => {
                  await fetch(`/api/v1/journeys/${stepsJourney!.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: stepsJourney!.name,
                      steps: newSteps,
                    }),
                  })
                  setStepsJourney(null)
                  setFlowView(false)
                  fetchJourneys()
                }}
              />
            )}
            {/* Linear Steps View */}
            {!flowView && <>
            {/* Trigger node */}
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-purple-500 text-white shrink-0">
                <Target className="h-4 w-4" />
              </div>
              <div className="flex-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg px-4 py-3">
                <span className="font-semibold text-sm text-purple-800 dark:text-purple-200">
                  Триггер: {triggerLabels[stepsJourney.triggerType]}
                </span>
              </div>
            </div>

            {/* Steps flow */}
            {steps.map((step, index) => {
              const info = getStepInfo(step.stepType, stepTypes)
              const Icon = info.icon
              const summary = getStepSummary(step)
              return (
                <div key={index}>
                  {/* Connector line */}
                  <div className="ml-[17px] h-5 w-0.5 bg-primary/20" />
                  {/* Step node */}
                  <div className="flex items-start gap-3">
                    <div className={cn("flex items-center justify-center w-9 h-9 rounded-full text-white shrink-0 mt-1", info.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className={cn("flex-1 border rounded-lg px-4 py-3", info.borderColor)}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{index + 1}. {info.label}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setNewStepType(step.stepType)
                              setNewStepConfig({ ...step.config })
                              // Replace: remove old, open edit
                              removeStep(index)
                              setAddStepOpen(true)
                            }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                            title="Редактировать"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => removeStep(index)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {summary && <p className="text-xs text-muted-foreground">{summary}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Вошли: {(step as any).statsEntered || 0} · Прошли: {(step as any).statsCompleted || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add step */}
            <div>
              <div className="ml-[17px] h-5 w-0.5 bg-primary/10" />
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                <button
                  onClick={openAddStep}
                  className="flex-1 border-2 border-dashed rounded-lg px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors text-center"
                >
                  + Добавить шаг
                </button>
              </div>
            </div>
          </>}
          </DialogContent>
          <DialogFooter>
            {!flowView && <>
              <Button variant="outline" onClick={() => setStepsJourney(null)}>Закрыть</Button>
              <Button onClick={saveSteps} disabled={savingSteps} className="gap-1.5">
                {savingSteps ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingSteps ? "Сохранение..." : "Сохранить шаги"}
              </Button>
            </>}
          </DialogFooter>
        </Dialog>
      )}

      {/* ===== ADD STEP DIALOG ===== */}
      <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
        <DialogHeader>
          <DialogTitle>Добавить шаг #{steps.length + 1}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {/* Step type grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {stepTypes.map(st => {
              const Icon = st.icon
              const selected = newStepType === st.value
              return (
                <button
                  key={st.value}
                  onClick={() => { setNewStepType(st.value); setNewStepConfig({}) }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-medium transition-all",
                    selected
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-transparent bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {st.label}
                </button>
              )
            })}
          </div>

          {/* Step config per type */}
          <div className="space-y-3">
            {newStepType === "send_email" && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Тема письма</Label>
                  <Input
                    value={newStepConfig.subject || ""}
                    onChange={e => setNewStepConfig((c: any) => ({ ...c, subject: e.target.value }))}
                    placeholder="Добро пожаловать в LeadDrive CRM!"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Текст письма · Переменные: {"{{contact_name}}"}, {"{{company_name}}"}
                  </Label>
                  <Textarea
                    value={newStepConfig.body || ""}
                    onChange={e => setNewStepConfig((c: any) => ({ ...c, body: e.target.value }))}
                    placeholder={"Здравствуйте, {{contact_name}}! Мы рады приветствовать вас..."}
                    rows={4}
                  />
                </div>
              </>
            )}

            {newStepType === "sms" && (
              <div>
                <Label className="text-xs text-muted-foreground">Текст SMS</Label>
                <Textarea
                  value={newStepConfig.message || ""}
                  onChange={e => setNewStepConfig((c: any) => ({ ...c, message: e.target.value }))}
                  placeholder="Здравствуйте! Ваша заявка получена..."
                  rows={3}
                />
              </div>
            )}

            {newStepType === "wait" && (
              <div>
                <Label className="text-xs text-muted-foreground">Длительность ожидания</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={newStepConfig.days || 1}
                    onChange={e => setNewStepConfig((c: any) => ({ ...c, days: parseInt(e.target.value) || 1 }))}
                    className="w-24"
                  />
                  <Select
                    value={newStepConfig.unit || "days"}
                    onChange={e => setNewStepConfig((c: any) => ({ ...c, unit: e.target.value }))}
                    className="flex-1"
                  >
                    <option value="hours">Часов</option>
                    <option value="days">Дней</option>
                    <option value="weeks">Недель</option>
                  </Select>
                </div>
              </div>
            )}

            {newStepType === "condition" && (
              <div className="space-y-4">
                {/* Scenario cards */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Şərti seçin</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {conditionScenarios.map(sc => {
                      const isSelected = newStepConfig._scenario === sc.id
                      return (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => setNewStepConfig({
                            _scenario: sc.id,
                            field: sc.field,
                            operator: sc.operator,
                            value: sc.value,
                            onFalse: newStepConfig.onFalse || "continue",
                          })}
                          className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs transition-all text-center",
                            isSelected
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "border-transparent bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted/60"
                          )}
                        >
                          <span className="text-lg">{sc.icon}</span>
                          <span className="font-medium leading-tight">{sc.label}</span>
                          <span className="text-[10px] opacity-60">{sc.description}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom fields (only show when "custom" scenario selected) */}
                {newStepConfig._scenario === "custom" && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Sahə</Label>
                        <Select
                          value={newStepConfig.field || "status"}
                          onChange={e => setNewStepConfig((c: any) => ({ ...c, field: e.target.value }))}
                        >
                          {conditionFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Operator</Label>
                        <Select
                          value={newStepConfig.operator || "equals"}
                          onChange={e => setNewStepConfig((c: any) => ({ ...c, operator: e.target.value }))}
                        >
                          {conditionOperators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                      </div>
                    </div>
                    {newStepConfig.operator !== "not_empty" && (
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Dəyər</Label>
                        <Input
                          value={newStepConfig.value || ""}
                          onChange={e => setNewStepConfig((c: any) => ({ ...c, value: e.target.value }))}
                          placeholder="new, qualified, website..."
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* What to do if condition is FALSE */}
                <div className="p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-200/50 dark:border-red-800/30">
                  <Label className="text-xs font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5 mb-2">
                    <X className="h-3.5 w-3.5" /> Şərt uyğun gəlmirsə:
                  </Label>
                  <Select
                    value={newStepConfig.onFalse || "continue"}
                    onChange={e => setNewStepConfig((c: any) => ({ ...c, onFalse: e.target.value }))}
                  >
                    {conditionActions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </Select>
                </div>
              </div>
            )}

            {newStepType === "create_task" && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Название задачи</Label>
                  <Input
                    value={newStepConfig.title || ""}
                    onChange={e => setNewStepConfig((c: any) => ({ ...c, title: e.target.value }))}
                    placeholder="Позвонить клиенту"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Описание</Label>
                  <Textarea
                    value={newStepConfig.description || ""}
                    onChange={e => setNewStepConfig((c: any) => ({ ...c, description: e.target.value }))}
                    placeholder="Подробности задачи..."
                    rows={2}
                  />
                </div>
              </>
            )}

            {newStepType === "send_telegram" && (
              <div>
                <Label className="text-xs text-muted-foreground">Сообщение Telegram</Label>
                <Textarea
                  value={newStepConfig.message || ""}
                  onChange={e => setNewStepConfig((c: any) => ({ ...c, message: e.target.value }))}
                  placeholder={"Здравствуйте, {{contact_name}}!"}
                  rows={3}
                />
              </div>
            )}

            {newStepType === "send_whatsapp" && (
              <div>
                <Label className="text-xs text-muted-foreground">Сообщение WhatsApp</Label>
                <Textarea
                  value={newStepConfig.message || ""}
                  onChange={e => setNewStepConfig((c: any) => ({ ...c, message: e.target.value }))}
                  placeholder={"Здравствуйте, {{contact_name}}!"}
                  rows={3}
                />
              </div>
            )}

            {newStepType === "update_field" && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Поле</Label>
                  <Select
                    value={newStepConfig.field || "lead_status"}
                    onChange={e => setNewStepConfig((c: any) => ({ ...c, field: e.target.value }))}
                  >
                    {conditionFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Новое значение</Label>
                  <Input
                    value={newStepConfig.value || ""}
                    onChange={e => setNewStepConfig((c: any) => ({ ...c, value: e.target.value }))}
                    placeholder="qualified"
                  />
                </div>
              </>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddStepOpen(false)}>Отмена</Button>
          <Button onClick={confirmAddStep}>Добавить</Button>
        </DialogFooter>
      </Dialog>

      {/* ===== ENROLL LEAD DIALOG ===== */}
      <Dialog open={!!enrollOpen} onOpenChange={open => { if (!open) { setEnrollOpen(null); setSelectedLead(null); setLeadSearch("") } }}>
        <DialogHeader>
          <DialogTitle>Записать лида в цепочку</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-muted-foreground mb-3">
            Цепочка: <strong>{enrollOpen?.name}</strong>
          </p>

          {/* Selected lead chip */}
          {selectedLead && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-3">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedLead.contactName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[selectedLead.email, selectedLead.companyName].filter(Boolean).join(" · ") || "Без email"}
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-800 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Search input */}
          {!selectedLead && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Поиск по имени, email или компании</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={leadSearch}
                  onChange={e => setLeadSearch(e.target.value)}
                  placeholder="Начните вводить имя лида..."
                  className="pl-9"
                  autoFocus
                />
              </div>

              {/* Leads list */}
              <div className="border rounded-lg max-h-[240px] overflow-y-auto">
                {leadsLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Загрузка лидов...
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {leadSearch ? "Ничего не найдено" : "Нет доступных лидов"}
                  </div>
                ) : (
                  filteredLeads.map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0 text-xs font-semibold">
                        {lead.contactName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lead.contactName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[lead.email, lead.companyName].filter(Boolean).join(" · ") || "Без данных"}
                        </p>
                      </div>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                        lead.status === "new" ? "bg-blue-100 text-blue-700" :
                        lead.status === "qualified" ? "bg-green-100 text-green-700" :
                        lead.status === "contacted" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {lead.status === "new" ? "Новый" :
                         lead.status === "qualified" ? "Квалифицирован" :
                         lead.status === "contacted" ? "Связались" :
                         lead.status === "converted" ? "Конвертирован" :
                         lead.status === "lost" ? "Потерян" : lead.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {filteredLeads.length} из {leads.length} лидов
              </p>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEnrollOpen(null); setSelectedLead(null); setLeadSearch("") }}>Отмена</Button>
          <Button onClick={handleEnroll} disabled={enrolling || !selectedLead} className="gap-1.5">
            {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Записать
          </Button>
        </DialogFooter>
      </Dialog>

      <JourneyForm
        open={showForm}
        onOpenChange={open => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchJourneys}
        initialData={editData}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={t("deleteJourney")}
        itemName={deleteName}
      />
    </div>
  )
}
