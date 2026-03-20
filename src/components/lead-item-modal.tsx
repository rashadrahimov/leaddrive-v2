"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import {
  X, Pencil, Mail, Phone, Building2, Sparkles, Brain,
  ArrowRight, Plus, Copy, Send, RefreshCw, CheckCircle, Trash2, Ban,
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

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 80) return { letter: "A", color: "bg-green-500 text-white" }
  if (score >= 60) return { letter: "B", color: "bg-blue-500 text-white" }
  if (score >= 40) return { letter: "C", color: "bg-yellow-500 text-white" }
  if (score >= 20) return { letter: "D", color: "bg-orange-500 text-white" }
  return { letter: "F", color: "bg-red-500 text-white" }
}

export function LeadItemModal({ open, onOpenChange, lead, orgId, onSaved, onConvert }: LeadItemModalProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState("")
  const [saving, setSaving] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [currentLead, setCurrentLead] = useState<LeadItem | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

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
      setNotesText(lead.notes || "")
      setEditingNotes(false)
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

  const reloadLead = async () => {
    try {
      const res = await fetch(`/api/v1/leads/${lead.id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success && json.data) {
        setCurrentLead(json.data)
        setNotesText(json.data.notes || "")
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

  const saveNotes = async () => {
    await updateField({ notes: notesText })
    setEditingNotes(false)
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

  const editField = (label: string, field: string, currentValue: any, isNumber = false) => {
    const val = prompt(`${label}:`, String(currentValue || ""))
    if (val === null) return
    updateField({ [field]: isNumber ? (parseFloat(val) || 0) : val })
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
  const sendGeneratedEmail = async () => {
    if (!generatedText || !currentLead.email) return
    setEmailSending(true)
    try {
      await fetch("/api/v1/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
        body: JSON.stringify({
          to: currentLead.email,
          body: generatedText.body,
          subject: generatedText.subject,
        }),
      })
      setEmailSent(true)
    } catch {} finally { setEmailSending(false) }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className={cn("inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold", grade.color)}>
                {grade.letter}
              </span>
              <div>
                <span className="text-xl font-bold">{currentLead.contactName}</span>
                <div className="flex items-center gap-2 mt-1">
                  {currentLead.companyName && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {currentLead.companyName}
                    </span>
                  )}
                  <Badge className={cn("text-white text-[10px]", statusColors[currentLead.status] || "bg-gray-500")}>
                    {statusLabels[currentLead.status] || currentLead.status}
                  </Badge>
                </div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-2 rounded-full hover:bg-muted transition-colors -mt-1 -mr-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[70vh] overflow-y-auto">
        {/* Score bar */}
        <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{currentLead.score}</div>
            <div className="text-[10px] text-muted-foreground">Score</div>
          </div>
          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", currentLead.score >= 80 ? "bg-green-500" : currentLead.score >= 60 ? "bg-blue-500" : currentLead.score >= 40 ? "bg-yellow-500" : "bg-red-500")}
                style={{ width: `${currentLead.score}%` }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{conversionProb}%</div>
            <div className="text-[10px] text-muted-foreground">Конверсия</div>
          </div>
        </div>

        {/* Contact info row */}
        <div className="flex flex-wrap gap-3 mb-4">
          {currentLead.email && (
            <a href={`mailto:${currentLead.email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Mail className="h-3 w-3" /> {currentLead.email}
            </a>
          )}
          {currentLead.phone && (
            <a href={`tel:${currentLead.phone}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Phone className="h-3 w-3" /> {currentLead.phone}
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b mb-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "activity" && !activities.length) loadActivities() }}
              className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Details */}
        {activeTab === "details" && (
          <div className="space-y-4">
            {/* Quick status change */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Статус лида:</p>
              <div className="grid grid-cols-5 gap-1.5">
                {(["new", "contacted", "qualified", "converted", "lost"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    className={`text-xs py-1.5 px-2 rounded-md border transition-all ${
                      currentLead.status === s
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Приоритет:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["low", "medium", "high"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => changePriority(p)}
                    className={`text-xs py-1.5 px-2 rounded-md border transition-all ${
                      currentLead.priority === p
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    {priorityLabels[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField("Email", "email", currentLead.email)}>
                <span className="text-[10px] text-muted-foreground block">Email <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{currentLead.email || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField("Телефон", "phone", currentLead.phone)}>
                <span className="text-[10px] text-muted-foreground block">Телефон <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{currentLead.phone || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField("Компания", "companyName", currentLead.companyName)}>
                <span className="text-[10px] text-muted-foreground block">Компания <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{currentLead.companyName || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField("Источник", "source", currentLead.source)}>
                <span className="text-[10px] text-muted-foreground block">Источник <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{currentLead.source ? (sourceLabels[currentLead.source] || currentLead.source) : "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField("Оценочная стоимость ($)", "estimatedValue", currentLead.estimatedValue, true)}>
                <span className="text-[10px] text-muted-foreground block">Оценочная стоимость <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{currentLead.estimatedValue ? `$${currentLead.estimatedValue.toLocaleString()}` : "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">Дата создания</span>
                <span className="text-xs">{new Date(currentLead.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">Возраст лида</span>
                <span className="text-xs">{daysSinceCreation} дн.</span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">Последний скоринг</span>
                <span className="text-xs">{currentLead.lastScoredAt ? new Date(currentLead.lastScoredAt).toLocaleString() : "Не оценён"}</span>
              </div>
            </div>

            {/* Notes inline */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-sm">Заметки</h4>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditingNotes(!editingNotes)}>
                  <Pencil className="h-3 w-3 mr-1" /> {editingNotes ? "Отмена" : "Изменить"}
                </Button>
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={3} placeholder="Заметки о лиде..." />
                  <Button size="sm" onClick={saveNotes} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded min-h-[40px] whitespace-pre-wrap">
                  {currentLead.notes || "Нет заметок. Нажмите 'Изменить' чтобы добавить."}
                </p>
              )}
            </div>

            {/* Convert button */}
            {currentLead.status !== "converted" && onConvert && (
              <Button className="w-full gap-2" onClick={() => { onOpenChange(false); onConvert(currentLead) }}>
                <ArrowRight className="h-4 w-4" /> Конвертировать в сделку
              </Button>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="gap-1 text-orange-700 border-orange-200 hover:bg-orange-50"
                onClick={async () => {
                  if (!confirm(`Пометить как потерянный: ${currentLead.contactName}?`)) return
                  await changeStatus("lost")
                }}>
                <Ban className="h-3 w-3" /> Потерян
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-red-700 border-red-200 hover:bg-red-50"
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
            <Button size="sm" className="gap-1" onClick={() => { setShowActivityForm(!showActivityForm); if (!activities.length) loadActivities() }}>
              <Plus className="h-3 w-3" /> Записать
            </Button>

            {showActivityForm && (
              <Card>
                <CardContent className="pt-3 pb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
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
                  <div key={a.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs">
                    <span>{a.type === "call" ? "Tel" : a.type === "email" ? "Mail" : a.type === "meeting" ? "Meet" : "Note"}</span>
                    <div className="flex-1">
                      <p className="font-medium">{a.subject}</p>
                      {a.description && <p className="text-muted-foreground">{a.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showActivityForm ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">Нет записанных активностей</p>
                <p className="text-xs mt-1">Нажмите "Записать" чтобы добавить</p>
                <Button size="sm" variant="link" className="mt-2" onClick={loadActivities}>Обновить</Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Tab: Sentiment */}
        {activeTab === "sentiment" && (
          <div className="space-y-4">
            {!sentiment ? (
              <div className="text-center py-4">
                <Button onClick={async () => { const d = await callAI("sentiment"); if (d) setSentiment(d) }} disabled={aiLoading} className="gap-2">
                  {aiLoading ? "Анализируем..." : "Анализировать тональность"}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">AI проанализирует все коммуникации с этим лидом</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-24 h-24" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke={sentiment.score >= 70 ? "#22c55e" : sentiment.score >= 40 ? "#3b82f6" : "#ef4444"} strokeWidth="8" strokeDasharray={`${sentiment.score * 2.83} 283`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="absolute text-center">
                      <div className="text-2xl">{sentiment.emoji}</div>
                      <div className="text-sm font-bold">{sentiment.score}%</div>
                    </div>
                  </div>
                  <p className="font-bold mt-2">{sentiment.sentiment}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Card><CardContent className="pt-2 pb-2 text-center">
                    <p className="text-[10px] text-muted-foreground">TREND</p>
                    <p className="text-sm font-medium">{sentiment.trend === "improving" ? "Up" : sentiment.trend === "stable" ? "Stable" : "?"} {sentiment.trend}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-2 pb-2 text-center">
                    <p className="text-[10px] text-muted-foreground">RISK</p>
                    <p className={`text-sm font-bold ${sentiment.risk === "HIGH" ? "text-red-500" : sentiment.risk === "MEDIUM" ? "text-orange-500" : "text-green-500"}`}>{sentiment.risk}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-2 pb-2 text-center">
                    <p className="text-[10px] text-muted-foreground">CONFIDENCE</p>
                    <p className="text-sm font-bold text-primary">{sentiment.confidence}%</p>
                  </CardContent></Card>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">РЕЗЮМЕ</p>
                  <p className="text-sm">{sentiment.summary}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Tasks */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {!aiTasks ? (
              <div className="text-center py-4">
                <Button onClick={async () => { const d = await callAI("tasks"); if (d) setAiTasks(d) }} disabled={aiLoading} className="gap-2">
                  {aiLoading ? "Генерируем..." : "Сгенерировать задачи"}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">AI проанализирует и предложит задачи</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm">
                  <p>{aiTasks.strategy}</p>
                </div>
                {aiTasks.tasks.map((task: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{task.type === "email" ? "Mail" : task.type === "call" ? "Tel" : task.type === "meeting" ? "Meet" : "Task"} {task.title}</h4>
                        <div className="flex gap-1">
                          <Badge variant={task.priority === "HIGH" ? "destructive" : "secondary"} className="text-[10px]">{task.priority}</Badge>
                          <Badge variant="outline" className="text-[10px]">{task.type}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{task.description}</p>
                      <p className="text-[10px] text-muted-foreground">{task.dueDate}</p>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex gap-2 justify-center">
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
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div>
              <Label className="text-xs">Дополнительные инструкции</Label>
              <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} placeholder="Например: упомянуть скидку 10%, предложить демо..." />
            </div>
            <Button onClick={async () => { const d = await callAI("text", { textType, tone, instructions }); if (d) { setGeneratedText(d); setEmailSent(false) } }} disabled={aiLoading} className="w-full gap-2">
              {aiLoading ? "Генерируем..." : "Сгенерировать текст"}
            </Button>

            {generatedText && (
              <div className="space-y-3">
                {generatedText.subject && (
                  <div>
                    <Label className="text-xs text-primary">ТЕМА / SUBJECT</Label>
                    <Input value={generatedText.subject} readOnly className="mt-1" />
                  </div>
                )}
                <div>
                  <Label className="text-xs">ТЕКСТ ПИСЬМА</Label>
                  <Textarea value={generatedText.body} rows={6} className="mt-1" readOnly />
                </div>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedText.body)} className="gap-1">
                    <Copy className="h-3 w-3" /> Копировать
                  </Button>
                  {currentLead.email && (
                    <Button size="sm" onClick={sendGeneratedEmail} disabled={emailSending || emailSent} className="gap-1">
                      <Send className="h-3 w-3" /> {emailSent ? "Отправлено" : emailSending ? "Отправляем..." : "Отправить email"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={async () => { const d = await callAI("text", { textType, tone, instructions }); if (d) { setGeneratedText(d); setEmailSent(false) } }} className="gap-1">
                    <RefreshCw className="h-3 w-3" /> Пересоздать
                  </Button>
                </div>
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
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-900 dark:text-purple-200">{reasoning}</p>
                </div>
              </div>
            )}

            {Object.keys(factors).length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-2">Факторы оценки:</h5>
                <div className="space-y-2">
                  {Object.entries(factors).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-40 truncate">{key}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (Number(value) / 20) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className={cn("text-2xl font-bold", grade.color.replace("bg-", "text-").replace(" text-white", ""))}>
                  {grade.letter}
                </div>
                <div className="text-[10px] text-muted-foreground">Грейд</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-primary">{currentLead.score}</div>
                <div className="text-[10px] text-muted-foreground">Балл</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className={cn("text-2xl font-bold", conversionProb >= 50 ? "text-green-600" : conversionProb >= 30 ? "text-yellow-600" : "text-red-500")}>
                  {conversionProb}%
                </div>
                <div className="text-[10px] text-muted-foreground">Конверсия</div>
              </div>
            </div>

            {!reasoning && !currentLead.lastScoredAt && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Лид ещё не был оценён AI. Нажмите "Пересчитать с AI" для анализа.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
