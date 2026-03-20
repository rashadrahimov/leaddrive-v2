"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import {
  X, Pencil, Mail, Phone, Building2, Sparkles, Brain,
  ArrowRight, DollarSign, Calendar, Clock, Star,
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

  useEffect(() => {
    if (open && lead) {
      setActiveTab("details")
      setNotesText(lead.notes || "")
      setEditingNotes(false)
      setCurrentLead(lead)
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

  const grade = getGrade(currentLead.score)
  const details = (currentLead.scoreDetails as any) || {}
  const reasoning = details.reasoning
  const factors = details.factors || {}
  const conversionProb = details.conversionProb ?? Math.round(currentLead.score * 0.85)
  const daysSinceCreation = Math.floor((Date.now() - new Date(currentLead.createdAt).getTime()) / 86400000)

  const tabs = [
    { id: "details", label: "Детали" },
    { id: "ai", label: "AI Скоринг" },
    { id: "notes", label: "Заметки" },
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
              onClick={() => setActiveTab(tab.id)}
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

            {/* Convert button */}
            {currentLead.status !== "converted" && onConvert && (
              <Button
                className="w-full gap-2"
                onClick={() => { onOpenChange(false); onConvert(currentLead) }}
              >
                <ArrowRight className="h-4 w-4" /> Конвертировать в сделку
              </Button>
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

            {/* AI Reasoning */}
            {reasoning && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-900 dark:text-purple-200">{reasoning}</p>
                </div>
              </div>
            )}

            {/* Score factors */}
            {Object.keys(factors).length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-2">Факторы оценки:</h5>
                <div className="space-y-2">
                  {Object.entries(factors).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-40 truncate">{key}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, (Number(value) / 20) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score summary */}
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

        {/* Tab: Notes */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Заметки</h4>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditingNotes(!editingNotes)}>
                <Pencil className="h-3 w-3 mr-1" /> {editingNotes ? "Отмена" : "Изменить"}
              </Button>
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesText}
                  onChange={e => setNotesText(e.target.value)}
                  rows={6}
                  placeholder="Заметки о лиде..."
                />
                <Button size="sm" onClick={saveNotes} disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded min-h-[80px] whitespace-pre-wrap">
                {currentLead.notes || "Нет заметок. Нажмите 'Изменить' чтобы добавить."}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
