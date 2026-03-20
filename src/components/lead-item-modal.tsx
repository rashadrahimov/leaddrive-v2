"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  X, Pencil, Mail, Phone, Building2, Sparkles, Brain,
  ArrowRight, Plus, Copy, Send, RefreshCw, CheckCircle, Trash2, Ban, Save, XCircle,
  Globe, DollarSign, Calendar, Clock, Tag, User,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LeadItem {
  id: string
  contactName: string
  companyName: string | null
  email: string | null
  phone: string | null
  source: string | null
  status: string
  priority: string
  score: number
  scoreDetails: any
  estimatedValue: number | null
  notes: string | null
  lastScoredAt: string | null
  createdAt: string
}

interface LeadItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: LeadItem | null
  orgId?: string
  onSaved?: () => void
  onConvert?: (lead: LeadItem) => void
}

const statusLabels: Record<string, string> = {
  new: "Новый", contacted: "Связались", qualified: "Квалифицирован",
  converted: "Конвертирован", lost: "Потерян",
}

const statusColors: Record<string, string> = {
  new: "bg-blue-500", contacted: "bg-yellow-500", qualified: "bg-purple-500",
  converted: "bg-green-500", lost: "bg-red-500",
}

const priorityLabels: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий",
}

const sourceLabels: Record<string, string> = {
  website: "Сайт", referral: "Реферал", cold_call: "Холодный звонок",
  linkedin: "LinkedIn", email: "Email",
}

const sourceOptions = ["website", "referral", "cold_call", "linkedin", "email"]

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 80) return { letter: "A", color: "bg-green-500 text-white" }
  if (score >= 60) return { letter: "B", color: "bg-blue-500 text-white" }
  if (score >= 40) return { letter: "C", color: "bg-yellow-500 text-white" }
  if (score >= 20) return { letter: "D", color: "bg-orange-500 text-white" }
  return { letter: "F", color: "bg-red-500 text-white" }
}

