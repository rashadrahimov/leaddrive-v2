"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Send, Trash2, Users, Search, X, Filter, UserCheck, Mail, MessageSquare, Calendar, FileText, DollarSign, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface CampaignFormData {
  name: string
  description: string
  type: string
  status: string
  subject: string
  templateId: string
  segmentId: string
  scheduledAt: string
  totalRecipients: string
  budget: string
}

interface Contact {
  id: string
  fullName: string
  email: string | null
  source?: string | null
}

interface Template {
  id: string
  name: string
}

interface Segment {
  id: string
  name: string
  contactCount: number
}

interface CampaignFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<CampaignFormData> & { id?: string; sentAt?: string; totalSent?: number; totalOpened?: number; totalClicked?: number; recipientMode?: string; recipientIds?: string[]; recipientSource?: string }
  orgId?: string
  onSend?: () => void
  onDelete?: () => void
}

type RecipientMode = "all" | "segment" | "source" | "manual"

const sourceOptions = [
  { value: "website", label: "Сайт" },
  { value: "referral", label: "Рекомендация" },
  { value: "cold_call", label: "Холодный звонок" },
  { value: "email", label: "Email" },
  { value: "social", label: "Соц. сети" },
  { value: "event", label: "Мероприятие" },
  { value: "other", label: "Другое" },
]

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  scheduled: "Запланирована",
  sending: "Отправляется",
  sent: "Отправлена",
  cancelled: "Отменена",
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  scheduled: "bg-amber-50 text-amber-600 border-amber-200",
  sending: "bg-blue-50 text-blue-600 border-blue-200",
  sent: "bg-green-50 text-green-600 border-green-200",
  cancelled: "bg-red-50 text-red-500 border-red-200",
}

