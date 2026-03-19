"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import { Building2, Users, FileText, X, Phone, Mail, Calendar, Brain, Zap, MessageSquare, Copy, Send, RefreshCw, CheckCircle, Trash2, Ban } from "lucide-react"
import { useRouter } from "next/navigation"

interface LeadCompany {
  id: string
  name: string
  website?: string
  industry?: string
  email?: string
  phone?: string
  category: string
  leadStatus: string
  leadScore: number
  leadTemperature?: string
  userCount: number
  contacts?: Array<{ id: string; fullName: string; email?: string; phone?: string; position?: string }>
  deals?: Array<{ id: string; title: string; stage: string; valueAmount?: number }>
  _count?: { contacts: number; deals: number }
}

interface LeadDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: LeadCompany | null
  orgId?: string
  onSaved?: () => void
}

const statusLabels: Record<string, string> = {
  new: "Новый", contacted: "Связались", qualified: "Квалифицирован",
  converted: "Конвертирован", rejected: "Не подходит", cancelled: "Аннулирован",
}

export function LeadDetailModal({ open, onOpenChange, company, orgId, onSaved }: LeadDetailModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("details")
  const [aiLoading, setAiLoading] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityType, setActivityType] = useState("note")
  const [activitySubject, setActivitySubject] = useState("")
  const [activityDesc, setActivityDesc] = useState("")

  // Sentiment state
  const [sentiment, setSentiment] = useState<any>(null)

  // Tasks state
  const [aiTasks, setAiTasks] = useState<any>(null)

  // AI Text state
  const [textType, setTextType] = useState("Email")
  const [tone, setTone] = useState("Профессиональный")
  const [instructions, setInstructions] = useState("")
  const [generatedText, setGeneratedText] = useState<any>(null)

  useEffect(() => {
    if (open) {
      setActiveTab("details")
      setSentiment(null)
      setAiTasks(null)
      setGeneratedText(null)
      setInstructions("")
    }
  }, [open, company])

  if (!company) return null

  const callAI = async (action: string, options?: any) => {
    setAiLoading(true)
    try {
      const res = await fetch("/api/v1/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({ action, companyId: company.id, options }),
      })
      const json = await res.json()
      if (json.success) return json.data
    } catch {} finally { setAiLoading(false) }
    return null
  }

  const handleSentiment = async () => {
    const data = await callAI("sentiment")
    if (data) setSentiment(data)
  }

  const handleGenerateTasks = async () => {
    const data = await callAI("tasks")
    if (data) setAiTasks(data)
  }

  const handleGenerateText = async () => {
    const data = await callAI("text", { textType, tone, instructions })
    if (data) setGeneratedText(data)
  }

  const tabs = [
    { id: "details", label: "Детали" },
    { id: "activity", label: "Активность" },
    { id: "sentiment", label: "🐷 Sentiment", icon: true },
    { id: "tasks", label: "⚡ Tasks", icon: true },
    { id: "aitext", label: "✉️ AI Text", icon: true },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold">{company.name}</span>
            <div className="flex items-center gap-2 mt-1">
              {company.website && <span className="text-sm text-primary">{company.website}</span>}
              <Badge variant="outline">{statusLabels[company.leadStatus] || company.leadStatus}</Badge>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[70vh] overflow-y-auto">
        {/* Tabs */}
        <div className="flex gap-1 border-b mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-sm border-b-2 transition-colors ${
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
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Отрасль:</span> {company.industry || "—"}</div>
              <div><span className="text-muted-foreground">Сайт:</span> {company.website || "—"}</div>
              <div><span className="text-muted-foreground">Контакты:</span> {company._count?.contacts || company.contacts?.length || 0}</div>
              <div><span className="text-muted-foreground">Последняя активность:</span> —</div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Ключевые люди</h4>
              {company.contacts && company.contacts.length > 0 ? (
                <div className="space-y-2">
                  {company.contacts.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                      <span className="font-medium">{c.fullName}</span>
                      <span className="text-muted-foreground">{c.position || c.email || ""}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Контракты ({company._count?.deals || 0})</h4>
              {company.deals && company.deals.length > 0 ? (
                company.deals.map(d => (
                  <div key={d.id} className="text-sm p-2 bg-muted/30 rounded mb-1">
                    {d.title} — <Badge variant="outline" className="text-xs">{d.stage}</Badge>
                  </div>
                ))
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </div>
          </div>
        )}

        {/* Tab: Activity */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <Button size="sm" className="gap-1" onClick={() => setShowActivityForm(!showActivityForm)}>
              <Plus className="h-3 w-3" /> Записать
            </Button>

            {showActivityForm && (
              <div className="border rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Тип</label>
                    <Select value={activityType} onChange={e => setActivityType(e.target.value)}>
                      <option value="note">📝 Заметка</option>
                      <option value="call">📞 Звонок</option>
                      <option value="email">📧 Email</option>
                      <option value="meeting">🤝 Встреча</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Тема</label>
                    <Input value={activitySubject} onChange={e => setActivitySubject(e.target.value)} placeholder="Тема активности" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Описание</label>
                  <Textarea value={activityDesc} onChange={e => setActivityDesc(e.target.value)} rows={2} placeholder="Детали..." />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => {
                    try {
                      await fetch("/api/v1/activities", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
                        body: JSON.stringify({ type: activityType, subject: activitySubject, description: activityDesc, companyId: company.id }),
                      })
                      setShowActivityForm(false)
                      setActivitySubject("")
                      setActivityDesc("")
                    } catch {}
                  }}>Сохранить</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowActivityForm(false)}>Отмена</Button>
                </div>
              </div>
            )}

            {!showActivityForm && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Нет активностей</p>
                <p className="text-xs">Запишите первую активность</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Sentiment */}
        {activeTab === "sentiment" && (
          <div className="space-y-4">
            {!sentiment ? (
              <div className="text-center py-4">
                <Button onClick={handleSentiment} disabled={aiLoading} className="gap-2">
                  🐷 {aiLoading ? "Анализируем..." : "Анализировать тональность"}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">AI проанализирует все коммуникации с этой компанией</p>
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

                <div className="grid grid-cols-3 gap-3">
                  <Card><CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">TREND</p>
                    <p className="font-medium">{sentiment.trend === "improving" ? "📈" : sentiment.trend === "stable" ? "➡️" : "❓"} {sentiment.trend}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">RISK</p>
                    <p className={`font-bold ${sentiment.risk === "HIGH" ? "text-red-500" : sentiment.risk === "MEDIUM" ? "text-orange-500" : "text-green-500"}`}>{sentiment.risk}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">CONFIDENCE</p>
                    <p className="font-bold text-primary">{sentiment.confidence}%</p>
                  </CardContent></Card>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">РЕЗЮМЕ</p>
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
                <Button onClick={handleGenerateTasks} disabled={aiLoading} className="gap-2">
                  ⚡ {aiLoading ? "Генерируем..." : "Сгенерировать задачи"}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">AI проанализирует и предложит задачи</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm">
                  <p>💡 {aiTasks.strategy}</p>
                </div>

                {aiTasks.tasks.map((task: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{task.type === "email" ? "📧" : task.type === "call" ? "📞" : task.type === "meeting" ? "📨" : "📋"} {task.title}</h4>
                        <div className="flex gap-1">
                          <Badge variant={task.priority === "HIGH" ? "destructive" : "secondary"} className="text-xs">{task.priority}</Badge>
                          <Badge variant="outline" className="text-xs">{task.type}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                      <div className="flex justify-between text-xs">
                        <span>📅 {task.dueDate}</span>
                        <span className="text-muted-foreground italic">{task.reasoning}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex gap-2 justify-center">
                  <Button size="sm" className="gap-1"><CheckCircle className="h-3 w-3" /> Создать все задачи</Button>
                  <Button size="sm" variant="outline" onClick={handleGenerateTasks} className="gap-1"><RefreshCw className="h-3 w-3" /> Пересоздать</Button>
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
                <label className="text-xs text-muted-foreground">Тип текста</label>
                <Select value={textType} onChange={e => setTextType(e.target.value)}>
                  <option value="Email">📧 Email</option>
                  <option value="SMS">📱 SMS</option>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Тон</label>
                <Select value={tone} onChange={e => setTone(e.target.value)}>
                  <option value="Профессиональный">🏢 Профессиональный</option>
                  <option value="Дружелюбный">😊 Дружелюбный</option>
                  <option value="Формальный">📋 Формальный</option>
                  <option value="Убедительный">💪 Убедительный</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Дополнительные инструкции (необязательно)</label>
              <Textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={2}
                placeholder="Например: упомянуть скидку 10%, предложить демо..."
              />
            </div>

            <Button onClick={handleGenerateText} disabled={aiLoading} className="w-full gap-2">
              ✉️ {aiLoading ? "Генерируем..." : "Сгенерировать текст"}
            </Button>

            {generatedText && (
              <div className="space-y-3">
                {generatedText.subject && (
                  <div>
                    <label className="text-xs font-medium text-primary">ТЕМА / SUBJECT</label>
                    <Input value={generatedText.subject} readOnly className="mt-1" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">ТЕКСТ ПИСЬМА (МОЖНО РЕДАКТИРОВАТЬ)</label>
                  <Textarea value={generatedText.body} rows={6} className="mt-1" readOnly />
                </div>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedText.body)} className="gap-1">
                    <Copy className="h-3 w-3" /> Копировать
                  </Button>
                  <Button size="sm" className="gap-1">
                    <Send className="h-3 w-3" /> Отправить email
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleGenerateText} className="gap-1">
                    <RefreshCw className="h-3 w-3" /> Пересоздать
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" className="gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            onClick={() => { onOpenChange(false); router.push(`/contracts?companyId=${company.id}`) }}>
            <FileText className="h-3 w-3" /> Просмотр контрактов
          </Button>
          <Button variant="outline" className="gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            onClick={() => { onOpenChange(false); router.push(`/companies/${company.id}`) }}>
            <Building2 className="h-3 w-3" /> Редактировать
          </Button>
          <Button variant="outline" className="gap-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
            onClick={async () => {
              if (!confirm(`Деактивировать ${company.name}?`)) return
              await fetch(`/api/v1/companies/${company.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
                body: JSON.stringify({ status: "inactive", leadStatus: "cancelled" }),
              })
              onOpenChange(false)
              onSaved?.()
            }}>
            <Ban className="h-3 w-3" /> Деактивировать
          </Button>
          <Button variant="outline" className="gap-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
            onClick={async () => {
              if (!confirm(`Удалить ${company.name}? Это действие необратимо.`)) return
              await fetch(`/api/v1/companies/${company.id}`, {
                method: "DELETE",
                headers: orgId ? { "x-organization-id": orgId } : {},
              })
              onOpenChange(false)
              onSaved?.()
            }}>
            <Trash2 className="h-3 w-3" /> Удалить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Plus({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}