export function LeadItemModal({ open, onOpenChange, lead, orgId, onSaved, onConvert }: LeadItemModalProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [saving, setSaving] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [currentLead, setCurrentLead] = useState<LeadItem | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Edit mode state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    contactName: "", companyName: "", email: "", phone: "",
    source: "", estimatedValue: "", notes: "",
  })

  // Activity state
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityType, setActivityType] = useState("note")
  const [activitySubject, setActivitySubject] = useState("")
  const [activityDesc, setActivityDesc] = useState("")
  const [activitySaving, setActivitySaving] = useState(false)
  const [activities, setActivities] = useState<any[]>([])

  // Sentiment state
  const [sentiment, setSentiment] = useState<any>(null)

  // Tasks state
  const [aiTasks, setAiTasks] = useState<any>(null)

  // AI Text state
  const [textType, setTextType] = useState("Email")
  const [tone, setTone] = useState("Профессиональный")
  const [instructions, setInstructions] = useState("")
  const [generatedText, setGeneratedText] = useState<any>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    if (open && lead) {
      setActiveTab("details")
      setEditing(false)
      setCurrentLead(lead)
      setSentiment(null)
      setAiTasks(null)
      setGeneratedText(null)
      setInstructions("")
      setEmailSent(false)
      setActivities([])
      setShowActivityForm(false)
    }
  }, [open, lead])

  if (!lead || !currentLead) return null

  const startEditing = () => {
    setEditForm({
      contactName: currentLead.contactName || "",
      companyName: currentLead.companyName || "",
      email: currentLead.email || "",
      phone: currentLead.phone || "",
      source: currentLead.source || "",
      estimatedValue: currentLead.estimatedValue ? String(currentLead.estimatedValue) : "",
      notes: currentLead.notes || "",
    })
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const reloadLead = async () => {
    try {
      const res = await fetch(`/api/v1/leads/${lead.id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success && json.data) {
        setCurrentLead(json.data)
      }
    } catch {}
  }

  const updateField = async (fields: Record<string, any>) => {
    setSaving(true)
    try {
      await fetch(`/api/v1/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
        body: JSON.stringify(fields),
      })
      await reloadLead()
      onSaved?.()
    } catch {} finally { setSaving(false) }
  }

  const saveEditForm = async () => {
    const data: Record<string, any> = {
      contactName: editForm.contactName,
      companyName: editForm.companyName || null,
      email: editForm.email || null,
      phone: editForm.phone || null,
      source: editForm.source || null,
      estimatedValue: editForm.estimatedValue ? parseFloat(editForm.estimatedValue) : null,
      notes: editForm.notes || null,
    }
    await updateField(data)
    setEditing(false)
  }

  const changeStatus = async (newStatus: string) => {
    await updateField({ status: newStatus })
  }

  const changePriority = async (newPriority: string) => {
    await updateField({ priority: newPriority })
  }

  const scoreWithAI = async () => {
    setScoring(true)
    try {
      await fetch("/api/v1/lead-scoring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ leadId: lead.id }),
      })
      await reloadLead()
      onSaved?.()
    } catch {} finally { setScoring(false) }
  }

  // AI helper
  const callAI = async (action: string, options?: any) => {
    setAiLoading(true)
    try {
      const res = await fetch("/api/v1/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
        body: JSON.stringify({ action, leadId: lead.id, options }),
      })
      const json = await res.json()
      if (json.success) return json.data
    } catch {} finally { setAiLoading(false) }
    return null
  }

  // Activities
  const loadActivities = async () => {
    try {
      const res = await fetch(`/api/v1/activities?contactId=${lead.id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setActivities(json.data.activities || [])
    } catch {}
  }

  const saveActivity = async () => {
    if (!activitySubject.trim()) return
    setActivitySaving(true)
    try {
      const res = await fetch("/api/v1/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
        body: JSON.stringify({
          type: activityType,
          subject: activitySubject,
          description: activityDesc,
          contactId: lead.id,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setShowActivityForm(false)
        setActivitySubject("")
        setActivityDesc("")
        loadActivities()
      }
    } catch {} finally { setActivitySaving(false) }
  }

  // Send generated email
  const [emailError, setEmailError] = useState("")
  const sendGeneratedEmail = async () => {
    if (!generatedText || !currentLead.email) return
    setEmailSending(true)
    setEmailError("")
    try {
      const res = await fetch("/api/v1/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
        body: JSON.stringify({
          to: currentLead.email,
          body: generatedText.body,
          subject: generatedText.subject,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setEmailSent(true)
      } else {
        setEmailError(json.error || "Ошибка отправки")
      }
    } catch {
      setEmailError("Ошибка сети")
    } finally { setEmailSending(false) }
  }

  const grade = getGrade(currentLead.score)
  const details = (currentLead.scoreDetails as any) || {}
  const reasoning = details.reasoning
  const factors = details.factors || {}
  const conversionProb = details.conversionProb ?? Math.round(currentLead.score * 0.85)
  const daysSinceCreation = Math.floor((Date.now() - new Date(currentLead.createdAt).getTime()) / 86400000)

  const tabs = [
    { id: "details", label: "Детали" },
    { id: "activity", label: "Активность" },
    { id: "sentiment", label: "Sentiment" },
    { id: "tasks", label: "Tasks" },
    { id: "aitext", label: "AI Text" },
    { id: "ai", label: "AI Скоринг" },
  ]

  return (
    <div className={cn("fixed inset-0 z-50", !open && "hidden")}>
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <span className={cn("inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold shadow-sm", grade.color)}>
                  {grade.letter}
                </span>
                <div>
                  <h2 className="text-xl font-bold">{currentLead.contactName}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {currentLead.companyName && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" /> {currentLead.companyName}
                      </span>
                    )}
                    <Badge className={cn("text-white text-[10px]", statusColors[currentLead.status] || "bg-gray-500")}>
                      {statusLabels[currentLead.status] || currentLead.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {priorityLabels[currentLead.priority] || currentLead.priority}
                    </Badge>
                  </div>
                  {/* Contact shortcuts */}
                  <div className="flex items-center gap-3 mt-2">
                    {currentLead.email && (
                      <a href={`mailto:${currentLead.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Mail className="h-3 w-3" /> {currentLead.email}
                      </a>
                    )}
                    {currentLead.phone && (
                      <a href={`tel:${currentLead.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Phone className="h-3 w-3" /> {currentLead.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Score summary */}
                <div className="text-center mr-2 hidden sm:block">
                  <div className="text-2xl font-bold text-primary">{currentLead.score}</div>
                  <div className="text-[10px] text-muted-foreground">Score</div>
                </div>
                <div className="text-center mr-2 hidden sm:block">
                  <div className="text-lg font-bold text-muted-foreground">{conversionProb}%</div>
                  <div className="text-[10px] text-muted-foreground">Конверсия</div>
                </div>
                <button onClick={() => onOpenChange(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 border-b shrink-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id === "activity" && !activities.length) loadActivities() }}
                className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Tab: Details */}
            {activeTab === "details" && (
              <div className="space-y-6">
                {/* Status & Priority row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Статус лида</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(["new", "contacted", "qualified", "converted", "lost"] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => changeStatus(s)}
                          disabled={saving}
                          className={cn(
                            "text-xs py-1.5 px-3 rounded-md border transition-all",
                            currentLead.status === s
                              ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                              : "bg-background hover:bg-muted border-border"
                          )}
                        >
                          {statusLabels[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Приоритет</p>
                    <div className="flex gap-1.5">
                      {(["low", "medium", "high"] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => changePriority(p)}
                          disabled={saving}
                          className={cn(
                            "text-xs py-1.5 px-4 rounded-md border transition-all",
                            currentLead.priority === p
                              ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                              : "bg-background hover:bg-muted border-border"
                          )}
                        >
                          {priorityLabels[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lead info — view or edit */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Информация о лиде</p>
                    {!editing ? (
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={startEditing}>
                        <Pencil className="h-3 w-3" /> Редактировать
                      </Button>
                    ) : (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="gap-1 h-7 text-xs" onClick={saveEditForm} disabled={saving}>
                          <Save className="h-3 w-3" /> {saving ? "Сохранение..." : "Сохранить"}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={cancelEditing}>
                          <XCircle className="h-3 w-3" /> Отмена
                        </Button>
                      </div>
                    )}
                  </div>

                  {editing ? (
                    /* Edit form */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                      <div>
                        <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                          <User className="h-3 w-3" /> Имя контакта *
                        </Label>
                        <Input
                          value={editForm.contactName}
                          onChange={e => setEditForm({ ...editForm, contactName: e.target.value })}
                          placeholder="Имя контакта"
                        />
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                          <Building2 className="h-3 w-3" /> Компания
                        </Label>
                        <Input
                          value={editForm.companyName}
                          onChange={e => setEditForm({ ...editForm, companyName: e.target.value })}
                          placeholder="Название компании"
                        />
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                          <Mail className="h-3 w-3" /> Email
                        </Label>
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                          <Phone className="h-3 w-3" /> Телефон
                        </Label>
                        <Input
                          value={editForm.phone}
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="+994 XX XXX XXXX"
                        />
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                          <Tag className="h-3 w-3" /> Источник
                        </Label>
                        <Select
                          value={editForm.source}
                          onChange={e => setEditForm({ ...editForm, source: e.target.value })}
                        >
                          <option value="">— Не указан —</option>
                          {sourceOptions.map(s => (
                            <option key={s} value={s}>{sourceLabels[s] || s}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                          <DollarSign className="h-3 w-3" /> Оценочная стоимость ($)
                        </Label>
                        <Input
                          type="number"
                          value={editForm.estimatedValue}
                          onChange={e => setEditForm({ ...editForm, estimatedValue: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs mb-1.5 block">Заметки</Label>
                        <Textarea
                          value={editForm.notes}
                          onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                          rows={3}
                          placeholder="Заметки о лиде..."
                        />
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase">Контакт</span>
                        </div>
                        <span className="text-sm font-medium">{currentLead.contactName}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase">Компания</span>
                        </div>
                        <span className="text-sm font-medium">{currentLead.companyName || "—"}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase">Email</span>
                        </div>
                        <span className="text-sm font-medium truncate block">{currentLead.email || "—"}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase">Телефон</span>
                        </div>
                        <span className="text-sm font-medium">{currentLead.phone || "—"}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase">Источник</span>
                        </div>
                        <span className="text-sm font-medium">{currentLead.source ? (sourceLabels[currentLead.source] || currentLead.source) : "—"}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase">Стоимость</span>
                        </div>
                        <span className="text-sm font-medium">{currentLead.estimatedValue ? `$${currentLead.estimatedValue.toLocaleString()}` : "—"}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase">Создан</span>
                        </div>
                        <span className="text-sm font-medium">{new Date(currentLead.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase">Возраст</span>
                        </div>
                        <span className="text-sm font-medium">{daysSinceCreation} дн.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes (view mode only — edit mode has notes in form) */}
                {!editing && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Заметки</p>
                    <div className="p-3 bg-muted/20 rounded-lg border min-h-[48px]">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {currentLead.notes || "Нет заметок. Нажмите «Редактировать» чтобы добавить."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Score bar */}
                <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">AI Score</span>
                      <span className="text-xs font-bold">{currentLead.score}/100</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", currentLead.score >= 80 ? "bg-green-500" : currentLead.score >= 60 ? "bg-blue-500" : currentLead.score >= 40 ? "bg-yellow-500" : "bg-red-500")}
                        style={{ width: `${currentLead.score}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {currentLead.lastScoredAt ? `Оценён: ${new Date(currentLead.lastScoredAt).toLocaleDateString()}` : "Не оценён"}
                  </span>
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {currentLead.status !== "converted" && onConvert && (
                    <Button className="gap-1.5" onClick={() => { onOpenChange(false); onConvert(currentLead) }}>
                      <ArrowRight className="h-4 w-4" /> Конвертировать в сделку
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1 text-orange-700 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950"
                    onClick={async () => {
                      if (!confirm(`Пометить как потерянный: ${currentLead.contactName}?`)) return
                      await changeStatus("lost")
                    }}>
                    <Ban className="h-3 w-3" /> Потерян
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-red-700 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                    onClick={async () => {
                      if (!confirm(`Удалить ${currentLead.contactName}? Необратимо.`)) return
                      await fetch(`/api/v1/leads/${lead.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": String(orgId) } : {} })
                      onOpenChange(false)
                      onSaved?.()
                    }}>
                    <Trash2 className="h-3 w-3" /> Удалить
                  </Button>
                </div>
              </div>
            )}

            {/* Tab: Activity */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Активности</p>
                  <Button size="sm" className="gap-1" onClick={() => { setShowActivityForm(!showActivityForm); if (!activities.length) loadActivities() }}>
                    <Plus className="h-3 w-3" /> Записать
                  </Button>
                </div>

                {showActivityForm && (
                  <Card>
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Тип</Label>
                          <Select value={activityType} onChange={e => setActivityType(e.target.value)}>
                            <option value="note">Заметка</option>
                            <option value="call">Звонок</option>
                            <option value="email">Email</option>
                            <option value="meeting">Встреча</option>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Тема *</Label>
                          <Input value={activitySubject} onChange={e => setActivitySubject(e.target.value)} placeholder="Тема активности" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Описание</Label>
                        <Textarea value={activityDesc} onChange={e => setActivityDesc(e.target.value)} rows={2} placeholder="Детали..." />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveActivity} disabled={activitySaving || !activitySubject.trim()}>
                          {activitySaving ? "Сохраняем..." : "Сохранить"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowActivityForm(false)}>Отмена</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activities.length > 0 ? (
                  <div className="space-y-2">
                    {activities.map((a: any) => (
                      <div key={a.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                        <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                          {a.type === "call" ? "Звонок" : a.type === "email" ? "Email" : a.type === "meeting" ? "Встреча" : "Заметка"}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{a.subject}</p>
                          {a.description && <p className="text-muted-foreground text-xs mt-0.5">{a.description}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !showActivityForm ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Нет записанных активностей</p>
                    <p className="text-xs mt-1">Нажмите «Записать» чтобы добавить</p>
                    <Button size="sm" variant="link" className="mt-2" onClick={loadActivities}>Обновить</Button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Tab: Sentiment */}
            {activeTab === "sentiment" && (
              <div className="space-y-4">
                {!sentiment ? (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <Button onClick={async () => { const d = await callAI("sentiment"); if (d) setSentiment(d) }} disabled={aiLoading} className="gap-2">
                      {aiLoading ? "Анализируем..." : "Анализировать тональность"}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-3">AI проанализирует все коммуникации с этим лидом</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-6 justify-center">
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-28 h-28" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                          <circle cx="50" cy="50" r="45" fill="none" stroke={sentiment.score >= 70 ? "#22c55e" : sentiment.score >= 40 ? "#3b82f6" : "#ef4444"} strokeWidth="8" strokeDasharray={`${sentiment.score * 2.83} 283`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                        </svg>
                        <div className="absolute text-center">
                          <div className="text-3xl">{sentiment.emoji}</div>
                          <div className="text-sm font-bold">{sentiment.score}%</div>
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{sentiment.sentiment}</p>
                        <p className="text-sm text-muted-foreground mt-1">Тональность коммуникаций</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Card><CardContent className="pt-3 pb-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">Тренд</p>
                        <p className="text-sm font-medium mt-1">{sentiment.trend === "improving" ? "Улучшается" : sentiment.trend === "stable" ? "Стабильный" : "Неизвестно"}</p>
                      </CardContent></Card>
                      <Card><CardContent className="pt-3 pb-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">Риск</p>
                        <p className={cn("text-sm font-bold mt-1", sentiment.risk === "HIGH" ? "text-red-500" : sentiment.risk === "MEDIUM" ? "text-orange-500" : "text-green-500")}>{sentiment.risk}</p>
                      </CardContent></Card>
                      <Card><CardContent className="pt-3 pb-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">Уверенность</p>
                        <p className="text-sm font-bold text-primary mt-1">{sentiment.confidence}%</p>
                      </CardContent></Card>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase">Резюме</p>
                      <p className="text-sm leading-relaxed">{sentiment.summary}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Tasks */}
            {activeTab === "tasks" && (
              <div className="space-y-4">
                {!aiTasks ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <Button onClick={async () => { const d = await callAI("tasks"); if (d) setAiTasks(d) }} disabled={aiLoading} className="gap-2">
                      {aiLoading ? "Генерируем..." : "Сгенерировать задачи"}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-3">AI проанализирует лид и предложит план действий</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-sm border border-yellow-200 dark:border-yellow-800">
                      <p className="font-medium text-xs text-yellow-800 dark:text-yellow-300 uppercase mb-1">Стратегия</p>
                      <p>{aiTasks.strategy}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiTasks.tasks.map((task: any, i: number) => (
                        <Card key={i}>
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex gap-1">
                                <Badge variant={task.priority === "HIGH" ? "destructive" : "secondary"} className="text-[10px]">{task.priority}</Badge>
                                <Badge variant="outline" className="text-[10px]">{task.type}</Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{task.dueDate}</span>
                            </div>
                            <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-center pt-2">
                      <Button size="sm" className="gap-1"><CheckCircle className="h-3 w-3" /> Создать все задачи</Button>
                      <Button size="sm" variant="outline" onClick={async () => { const d = await callAI("tasks"); if (d) setAiTasks(d) }} className="gap-1"><RefreshCw className="h-3 w-3" /> Пересоздать</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: AI Text */}
            {activeTab === "aitext" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Тип текста</Label>
                    <Select value={textType} onChange={e => setTextType(e.target.value)}>
                      <option value="Email">Email</option>
                      <option value="SMS">SMS</option>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Тон</Label>
                    <Select value={tone} onChange={e => setTone(e.target.value)}>
                      <option value="Профессиональный">Профессиональный</option>
                      <option value="Дружелюбный">Дружелюбный</option>
                      <option value="Формальный">Формальный</option>
                      <option value="Убедительный">Убедительный</option>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Доп. инструкции</Label>
                    <Input value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Упомянуть скидку 10%..." />
                  </div>
                </div>
                <Button onClick={async () => { const d = await callAI("text", { textType, tone, instructions }); if (d) { setGeneratedText(d); setEmailSent(false) } }} disabled={aiLoading} className="w-full gap-2">
                  {aiLoading ? "Генерируем..." : "Сгенерировать текст"}
                </Button>

                {generatedText && (
                  <div className="space-y-3 border rounded-lg p-4 bg-muted/10">
                    {generatedText.subject && (
                      <div>
                        <Label className="text-xs text-primary uppercase">Тема</Label>
                        <Input value={generatedText.subject} readOnly className="mt-1 bg-background" />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs uppercase">Текст</Label>
                      <Textarea value={generatedText.body} rows={8} className="mt-1 bg-background" readOnly />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedText.body)} className="gap-1">
                        <Copy className="h-3 w-3" /> Копировать
                      </Button>
                      {currentLead.email && (
                        <Button size="sm" onClick={sendGeneratedEmail} disabled={emailSending || emailSent} className="gap-1">
                          <Send className="h-3 w-3" /> {emailSent ? "Отправлено" : emailSending ? "Отправляем..." : "Отправить email"}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={async () => { const d = await callAI("text", { textType, tone, instructions }); if (d) { setGeneratedText(d); setEmailSent(false); setEmailError("") } }} className="gap-1">
                        <RefreshCw className="h-3 w-3" /> Пересоздать
                      </Button>
                    </div>
                    {emailError && (
                      <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">{emailError}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: AI Scoring */}
            {activeTab === "ai" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-1.5">
                    <Brain className="h-4 w-4 text-purple-500" /> AI Анализ
                  </h4>
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={scoreWithAI} disabled={scoring}>
                    {scoring ? "Анализ..." : "Пересчитать с AI"}
                  </Button>
                </div>

                {reasoning && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-purple-900 dark:text-purple-200 leading-relaxed">{reasoning}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 text-center">
                  <Card><CardContent className="pt-4 pb-4">
                    <div className={cn("text-3xl font-bold", grade.color.replace("bg-", "text-").replace(" text-white", ""))}>
                      {grade.letter}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Грейд</div>
                  </CardContent></Card>
                  <Card><CardContent className="pt-4 pb-4">
                    <div className="text-3xl font-bold text-primary">{currentLead.score}</div>
                    <div className="text-xs text-muted-foreground mt-1">Балл</div>
                  </CardContent></Card>
                  <Card><CardContent className="pt-4 pb-4">
                    <div className={cn("text-3xl font-bold", conversionProb >= 50 ? "text-green-600" : conversionProb >= 30 ? "text-yellow-600" : "text-red-500")}>
                      {conversionProb}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Конверсия</div>
                  </CardContent></Card>
                </div>

                {Object.keys(factors).length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Факторы оценки</h5>
                    <div className="space-y-2">
                      {Object.entries(factors).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-36 truncate">{key}</span>
                          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (Number(value) / 20) * 100)}%` }} />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!reasoning && !currentLead.lastScoredAt && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Лид ещё не был оценён AI. Нажмите «Пересчитать с AI» для анализа.
                  </p>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