export function CampaignForm({ open, onOpenChange, onSaved, initialData, orgId, onSend, onDelete }: CampaignFormProps) {
  const isEdit = !!initialData?.id
  const isSent = initialData?.status === "sent"
  const [form, setForm] = useState<CampaignFormData>({
    name: "", description: "", type: "email", status: "draft",
    subject: "", templateId: "", segmentId: "", scheduledAt: "",
    totalRecipients: "", budget: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const [segments, setSegments] = useState<Segment[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [contactSearch, setContactSearch] = useState("")
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all")
  const [recipientModeChanged, setRecipientModeChanged] = useState(false)
  const [selectedSource, setSelectedSource] = useState("")
  const [selectedSegmentId, setSelectedSegmentId] = useState("")

  // Load templates, segments and contacts
  useEffect(() => {
    if (open && orgId) {
      setTemplatesLoaded(false)
      fetch("/api/v1/email-templates?limit=500", {
        headers: { "x-organization-id": String(orgId) },
      }).then(r => r.json()).then(j => {
        if (j.success) setTemplates(j.data?.templates || j.data || [])
      }).catch(() => {}).finally(() => setTemplatesLoaded(true))

      fetch("/api/v1/segments?limit=500", {
        headers: { "x-organization-id": String(orgId) },
      }).then(r => r.json()).then(j => {
        if (j.success) setSegments(j.data?.segments || j.data || [])
      }).catch(() => {})

      fetch("/api/v1/contacts?limit=1000", {
        headers: { "x-organization-id": String(orgId) },
      }).then(r => r.json()).then(j => {
        if (j.success) setContacts((j.data?.contacts || j.data || []).filter((c: Contact) => c.email))
      }).catch(() => {})
    }
  }, [open, orgId])

  useEffect(() => {
    if (open) {
      const sa = initialData?.scheduledAt ? new Date(initialData.scheduledAt).toISOString().slice(0, 16) : ""
      setForm({
        name: initialData?.name || "",
        description: initialData?.description || "",
        type: initialData?.type || "email",
        status: initialData?.status || "draft",
        subject: initialData?.subject || "",
        templateId: initialData?.templateId || "",
        segmentId: initialData?.segmentId || "",
        scheduledAt: sa,
        totalRecipients: String(initialData?.totalRecipients ?? ""),
        budget: String(initialData?.budget ?? ""),
      })
      setError("")
      setContactSearch("")
      setRecipientModeChanged(false)
      // Restore recipient mode from saved campaign
      const savedMode = (initialData?.recipientMode as RecipientMode) || (initialData?.segmentId ? "segment" : "all")
      setRecipientMode(savedMode)
      setSelectedSegmentId(initialData?.segmentId || "")
      setSelectedSource(initialData?.recipientSource || "")
      setSelectedContacts(
        savedMode === "manual" && Array.isArray(initialData?.recipientIds)
          ? new Set(initialData!.recipientIds as string[])
          : new Set()
      )
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError("Введите название кампании"); return }
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/campaigns/${initialData!.id}` : "/api/v1/campaigns"
      const finalRecipients = (isEdit && !recipientModeChanged)
        ? (Number(form.totalRecipients) || recipientCount)
        : recipientCount
      const payload = {
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        status: form.status,
        subject: form.subject || undefined,
        templateId: form.templateId || undefined,
        segmentId: recipientMode === "segment" ? selectedSegmentId || undefined : undefined,
        recipientMode,
        recipientIds: recipientMode === "manual" ? Array.from(selectedContacts) : [],
        recipientSource: recipientMode === "source" ? selectedSource || undefined : undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        totalRecipients: finalRecipients,
        budget: form.budget ? Number(form.budget) : undefined,
      }
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Ошибка сохранения")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof CampaignFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const sourceFilteredContacts = useMemo(() => {
    if (recipientMode === "source" && selectedSource) return contacts.filter(c => c.source === selectedSource)
    return contacts
  }, [contacts, recipientMode, selectedSource])

  const searchFilteredContacts = useMemo(() => {
    const base = recipientMode === "manual" ? contacts : sourceFilteredContacts
    if (!contactSearch) return base
    const q = contactSearch.toLowerCase()
    return base.filter(c => c.fullName.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q))
  }, [contacts, sourceFilteredContacts, contactSearch, recipientMode])

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAll = () => setSelectedContacts(new Set(searchFilteredContacts.map(c => c.id)))
  const selectNone = () => setSelectedContacts(new Set())

  const recipientCount = useMemo(() => {
    if (isEdit && !recipientModeChanged && Number(form.totalRecipients) > 0) return Number(form.totalRecipients)
    switch (recipientMode) {
      case "all": return contacts.length
      case "segment": return segments.find(s => s.id === selectedSegmentId)?.contactCount || 0
      case "source": return sourceFilteredContacts.length
      case "manual": return selectedContacts.size
      default: return 0
    }
  }, [recipientMode, contacts, segments, selectedSegmentId, sourceFilteredContacts, selectedContacts, isEdit, recipientModeChanged, form.totalRecipients])

  const availableSources = useMemo(() => {
    const sources = new Set(contacts.map(c => c.source).filter(Boolean))
    return sourceOptions.filter(o => sources.has(o.value))
  }, [contacts])

  // Template name for sent view
  const templateName = useMemo(() => {
    if (!form.templateId) return null
    return templates.find(t => t.id === form.templateId)?.name || null
  }, [form.templateId, templates])

  // ── Sent campaign: read-only summary ──
  if (isSent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{form.name || "Кампания"}</DialogTitle>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", statusColors[form.status])}>
                {statusLabels[form.status] || form.status}
              </span>
              <button type="button" onClick={() => onOpenChange(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </DialogHeader>
        <DialogContent>
          {form.description && (
            <p className="text-sm text-muted-foreground mb-4">{form.description}</p>
          )}
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{initialData?.totalSent ?? Number(form.totalRecipients)}</div>
              <div className="text-xs text-muted-foreground">Отправлено</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{initialData?.totalOpened ?? 0}</div>
              <div className="text-xs text-muted-foreground">Открыто</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{initialData?.totalClicked ?? 0}</div>
              <div className="text-xs text-muted-foreground">Кликов</div>
            </div>
          </div>
          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 py-1.5 border-b">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">Тип</span>
              <span className="font-medium">{form.type === "sms" ? "SMS" : "Email"}</span>
            </div>
            {form.subject && (
              <div className="flex items-center gap-2 py-1.5 border-b">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Тема</span>
                <span className="font-medium">{form.subject}</span>
              </div>
            )}
            {templateName && (
              <div className="flex items-center gap-2 py-1.5 border-b">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Шаблон</span>
                <span className="font-medium">{templateName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 py-1.5 border-b">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">Получатели</span>
              <span className="font-medium">{Number(form.totalRecipients) || 0}</span>
            </div>
            {Number(form.budget) > 0 && (
              <div className="flex items-center gap-2 py-1.5 border-b">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Бюджет</span>
                <span className="font-medium">{Number(form.budget).toLocaleString()}</span>
              </div>
            )}
            {initialData?.sentAt && (
              <div className="flex items-center gap-2 py-1.5">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Отправлена</span>
                <span className="font-medium">{new Date(initialData.sentAt).toLocaleString("ru-RU")}</span>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
        </DialogFooter>
      </Dialog>
    )
  }

  // ── Draft/Scheduled: editable form ──
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>{isEdit ? "Редактировать кампанию" : "Новая кампания"}</DialogTitle>
          <div className="flex items-center gap-2">
            {isEdit && (
              <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", statusColors[form.status])}>
                {statusLabels[form.status] || form.status}
              </span>
            )}
            <button type="button" onClick={() => onOpenChange(false)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="space-y-4">
            {/* Name + Type on same row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3">
                <Label className="text-xs text-muted-foreground">Название *</Label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="напр. Мартовская рассылка" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Тип</Label>
                <Select value={form.type} onChange={(e) => update("type", e.target.value)}>
                  <option value="email">📧 Email</option>
                  <option value="sms">📱 SMS</option>
                </Select>
              </div>
            </div>

            {/* Subject + Template on same row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Тема письма</Label>
                <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Тема email рассылки" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Шаблон</Label>
                <Select
                  value={form.templateId}
                  onChange={(e) => update("templateId", e.target.value)}
                >
                  <option value="">{templatesLoaded ? "— Не выбран —" : "Загрузка..."}</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Budget + Schedule on same row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Бюджет</Label>
                <Input type="number" step="0.01" value={form.budget} onChange={(e) => update("budget", e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Запланировать</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => update("scheduledAt", e.target.value)} />
              </div>
            </div>

            {/* Description — collapsible single line */}
            <div>
              <Label className="text-xs text-muted-foreground">Описание</Label>
              <Input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Цель и контекст кампании (необязательно)" />
            </div>

            {/* ── Recipient selector ── */}
            <div className="rounded-lg border border-primary/20 bg-primary/5">
              <div className="px-3 py-2.5 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Получатели</span>
                </div>
                <span className={cn(
                  "text-sm font-bold px-2.5 py-0.5 rounded-full",
                  recipientCount > 0
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-500"
                )}>
                  {recipientCount}
                </span>
              </div>
              <div className="p-3 space-y-2.5">
                {/* Mode tabs */}
                <div className="flex gap-1.5">
                  {([
                    { mode: "all" as const, icon: Users, label: "Все" },
                    { mode: "segment" as const, icon: Filter, label: "Сегмент" },
                    { mode: "source" as const, icon: UserCheck, label: "Источник" },
                    { mode: "manual" as const, icon: Search, label: "Вручную" },
                  ] as const).map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setRecipientMode(mode)
                        setSelectedContacts(new Set())
                        if (mode === "source") setSelectedSource("")
                        setRecipientModeChanged(true)
                      }}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-md border transition-colors flex items-center gap-1 flex-1 justify-center",
                        recipientMode === mode
                          ? "bg-primary text-primary-foreground border-primary font-medium"
                          : "bg-background hover:bg-muted border-border text-muted-foreground"
                      )}
                    >
                      <Icon className="h-3 w-3" /> {label}
                    </button>
                  ))}
                </div>

                {/* Segment picker */}
                {recipientMode === "segment" && (
                  <Select value={selectedSegmentId} onChange={e => setSelectedSegmentId(e.target.value)}>
                    <option value="">— Выберите сегмент —</option>
                    {segments.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.contactCount})</option>
                    ))}
                  </Select>
                )}

                {/* Source picker */}
                {recipientMode === "source" && (
                  <Select value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
                    <option value="">— Выберите источник —</option>
                    {(availableSources.length > 0 ? availableSources : sourceOptions).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                )}

                {/* All info */}
                {recipientMode === "all" && contacts.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Всем {contacts.length} контактам с email
                  </p>
                )}

                {/* Manual selector */}
                {recipientMode === "manual" && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Поиск..." value={contactSearch}
                          onChange={e => setContactSearch(e.target.value)} className="pl-7 h-8 text-sm" />
                      </div>
                      <Button type="button" size="sm" variant="default" className="h-8 text-xs px-2" onClick={selectAll}>Все</Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs px-2" onClick={selectNone}>Сбросить</Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto border rounded bg-background">
                      {searchFilteredContacts.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">Нет контактов</div>
                      ) : searchFilteredContacts.map(c => (
                        <label key={c.id} className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-muted/50 text-sm border-b last:border-b-0",
                          selectedContacts.has(c.id) && "bg-primary/5"
                        )}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedContacts.has(c.id)}
                              onChange={() => toggleContact(c.id)} className="rounded" />
                            <span className="truncate">{c.fullName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground ml-2 truncate">{c.email}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <div className="flex items-center w-full gap-2">
            {isEdit && onDelete && (
              <Button type="button" variant="ghost" size="sm" onClick={onDelete}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 mr-auto">
                <Trash2 className="h-3.5 w-3.5" /> Удалить
              </Button>
            )}
            {!isEdit && !onDelete && <div className="mr-auto" />}
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={saving} size="sm" className="min-w-[100px]">
              {saving ? "..." : isEdit ? "Сохранить" : "Создать"}
            </Button>
            {isEdit && onSend && (
              <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={onSend}>
                <Send className="h-3.5 w-3.5" /> Отправить
              </Button>
            )}
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
