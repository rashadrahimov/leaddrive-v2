"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { StatCard } from "@/components/stat-card"
import { JourneyForm } from "@/components/journey-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Plus, Workflow, Users, CheckCircle, Target, Play, Pause, Pencil, Trash2, Eye, X, Mail, Clock, GitBranch, MessageSquare, Bell, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface JourneyStep {
  id: string
  stepOrder: number
  stepType: string
  config: any
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

const statusLabels: Record<string, string> = {
  draft: "Черновик", active: "Активный", paused: "Приостановлен", completed: "Завершён",
}
const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700", completed: "bg-blue-100 text-blue-700",
}
const triggerLabels: Record<string, string> = {
  lead_created: "Новый лид", contact_created: "Новый контакт",
  deal_stage_change: "Смена стадии сделки", manual: "Вручную",
}

const stepTypes = [
  { value: "email", label: "Email", icon: Mail, color: "bg-blue-500" },
  { value: "wait", label: "Ожидание", icon: Clock, color: "bg-yellow-500" },
  { value: "condition", label: "Условие", icon: GitBranch, color: "bg-red-500" },
  { value: "sms", label: "SMS", icon: MessageSquare, color: "bg-purple-500" },
  { value: "task", label: "Задача", icon: FileText, color: "bg-teal-500" },
  { value: "notification", label: "Уведомление", icon: Bell, color: "bg-orange-500" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "bg-green-500" },
  { value: "update_field", label: "Обн. поле", icon: Pencil, color: "bg-pink-500" },
]

export default function JourneysPage() {
  const { data: session } = useSession()
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Journey | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [stepsJourney, setStepsJourney] = useState<Journey | null>(null)
  const [steps, setSteps] = useState<{ stepType: string; config: any }[]>([])
  const [savingSteps, setSavingSteps] = useState(false)
  const orgId = session?.user?.organizationId

  const fetchJourneys = async () => {
    try {
      const res = await fetch("/api/v1/journeys?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setJourneys(json.data.journeys)
    } catch {} finally { setLoading(false) }
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

  function openSteps(journey: Journey) {
    setStepsJourney(journey)
    const existingSteps = (journey.steps || [])
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map(s => ({ stepType: s.stepType, config: s.config || {} }))
    setSteps(existingSteps.length > 0 ? existingSteps : [])
  }

  function addStep() {
    setSteps(prev => [...prev, { stepType: "email", config: {} }])
  }

  function removeStep(index: number) {
    setSteps(prev => prev.filter((_, i) => i !== index))
  }

  function updateStepType(index: number, type: string) {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, stepType: type } : s))
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
    } catch {} finally { setSavingSteps(false) }
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
        <h1 className="text-2xl font-bold tracking-tight">Цепочки лидов</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <Workflow className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Цепочки лидов</h1>
            <p className="text-sm text-muted-foreground">Автоматизируйте коммуникацию с клиентами в автоматическом потоке</p>
          </div>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> Создать путь
        </Button>
      </div>

      {/* Stats — like v1 */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Путей" value={totalJourneys} icon={<Workflow className="h-4 w-4" />} />
        <StatCard title="Активных" value={activeCount} />
        <StatCard title="Участников" value={totalEntries} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Конверсия" value={`${conversionRate}%`} icon={<Target className="h-4 w-4" />} />
      </div>

      {/* Journey cards — like v1 */}
      <div className="space-y-3">
        {journeys.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Нет цепочек. Создайте первую!
          </div>
        ) : journeys.map(journey => (
          <div key={journey.id} className="border rounded-lg p-4 bg-card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[journey.status])}>
                    {statusLabels[journey.status] || journey.status}
                  </span>
                  <h3 className="font-semibold">{journey.name}</h3>
                </div>
                {journey.description && (
                  <p className="text-sm text-muted-foreground mt-1">{journey.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" /> {triggerLabels[journey.triggerType] || journey.triggerType}
                  </span>
                  <span>Вошли: {journey.entryCount}</span>
                  <span>Активных: {journey.activeCount}</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Завершили: {journey.completedCount}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openSteps(journey)}>
                  <Eye className="h-3 w-3" /> Шаги
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setEditData(journey); setShowForm(true) }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => { setDeleteId(journey.id); setDeleteName(journey.name) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Steps modal */}
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
              <button onClick={() => setStepsJourney(null)} className="p-1 rounded hover:bg-muted">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </DialogHeader>
          <DialogContent className="max-h-[65vh] overflow-y-auto">
            {/* Trigger */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500 text-white shrink-0">
                <Target className="h-4 w-4" />
              </div>
              <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-4 py-2.5">
                <span className="font-medium text-sm">Триггер: {triggerLabels[stepsJourney.triggerType]}</span>
              </div>
            </div>

            {/* Steps */}
            {steps.map((step, index) => {
              const stepInfo = stepTypes.find(st => st.value === step.stepType) || stepTypes[0]
              const Icon = stepInfo.icon
              return (
                <div key={index} className="relative">
                  {/* Connector line */}
                  <div className="absolute left-4 -top-1 w-0.5 h-4 bg-primary/30" />
                  <div className="flex items-center gap-3 my-1">
                    <div className={cn("flex items-center justify-center w-8 h-8 rounded-full text-white shrink-0", stepInfo.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 border rounded-lg px-4 py-2.5 bg-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{index + 1}. {stepInfo.label}</span>
                          <Select
                            value={step.stepType}
                            onChange={e => updateStepType(index, e.target.value)}
                            className="h-7 text-xs w-32"
                          >
                            {stepTypes.map(st => (
                              <option key={st.value} value={st.value}>{st.label}</option>
                            ))}
                          </Select>
                        </div>
                        <button onClick={() => removeStep(index)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Вошли: 0 · Прошли: 0
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add step button */}
            <div className="relative">
              {steps.length > 0 && <div className="absolute left-4 -top-1 w-0.5 h-4 bg-primary/30" />}
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                <button
                  onClick={addStep}
                  className="flex-1 border-2 border-dashed rounded-lg px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors text-center"
                >
                  + Добавить шаг
                </button>
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepsJourney(null)}>Закрыть</Button>
            <Button onClick={saveSteps} disabled={savingSteps}>
              {savingSteps ? "Сохранение..." : "Сохранить шаги"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}

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
        title="Удалить цепочку"
        itemName={deleteName}
      />
    </div>
  )
}
